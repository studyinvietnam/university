// controllers/prompt.controller.js
const mongoose = require('mongoose');
const GradingPrompt = require('../models/GradingPrompt');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');

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
                .populate('lessonId', 'title')
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
            scope, subjectId, lessonId,
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

        const prompt = await GradingPrompt.create({
            name: name.trim(),
            description: (description || '').trim(),
            content: content.trim(),
            rubric,
            strictness: strictness || 'normal',
            maxScore: Number(maxScore) || 10,
            scope: scope || 'global',
            subjectId: scope === 'subject' && subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null,
            lessonId: scope === 'lesson' && lessonId && mongoose.Types.ObjectId.isValid(lessonId) ? lessonId : null,
            isDefault: setDefault,
            active: active !== 'off',
            variables: ['{đề_bài}', '{bài_làm}', '{rubric}', '{max_score}', '{student_name}', '{lời_giải_mẫu}'],
            version: 1,
            createdBy: getUserId(req),
            updatedBy: getUserId(req)
        });

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
            scope, subjectId, lessonId,
            isDefault, active
        } = req.body;

        const rubric = parseRubric(req.body);
        const check = validateRubric(rubric);
        if (!check.ok) {
            return res.redirect(`/admin/prompts/${id}/edit?error=` + encodeURIComponent(check.error));
        }

        const contentChanged = content && content.trim() !== prompt.content;

        if (name) prompt.name = name.trim();
        if (typeof description === 'string') prompt.description = description.trim();
        if (content) prompt.content = content.trim();
        prompt.rubric = rubric;
        prompt.strictness = strictness || prompt.strictness;
        prompt.maxScore = Number(maxScore) || prompt.maxScore;
        prompt.scope = scope || prompt.scope;
        prompt.subjectId = scope === 'subject' && subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null;
        prompt.lessonId = scope === 'lesson' && lessonId && mongoose.Types.ObjectId.isValid(lessonId) ? lessonId : null;

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

        await prompt.save();

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

        return res.redirect('/admin/prompts?success=' + encodeURIComponent('Đã xoá vĩnh viễn prompt.'));
    } catch (err) {
        console.error('hardDeletePrompt error:', err);
        return res.redirect('/admin/prompts?error=' + encodeURIComponent('Không thể xoá vĩnh viễn.'));
    }
};

module.exports = exports;