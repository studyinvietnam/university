// controllers/prompt.controller.js
const mongoose = require('mongoose');
const GradingPrompt = require('../models/GradingPrompt');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');
const syncQueueService = require('../services/syncQueueService');

// ============================================================
// HELPERS
// ============================================================
function getUserId(req) {
    return req.session?.user?._id || req.user?._id || null;
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

// Đồng bộ Lesson.promptId theo danh sách lessonIds mới của 1 prompt.
// - Bài mới được tick (added) → gán Lesson.promptId = prompt này.
// - Bài bị bỏ tick (removed) → CHỈ gỡ nếu Lesson đó đang trỏ đúng prompt này
//   (tránh đè lên trường hợp bài đã được gán prompt khác sau đó).
async function syncLessonAssignments(promptId, oldLessonIds, newLessonIds) {
    const oldSet = new Set(oldLessonIds.map(String));
    const newSet = new Set(newLessonIds.map(String));

    const added = newLessonIds.filter((id) => !oldSet.has(String(id)));
    const removed = oldLessonIds.filter((id) => !newSet.has(String(id)));

    if (added.length) {
        await Lesson.updateMany(
            { _id: { $in: added } },
            { $set: { promptId } }
        );
    }
    if (removed.length) {
        await Lesson.updateMany(
            { _id: { $in: removed }, promptId },
            { $set: { promptId: null } }
        );
    }
}

function parseRubric(body) {
    // Hỗ trợ cả 2 dạng: rubricJson (text) hoặc 3 mảng song song
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

// ============================================================
// ★ NEW: đẩy nội dung prompt (content/rubric/variables/version...) lên
// GitHub — MongoDB chỉ giữ bản cache/fallback, GitHub mới là "nguồn thật"
// mà promptService.resolvePrompt() sẽ đọc khi chấm bài (giống hệt cách
// lesson_controller.js đang làm với đề bài).
// ============================================================
function pushPromptToGithub(prompt) {
    if (!prompt.githubFile) return;

    try {
        syncQueueService.enqueue({
            type: 'putJson',
            filePath: prompt.githubFile,
            commitMessage: `[Prompt] ${prompt.isNew ? 'Create' : 'Update'}: ${prompt.name}`,
            data: {
                promptId: String(prompt._id),
                name: prompt.name,
                description: prompt.description || '',
                content: prompt.content,
                rubric: prompt.rubric || [],
                strictness: prompt.strictness,
                maxScore: prompt.maxScore,
                scope: prompt.scope,
                variables: prompt.variables || [],
                version: prompt.version,
                active: prompt.active,
                updatedAt: new Date()
            },
            onSuccess: async (result) => {
                console.log(`📤 [prompt] Đã đẩy lên GitHub: ${result.url}`);
            }
        });
    } catch (e) {
        console.warn('[prompt] Enqueue fail:', e.message);
    }
}

// ============================================================
// LIST — GET /admin/prompts
// ============================================================
exports.getPrompts = async (req, res, next) => {
    try {
        const { scope, active, search } = req.query;

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
            Subject.find({ deletedAt: null, deletedForever: { $ne: true } })
                .sort({ name: 1 })
                .lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true } })
                .populate('subjectId', 'name')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        return res.render('admin/prompts', {
            title: 'Quản lý Prompt chấm điểm',
            user: req.user,
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

        // Nếu đặt làm default → bỏ default ở các prompt khác (chỉ 1 default global)
        const setDefault = isDefault === 'on' || isDefault === true;
        if (setDefault) {
            await GradingPrompt.updateMany(
                { isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        const lessonIds = scope === 'lesson' ? normalizeIds(req.body.lessonIds) : [];

        const prompt = await GradingPrompt.create({
            name: name.trim(),
            description: (description || '').trim(),
            content: content.trim(),
            rubric,
            strictness: strictness || 'normal',
            maxScore: Number(maxScore) || 10,
            scope: scope || 'global',
            subjectId: scope === 'subject' && subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
            lessonIds,
            isDefault: setDefault,
            active: active !== 'off',
            variables: ['{đề_bài}', '{bài_làm}', '{rubric}', '{max_score}', '{student_name}', '{lời_giải_mẫu}'],
            version: 1,
            createdBy: getUserId(req),
            updatedBy: getUserId(req)
        });

        // Gán prompt vừa tạo cho các bài được chọn (bài mới nên chỉ có "added", không có "removed")
        if (lessonIds.length) {
            await syncLessonAssignments(prompt._id, [], lessonIds);
        }

        // ★ NEW: gán đường dẫn GitHub theo _id (ổn định, không đổi dù sửa tên sau này)
        //   rồi đẩy nội dung lên GitHub.
        prompt.githubFile = `prompts/${prompt._id}.json`;
        prompt.isNew = true; // chỉ dùng cho commit message, không lưu vào DB
        await GradingPrompt.updateOne({ _id: prompt._id }, { $set: { githubFile: prompt.githubFile } });
        pushPromptToGithub(prompt);

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

        const [prompt, subjects, lessons] = await Promise.all([
            GradingPrompt.findById(id).lean(),
            Subject.find({ deletedAt: null, deletedForever: { $ne: true } })
                .sort({ name: 1 })
                .lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true } })
                .populate('subjectId', 'name')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        if (!prompt) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không tìm thấy prompt.'));
        }

        return res.render('admin/prompt-form', {
            title: 'Sửa Prompt',
            user: req.user,
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
// CREATE FORM — GET /admin/prompts/create
// ============================================================
exports.showCreatePrompt = async (req, res, next) => {
    try {
        const [subjects, lessons] = await Promise.all([
            Subject.find({ deletedAt: null, deletedForever: { $ne: true } })
                .sort({ name: 1 })
                .lean(),
            Lesson.find({ deletedAt: null, deletedForever: { $ne: true } })
                .populate('subjectId', 'name')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        return res.render('admin/prompt-form', {
            title: 'Thêm Prompt',
            user: req.user,
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

        const contentChanged = content && content.trim() !== prompt.content;

        // Danh sách bài cũ (trước khi sửa) để tính added/removed sau khi lưu
        const oldLessonIds = (prompt.lessonIds || []).map((v) => String(v));
        const newLessonIds = scope === 'lesson' ? normalizeIds(req.body.lessonIds) : [];

        if (name) prompt.name = name.trim();
        if (typeof description === 'string') prompt.description = description.trim();
        if (content) prompt.content = content.trim();
        prompt.rubric = rubric;
        prompt.strictness = strictness || prompt.strictness;
        prompt.maxScore = Number(maxScore) || prompt.maxScore;
        prompt.scope = scope || prompt.scope;
        prompt.subjectId = scope === 'subject' && subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null;
        prompt.lessonIds = newLessonIds;

        const setDefault = isDefault === 'on' || isDefault === true;
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

        // ★ FALLBACK: prompt cũ tạo trước khi có tính năng này sẽ chưa có
        //   githubFile — tự gán khi sửa lần đầu (giống cách lesson_controller
        //   fallback githubFile cho bài học cũ).
        if (!prompt.githubFile) {
            prompt.githubFile = `prompts/${prompt._id}.json`;
        }

        await prompt.save();

        // Đồng bộ Lesson.promptId: thêm cho bài mới tick, gỡ cho bài bị bỏ tick
        // (chỉ gỡ nếu Lesson đó vẫn đang trỏ đúng prompt này).
        await syncLessonAssignments(prompt._id, oldLessonIds, newLessonIds);

        // ★ NEW: đẩy lại nội dung mới nhất lên GitHub sau mỗi lần sửa.
        pushPromptToGithub(prompt);

        return res.redirect(`/admin/prompts/${id}/edit?success=` + encodeURIComponent('Đã cập nhật prompt.'));
    } catch (err) {
        console.error('updatePrompt error:', err);
        return res.redirect(`/admin/prompts/${req.params.id}/edit?error=` + encodeURIComponent('Không thể cập nhật: ' + err.message));
    }
};

// ============================================================
// SET DEFAULT — POST /admin/prompts/:id/set-default
// ============================================================
exports.setDefault = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('ID không hợp lệ.'));
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
// DELETE (soft) — POST /admin/prompts/:id/delete
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
// HARD DELETE — POST /admin/prompts/:id/hard-delete
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

        if (prompt.isDefault) {
            return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá prompt mặc định.'));
        }

        await GradingPrompt.deleteOne({ _id: id });

        // ★ NEW: dọn luôn file JSON tương ứng trên GitHub
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