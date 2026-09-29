// controllers/prompt.controller.js
const mongoose = require('mongoose');
const GradingPrompt = require('../models/GradingPrompt');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');
const syncQueueService = require('../services/syncQueueService');

// ★ PHÂN QUYỀN THEO userKey
const { isDefaultAdmin } = require('../middleware/auth');
const { canManageOwned, ownContentFilter } = require('../middleware/role');

// ★ CHANGED: cần 1 service để ĐỌC JSON từ GitHub khi render form edit.
//   Nếu bạn có sẵn hàm khác (vd: syncQueueService.fetchJson,
//   githubService.getFileContent, ...) thì đổi lại require + tên hàm
//   trong readPromptJsonFromGithub() cho khớp.
const githubService = require('../services/githubService');

// ============================================================
// HELPERS
// ============================================================
function getUserId(req) {
    // req.user do attachUser đọc lại từ DB → không tin session (có thể cũ)
    return req.user?._id || null;
}

const NOT_OWNER_MSG = 'Bạn chỉ được sửa/xoá prompt do chính mình tạo.';

// ★ Admin user_key chỉ được gán prompt cho MÔN do chính mình tạo.
//   Trả về subjectId hợp lệ (hoặc null). Ném lỗi nếu vi phạm.
async function resolveSubjectId(actor, scope, subjectId) {
    if (scope !== 'subject' || !subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
        return null;
    }
    if (isDefaultAdmin(actor)) return subjectId;

    const owned = await Subject.exists({ _id: subjectId, ...ownContentFilter(actor, Subject) });
    if (!owned) throw new Error('Bạn chỉ được gán prompt cho môn học do chính mình tạo.');
    return subjectId;
}

// ★ Admin user_key chỉ được gán prompt cho BÀI do chính mình tạo.
async function resolveLessonIds(actor, scope, raw) {
    if (scope !== 'lesson') return [];
    const ids = [...new Set(normalizeIds(raw).map(String))];
    if (!ids.length || isDefaultAdmin(actor)) return ids;

    const owned = await Lesson.find({ _id: { $in: ids }, ...ownContentFilter(actor, Lesson) })
        .select('_id')
        .lean();
    if (owned.length !== ids.length) {
        throw new Error('Bạn chỉ được gán prompt cho bài học do chính mình tạo.');
    }
    return owned.map((l) => l._id);
}

function validateRubric(rubric) {
    if (!Array.isArray(rubric) || rubric.length === 0) {
        return { ok: false, error: 'Rubric phải có ít nhất 1 tiêu chí.' };
    }
    const sum = rubric.reduce((acc, r) => acc + Number(r.weight || 0), 0);
    if (Math.round(sum) !== 100) {
        return { ok: false, error: `Tổng weight phải = 100% (hiện tại: ${sum}%).` };
    }
    return { ok: true };
}

function normalizeIds(value) {
    const arr = Array.isArray(value) ? value : (value ? [value] : []);
    return arr.filter((id) => id && mongoose.Types.ObjectId.isValid(id));
}

async function syncLessonAssignments(promptId, oldLessonIds, newLessonIds) {
    const oldSet = new Set(oldLessonIds.map(String));
    const newSet = new Set(newLessonIds.map(String));

    const added = newLessonIds.filter((id) => !oldSet.has(String(id)));
    const removed = oldLessonIds.filter((id) => !newSet.has(String(id)));

    if (added.length) {
        await Lesson.updateMany({ _id: { $in: added } }, { $set: { promptId } });
    }
    if (removed.length) {
        await Lesson.updateMany(
            { _id: { $in: removed }, promptId },
            { $set: { promptId: null } }
        );
    }
}

function parseRubric(body) {
    if (body.rubricJson) {
        try {
            const parsed = JSON.parse(body.rubricJson);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    const criteria = [].concat(body.criterion || []);
    const weights = [].concat(body.weight || []);
    const descriptions = [].concat(body.rubricDescription || []);

    return criteria
        .map((c, i) => ({
            criterion: (c || '').trim(),
            weight: Number(weights[i]) || 0,
            description: (descriptions[i] || '').trim()
        }))
        .filter((r) => r.criterion);
}

// ★ CHANGED: danh sách biến mặc định (trước đây hardcode trong createPrompt,
//   giờ tách riêng để cả create + update dùng chung, và vì `variables`
//   không còn lưu Mongo nữa).
const DEFAULT_VARIABLES = [
    '{đề_bài}', '{bài_làm}', '{rubric}', '{max_score}',
    '{student_name}', '{lời_giải_mẫu}'
];

// ============================================================
// GITHUB I/O — nguồn thật duy nhất của content / rubric / variables
// ============================================================

// Đọc file JSON prompt từ GitHub — dùng đúng tên hàm thật trong
// services/githubService.js (readJsonFile), không phải fetchJson.
async function readPromptJsonFromGithub(prompt) {
    if (!prompt || !prompt.githubFile) return null;
    try {
        return await githubService.readJsonFile(prompt.githubFile);
    } catch (e) {
        console.warn(`[prompt] Không đọc được ${prompt.githubFile}:`, e.message);
        return null;
    }
}

// ★ CHANGED: nội dung được truyền vào dưới dạng tham số (content/rubric/
//   variables) thay vì đọc từ prompt.* — vì các field đó KHÔNG còn trong
//   schema GradingPrompt nữa.
//
// ★ FIX: trước đây hàm này fire-and-forget (không await được) — updatePrompt()
//   redirect "thành công" ngay lập tức dù GitHub có thể chưa ghi xong (hoặc
//   ghi thất bại hẳn sau khi hết retry). Giờ trả về 1 Promise, resolve khi
//   syncQueueService thực sự ghi GitHub xong (onSuccess) và reject khi ghi
//   thất bại vĩnh viễn sau retry (onFinalFail) — cả hai hook này vốn đã được
//   syncQueueService hỗ trợ sẵn, chỉ cần nối dây vào Promise.
//   Lưu ý: syncQueueService retry tối đa 5 lần, có thể mất tới ~30s nếu GitHub
//   lỗi liên tục trước khi request trả lỗi — đây là đánh đổi có chủ đích để
//   admin biết chắc chắn kết quả thay vì thấy "thành công" giả.
function pushPromptToGithub(prompt, content, rubric, variables) {
    return new Promise((resolve, reject) => {
        if (!prompt.githubFile) {
            resolve(null);
            return;
        }

        try {
            syncQueueService.enqueue({
                type: 'putJson',
                filePath: prompt.githubFile,
                commitMessage: `[Prompt] ${prompt.isNew ? 'Create' : 'Update'}: ${prompt.name}`,
                data: {
                    promptId: String(prompt._id),
                    name: prompt.name,
                    description: prompt.description || '',
                    content: content || '',
                    rubric: rubric || [],
                    strictness: prompt.strictness,
                    maxScore: prompt.maxScore,
                    scope: prompt.scope,
                    variables: variables || [],
                    version: prompt.version,
                    active: prompt.active,
                    updatedAt: new Date()
                },
                onSuccess: async (result) => {
                    console.log(`📤 [prompt] Đã đẩy lên GitHub: ${result.url}`);
                    resolve(result);
                },
                onFinalFail: async (err) => {
                    console.error(`❌ [prompt] Đẩy GitHub thất bại vĩnh viễn: ${err.message}`);
                    reject(err);
                }
            });
        } catch (e) {
            console.warn('[prompt] Enqueue fail:', e.message);
            reject(e);
        }
    });
}

// ============================================================
// LIST — GET /admin/prompts   (KHÔNG ĐỔI)
// ============================================================
exports.getPrompts = async (req, res, next) => {
    try {
        const { scope, active, search } = req.query;
        const actor = req.user;

        const filter = {};
        if (scope) filter.scope = scope;
        if (active === '1') filter.active = true;
        if (active === '0') filter.active = false;
        if (search && search.trim()) {
            filter.name = { $regex: search.trim(), $options: 'i' };
        }

        const [prompts, subjects, lessons] = await Promise.all([
            GradingPrompt.find(filter)
                .populate('subjectId', 'name code')
                .populate('lessonIds', 'title')
                .populate('createdBy', 'name email')
                .sort({ isDefault: -1, createdAt: -1 })
                .lean(),
            Subject.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Subject) })
                .sort({ name: 1 }).lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Lesson) })
                .populate('subjectId', 'name')
                .sort({ createdAt: -1 }).lean()
        ]);

        // ★ Mọi admin đều XEM được danh sách; chỉ chủ prompt (hoặc admin default) mới sửa/xoá.
        prompts.forEach((p) => {
            p.canManage = canManageOwned(actor, p.createdBy);
        });

        return res.render('admin/prompts', {
            title: 'Quản lý Prompt chấm điểm',
            user: req.user,
            isDefaultAdmin: isDefaultAdmin(actor),
            prompts,
            subjects,
            lessons,
            filters: {
                scope: scope || '',
                active: active || '',
                search: search || ''
            },
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error('getPrompts error:', err);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải danh sách prompt.',
            statusCode: 500,
            stack: null
        });
    }
};

// ============================================================
// CREATE — POST /admin/prompts
// ============================================================
exports.createPrompt = async (req, res, next) => {
    try {
        const {
            name, description, content,
            strictness, maxScore,
            scope, subjectId,
            isDefault, active
        } = req.body;

        if (!name || !name.trim()) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Tên prompt không được để trống.'));
        }
        if (!content || !content.trim()) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Nội dung prompt không được để trống.'));
        }

        const rubric = parseRubric(req.body);
        const check = validateRubric(rubric);
        if (!check.ok) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent(check.error));
        }

        const actor = req.user;

        // ★ Kiểm tra quyền gán môn/bài TRƯỚC mọi thao tác ghi (ném lỗi nếu vi phạm)
        const lessonIds = await resolveLessonIds(actor, scope, req.body.lessonIds);
        const safeSubjectId = await resolveSubjectId(actor, scope, subjectId);

        // ★ Chỉ admin default được đặt prompt mặc định toàn hệ thống
        const setDefault = isDefaultAdmin(actor) && (isDefault === 'on' || isDefault === true);
        if (setDefault) {
            await GradingPrompt.updateMany({ isDefault: true }, { $set: { isDefault: false } });
        }

        // ★ CHANGED: KHÔNG truyền content / rubric / variables vào Mongo nữa.
        //   Chỉ lưu metadata.
        const prompt = await GradingPrompt.create({
            name: name.trim(),
            description: (description || '').trim(),
            strictness: strictness || 'normal',
            maxScore: Number(maxScore) || 10,
            scope: scope || 'global',
            subjectId: safeSubjectId,
            lessonIds,
            isDefault: setDefault,
            active: active !== 'off',
            version: 1,
            createdBy: getUserId(req),
            updatedBy: getUserId(req)
        });

        if (lessonIds.length) {
            await syncLessonAssignments(prompt._id, [], lessonIds);
        }

        // Gán githubFile theo _id (ổn định) rồi đẩy nội dung lên GitHub
        prompt.githubFile = `prompts/${prompt._id}.json`;
        prompt.isNew = true; // chỉ dùng cho commit message
        await GradingPrompt.updateOne({ _id: prompt._id }, { $set: { githubFile: prompt.githubFile } });

        // ★ CHANGED: truyền content/rubric/variables trực tiếp vào hàm push.
        // ★ pushPromptToGithub trả Promise sẽ reject khi hết retry → phải .catch,
        //   nếu không Node ≥15 báo unhandledRejection và có thể làm sập server.
        pushPromptToGithub(prompt, content.trim(), rubric, DEFAULT_VARIABLES)
            .catch((e) => console.error('[prompt] createPrompt: đẩy GitHub thất bại (prompt đã có trong Mongo):', e.message));

        return res.redirect('/admin/prompts?success=' + encodeURIComponent(`Đã tạo prompt "${prompt.name}".`));
    } catch (err) {
        console.error('createPrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể tạo: ' + err.message));
    }
};

// ============================================================
// EDIT FORM — GET /admin/prompts/:id/edit
// ============================================================
exports.showEditPrompt = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
        }

        const actor = req.user;
        const [prompt, subjects, lessons] = await Promise.all([
            GradingPrompt.findById(id).lean(),
            Subject.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Subject) })
                .sort({ name: 1 }).lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Lesson) })
                .populate('subjectId', 'name').sort({ createdAt: -1 }).lean()
        ]);

        if (!prompt) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }

        // ★ Chỉ chủ prompt (createdBy) hoặc admin default mới mở được form sửa.
        //   Kiểm tra TRƯỚC khi đọc nội dung từ GitHub để không lộ content/rubric.
        if (!canManageOwned(actor, prompt.createdBy)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent(NOT_OWNER_MSG));
        }

        // ★ CHANGED: nội dung thật nằm trên GitHub — merge tạm vào object
        //   chỉ để render view, KHÔNG lưu lại vào Mongo.
        const remote = await readPromptJsonFromGithub(prompt);
        if (remote) {
            prompt.content   = remote.content   || '';
            prompt.rubric    = remote.rubric    || [];
            prompt.variables = remote.variables || [];
        } else {
            prompt.content   = '';
            prompt.rubric    = [];
            prompt.variables = [];
            if (prompt.githubFile) {
                console.warn(`[prompt] Form edit: không đọc được ${prompt.githubFile} từ GitHub.`);
            }
        }

        // ★ FIX: lấy đúng trạng thái THẬT — bài nào đang thực sự trỏ
        //   Lesson.promptId = prompt này — thay vì tin field prompt.lessonIds
        //   đã lưu (có thể lệch nếu lesson được gán qua dropdown ở trang sửa
        //   Lesson, vì đường đó ghi thẳng Lesson.promptId, không đụng tới
        //   prompt.lessonIds). Nhờ vậy checkbox ở đây luôn khớp với trang Lesson.
        const assignedLessons = await Lesson.find({ promptId: prompt._id, ...ownContentFilter(actor, Lesson) })
            .select('_id')
            .lean();
        prompt.lessonIds = assignedLessons.map((l) => l._id);

        return res.render('admin/prompt-form', {
            title: 'Sửa Prompt',
            user: req.user,
            canSetDefault: isDefaultAdmin(actor),
            prompt,
            subjects,
            lessons,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error('showEditPrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể tải prompt.'));
    }
};

// ============================================================
// CREATE FORM — GET /admin/prompts/create   (KHÔNG ĐỔI)
// ============================================================
exports.showCreatePrompt = async (req, res, next) => {
    try {
        const actor = req.user;
        const [subjects, lessons] = await Promise.all([
            Subject.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Subject) })
                .sort({ name: 1 }).lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true }, ...ownContentFilter(actor, Lesson) })
                .populate('subjectId', 'name').sort({ createdAt: -1 }).lean()
        ]);

        return res.render('admin/prompt-form', {
            title: 'Thêm Prompt',
            user: req.user,
            canSetDefault: isDefaultAdmin(actor),
            prompt: null,
            subjects,
            lessons,
            success: null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error('showCreatePrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể mở form.'));
    }
};

// ============================================================
// UPDATE — POST /admin/prompts/:id/edit
// ============================================================
exports.updatePrompt = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
        }

        const prompt = await GradingPrompt.findById(id);
        if (!prompt) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }

        // ★ Chỉ chủ prompt (createdBy) hoặc admin default mới được sửa
        const actor = req.user;
        if (!canManageOwned(actor, prompt.createdBy)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent(NOT_OWNER_MSG));
        }

        const {
            name, description, content,
            strictness, maxScore,
            scope, subjectId,
            isDefault, active
        } = req.body;

        const rubric = parseRubric(req.body);
        const check = validateRubric(rubric);
        if (!check.ok) {
            return res.redirect(`/admin/prompts/${id}/edit?error=` + encodeURIComponent(check.error));
        }

        // ★ CHANGED: so content mới với content CŨ trên GitHub (không phải
        //   prompt.content nữa, vì field này không còn tồn tại).
        const previous = await readPromptJsonFromGithub(prompt);
        const oldContent = previous?.content || '';
        const contentChanged = content && content.trim() !== oldContent;

        // ★ FIX: "bài cũ" phải lấy từ trạng thái THẬT trong Lesson
        //   (Lesson.find({promptId: prompt._id})), không lấy từ prompt.lessonIds
        //   đã lưu — vì lesson có thể được gán/gỡ trực tiếp qua dropdown ở
        //   trang sửa Lesson (không đi qua đây), khiến prompt.lessonIds lệch
        //   so với thực tế → checkbox tick sai + có thể gán/gỡ nhầm bài khi lưu.
        //   ★ Admin user_key chỉ "thấy" các bài của chính mình → không gỡ nhầm bài của người khác.
        const assignedLessonsNow = await Lesson.find({ promptId: prompt._id, ...ownContentFilter(actor, Lesson) })
            .select('_id')
            .lean();
        const oldLessonIds = assignedLessonsNow.map((l) => String(l._id));

        // ★ FIX: giữ lại scope CŨ (trước khi ghi đè bên dưới) để phân biệt
        //   "admin đang sửa prompt scope=lesson" với "admin chủ động đổi
        //   scope từ lesson sang cái khác" — hai trường hợp cần xử lý khác
        //   nhau, xem chi tiết ở khối sync bên dưới.
        const previousScope = prompt.scope;
        // ★ Kiểm tra quyền gán môn/bài (ném lỗi nếu admin user_key gán môn/bài không phải của mình)
        const newLessonIds = await resolveLessonIds(actor, scope, req.body.lessonIds);
        const safeSubjectId = await resolveSubjectId(actor, scope, subjectId);

        // ---- Chỉ cập nhật METADATA vào Mongo ----
        if (name) prompt.name = name.trim();
        if (typeof description === 'string') prompt.description = description.trim();
        // ★ ĐÃ BỎ: prompt.content = content.trim()
        // ★ ĐÃ BỎ: prompt.rubric = rubric
        prompt.strictness = strictness || prompt.strictness;
        prompt.maxScore = Number(maxScore) || prompt.maxScore;
        prompt.scope = scope || prompt.scope;
        prompt.subjectId = safeSubjectId;
        prompt.lessonIds = newLessonIds;

        // ★ Chỉ admin default được bật/tắt "mặc định"; admin user_key giữ nguyên giá trị hiện tại
        const setDefault = isDefaultAdmin(actor)
            ? (isDefault === 'on' || isDefault === true)
            : prompt.isDefault;
        if (setDefault && !prompt.isDefault) {
            await GradingPrompt.updateMany(
                { _id: { $ne: prompt._id }, isDefault: true },
                { $set: { isDefault: false } }
            );
        }
        prompt.isDefault = setDefault;
        prompt.active = active !== 'off';

        if (contentChanged) {
            prompt.version = (prompt.version || 1) + 1;
        }

        prompt.updatedBy = getUserId(req);

        if (!prompt.githubFile) {
            prompt.githubFile = `prompts/${prompt._id}.json`;
        }

        await prompt.save();

        // ★ FIX: trước đây luôn gọi syncLessonAssignments(..., newLessonIds)
        //   với newLessonIds ép về [] mỗi khi scope !== 'lesson' — khiến MỌI
        //   lần sửa 1 prompt scope subject/global (dù chỉ đổi tên, maxScore...)
        //   đều xoá sạch mọi Lesson.promptId đang trỏ về nó (có thể do gán
        //   trực tiếp từ trang sửa Lesson). Giờ chỉ đụng vào Lesson.promptId
        //   trong đúng 2 trường hợp có chủ đích:
        if (scope === 'lesson') {
            // 1) Đang sửa prompt scope=lesson → đồng bộ theo đúng checkbox
            //    admin vừa chọn trong form này.
            await syncLessonAssignments(prompt._id, oldLessonIds, newLessonIds);
        } else if (previousScope === 'lesson' && oldLessonIds.length) {
            // 2) Admin CHỦ ĐỘNG đổi scope từ 'lesson' sang scope khác → hợp lý
            //    để gỡ hết lesson cũ, vì prompt không còn ở dạng lesson-scope nữa.
            await syncLessonAssignments(prompt._id, oldLessonIds, []);
        }
        // else: scope không phải 'lesson' và trước đó cũng không phải 'lesson'
        //   (vd. đang sửa 1 prompt scope=global) → KHÔNG đụng gì tới
        //   Lesson.promptId, dù có lesson nào đang trỏ về đây qua đường khác.

        // ★ CHANGED: đẩy nội dung mới nhất lên GitHub — đây là NƠI DUY NHẤT
        //   lưu content/rubric/variables. variables giữ lại từ bản cũ trên
        //   GitHub (nếu có), fallback về default.
        const variables = previous?.variables?.length ? previous.variables : DEFAULT_VARIABLES;

        // ★ FIX: await thật sự việc ghi GitHub trước khi báo "thành công" —
        //   trước đây redirect chạy ngay dù GitHub có thể chưa ghi xong hoặc
        //   ghi lỗi, khiến admin tưởng đã lưu nhưng nội dung cũ vẫn còn.
        try {
            await pushPromptToGithub(prompt, (content || '').trim(), rubric, variables);
        } catch (githubErr) {
            return res.redirect(
                `/admin/prompts/${id}/edit?error=` +
                encodeURIComponent(
                    'Đã lưu vào hệ thống nhưng đồng bộ GitHub thất bại: ' +
                    githubErr.message +
                    '. Nội dung CŨ vẫn đang được dùng để chấm bài — vui lòng lưu lại.'
                )
            );
        }

        return res.redirect(`/admin/prompts/${id}/edit?success=` + encodeURIComponent('Đã cập nhật prompt và đồng bộ GitHub thành công.'));
    } catch (err) {
        console.error('updatePrompt error:', err);
        return res.redirect(`/admin/prompts/${req.params.id}/edit?error=` + encodeURIComponent('Không thể cập nhật: ' + err.message));
    }
};

// ============================================================
// SET DEFAULT — POST /admin/prompts/:id/set-default   (KHÔNG ĐỔI)
// ============================================================
exports.setDefault = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
        }

        // ★ Prompt mặc định ảnh hưởng MỌI tổ chức → chỉ admin default
        if (!isDefaultAdmin(req.user)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Chỉ quản trị viên hệ thống mới được đặt prompt mặc định.'));
        }

        // Kiểm tra tồn tại TRƯỚC khi gỡ default cũ (tránh id sai → mất luôn prompt mặc định)
        const target = await GradingPrompt.findById(id).select('_id').lean();
        if (!target) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }

        await GradingPrompt.updateMany({}, { $set: { isDefault: false } });
        await GradingPrompt.updateOne(
            { _id: id },
            { $set: { isDefault: true, updatedBy: getUserId(req) } }
        );

        return res.redirect('/admin/prompts?success=' + encodeURIComponent('Đã đặt làm prompt mặc định.'));
    } catch (err) {
        console.error('setDefault error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể đặt default.'));
    }
};

// ============================================================
// DELETE (soft) — POST /admin/prompts/:id/delete   (KHÔNG ĐỔI)
// ============================================================
exports.deletePrompt = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
        }

        const prompt = await GradingPrompt.findById(id);
        if (!prompt) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }
        if (!canManageOwned(req.user, prompt.createdBy)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent(NOT_OWNER_MSG));
        }
        if (prompt.isDefault) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá prompt mặc định. Hãy đặt prompt khác làm default trước.'));
        }

        prompt.active = false;
        prompt.updatedBy = getUserId(req);
        await prompt.save();

        return res.redirect('/admin/prompts?success=' + encodeURIComponent('Đã vô hiệu hoá prompt.'));
    } catch (err) {
        console.error('deletePrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá.'));
    }
};

// ============================================================
// HARD DELETE — POST /admin/prompts/:id/hard-delete   (KHÔNG ĐỔI)
// ============================================================
exports.hardDeletePrompt = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
        }

        const prompt = await GradingPrompt.findById(id);
        if (!prompt) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }
        if (!canManageOwned(req.user, prompt.createdBy)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent(NOT_OWNER_MSG));
        }
        if (prompt.isDefault) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá prompt mặc định.'));
        }

        await GradingPrompt.deleteOne({ _id: id });

        if (prompt.githubFile) {
            try {
                syncQueueService.enqueue({
                    type: 'deleteFile',
                    filePath: prompt.githubFile,
                    commitMessage: `[Prompt] Hard delete: ${prompt.name}`
                });
            } catch (e) {
                console.warn('[prompt] Enqueue deleteFile fail:', e.message);
            }
        }

        return res.redirect('/admin/prompts?success=' + encodeURIComponent('Đã xoá vĩnh viễn prompt.'));
    } catch (err) {
        console.error('hardDeletePrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá vĩnh viễn.'));
    }
};

module.exports = exports;