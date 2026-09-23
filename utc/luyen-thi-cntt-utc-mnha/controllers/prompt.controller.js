const GradingPrompt = require('../models/GradingPrompt');
const ModelComparison = require('../models/ModelComparison');
const { renderPromptTemplate } = require('../services/promptService');
const {
    runCustomPrompt,
    runCustomPromptAllModels,
    SUPPORTED_MODELS,
    DEFAULT_MODEL
} = require('../services/aiService');

const getPrompts = async (req, res) => {
    try {
        const prompts = await GradingPrompt.find({})
            .populate('subject', 'name code')
            .populate('lesson', 'name code')
            .sort({
                priority: -1,
                createdAt: -1
            })
            .lean();

        return res.render('admin/prompts', {
            title: 'Prompt chấm bài',
            prompts,
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL
        });
    } catch (error) {
        console.error('Get prompts error:', error);

        return res.status(500).render('admin/prompts', {
            title: 'Prompt chấm bài',
            prompts: [],
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL,
            error: 'Không thể tải danh sách prompt.'
        });
    }
};

const createPrompt = async (req, res) => {
    try {
        const {
            name,
            content,
            scope,
            subject,
            lesson,
            priority,
            isActive
        } = req.body;

        if (!name || !content) {
            return res.status(400).redirect('/admin/prompts');
        }

        await GradingPrompt.create({
            name: name.trim(),
            content,
            scope: scope || 'global',
            subject: subject || null,
            lesson: lesson || null,
            priority: Number(priority) || 0,
            isActive: isActive === 'true' || isActive === 'on',
            createdBy: req.session.user.id
        });

        return res.redirect('/admin/prompts');
    } catch (error) {
        console.error('Create prompt error:', error);

        return res.status(500).redirect('/admin/prompts');
    }
};

const updatePrompt = async (req, res) => {
    try {
        const prompt = await GradingPrompt.findById(
            req.params.id
        );

        if (!prompt) {
            return res.status(404).redirect('/admin/prompts');
        }

        const {
            name,
            content,
            scope,
            subject,
            lesson,
            priority,
            isActive
        } = req.body;

        prompt.name = name?.trim() || prompt.name;
        prompt.content = content || prompt.content;
        prompt.scope = scope || prompt.scope;
        prompt.subject = subject || null;
        prompt.lesson = lesson || null;
        prompt.priority = Number(priority) || 0;
        prompt.isActive =
            isActive === 'true' ||
            isActive === 'on';

        prompt.updatedBy = req.session.user.id;

        await prompt.save();

        return res.redirect('/admin/prompts');
    } catch (error) {
        console.error('Update prompt error:', error);

        return res.status(500).redirect('/admin/prompts');
    }
};

const deletePrompt = async (req, res) => {
    try {
        const prompt = await GradingPrompt.findById(
            req.params.id
        );

        if (!prompt) {
            return res.status(404).redirect('/admin/prompts');
        }

        await GradingPrompt.findByIdAndDelete(
            req.params.id
        );

        return res.redirect('/admin/prompts');
    } catch (error) {
        console.error('Delete prompt error:', error);

        return res.status(500).redirect('/admin/prompts');
    }
};

const getEffectivePrompt = async ({
    lessonId,
    subjectId
}) => {
    /*
     * Thứ tự ưu tiên:
     * 1. Lesson
     * 2. Subject
     * 3. Global
     */

    if (lessonId) {
        const lessonPrompt = await GradingPrompt.findOne({
            scope: 'lesson',
            lesson: lessonId,
            isActive: true
        }).sort({
            priority: -1
        });

        if (lessonPrompt) {
            return lessonPrompt;
        }
    }

    if (subjectId) {
        const subjectPrompt = await GradingPrompt.findOne({
            scope: 'subject',
            subject: subjectId,
            isActive: true
        }).sort({
            priority: -1
        });

        if (subjectPrompt) {
            return subjectPrompt;
        }
    }

    const globalPrompt = await GradingPrompt.findOne({
        scope: 'global',
        isActive: true
    }).sort({
        priority: -1
    });

    return globalPrompt;
};

// ============================================================
// TEST PROMPT — chọn 1 model hoặc chạy tất cả (models = 'all')
// POST /admin/prompts/:id/test
// body: { topic, essay, sampleSolution, maxScore, rubric, model, models }
// ============================================================

const testPrompt = async (req, res) => {
    try {
        const prompt = await GradingPrompt.findById(req.params.id).lean();

        if (!prompt) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy prompt.'
            });
        }

        const {
            topic,
            essay,
            sampleSolution,
            maxScore,
            rubric,
            model,
            models
        } = req.body;

        if (!essay || !String(essay).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Cần nhập bài làm mẫu để test.'
            });
        }

        const renderedPrompt = renderPromptTemplate(prompt.content, {
            topic,
            essay,
            sampleSolution,
            rubric: rubric || prompt.rubric,
            maxScore: maxScore || prompt.maxScore,
            strictness: prompt.strictness
        });

        const runAll = models === 'all' || models === true;

        if (runAll) {
            const results = await runCustomPromptAllModels(renderedPrompt);

            const comparison = await ModelComparison.create({
                promptId: prompt._id,
                promptSnapshot: renderedPrompt,
                results,
                createdBy: req.session?.user?.id || null
            });

            return res.json({
                success: true,
                mode: 'all',
                comparisonId: comparison._id,
                results
            });
        }

        const output = await runCustomPrompt(renderedPrompt, model);

        return res.json({
            success: true,
            mode: 'single',
            model: output.model,
            result: output
        });
    } catch (error) {
        console.error('Test prompt error:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Không thể test prompt.'
        });
    }
};

module.exports = {
    getPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getEffectivePrompt,
    testPrompt
};
