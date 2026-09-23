const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const User = require('../models/User');

const { resolvePrompt, buildPrompt, buildSnapshot } = require('./promptService');
const { wrapUserContent } = require('./sanitizeService');
const { gradeSubmission } = require('./aiService');
const githubService = require('./githubService');
const notificationService = require('./notificationService');
const { enqueueSync } = require('./syncQueueService');

/**
 * Chấm 1 bài nộp và lưu kết quả:
 *  1. Resolve prompt (lesson → subject → global → fallback)
 *  2. Render prompt với dữ liệu đã sanitize
 *  3. Gọi AI
 *  4. Lưu submission vào MongoDB
 *  5. Đẩy JSON lên GitHub qua queue (không block)
 *  6. Sinh notification
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.lessonId
 * @param {string} params.answerHtml
 * @param {string} [params.model]
 * @returns {Promise<object>} submission document
 */
async function gradeAndSave({ userId, lessonId, answerHtml, model }) {
    // 1. Load dữ liệu
    const [user, lesson] = await Promise.all([
        User.findById(userId).lean(),
        Lesson.findById(lessonId).lean()
    ]);

    if (!user) throw new Error('User không tồn tại.');
    if (!lesson) throw new Error('Lesson không tồn tại.');

    const subject = await Subject.findById(lesson.subjectId).lean();

    // 2. Resolve prompt
    const prompt = await resolvePrompt(lesson, subject);

    // 3. Render với dữ liệu đã sanitize
    const đề_bài = lesson.contentHtml || lesson.title || '';
    const bài_làm = wrapUserContent('BÀI_LÀM', answerHtml || '');
    const lời_giải_mẫu = lesson.sampleSolution || '';

    const fullPrompt = buildPrompt(prompt, {
        'đề_bài': đề_bài,
        'bài_làm': bài_làm,
        'lời_giải_mẫu': lời_giải_mẫu,
        student_name: user.name
    });

    // 4. Gọi AI
    const aiResult = await gradeSubmission(fullPrompt, { model });

    // 5. Chuẩn bị snapshot
    const promptSnapshot = buildSnapshot(prompt);

    const submission = await Submission.create({
        userId,
        lessonId,
        subjectId: lesson.subjectId,
        answerHtml,
        score: aiResult.score,
        feedback: aiResult.feedback,
        breakdown: aiResult.breakdown,
        grammar: aiResult.grammar,
        sampleComparison: aiResult.sampleComparison,
        promptSnapshot,
        model: aiResult.modelUsed,
        latencyMs: aiResult.latencyMs,
        gradedAt: new Date(),
        submittedAt: new Date(),
        syncStatus: 'pending'
    });

    // 6. Đẩy GitHub qua queue (không block)
    if (githubService.isConfigured && subject?.slug && lesson?.slug) {
        const filePath = githubService.submissionPath(
            subject.slug,
            lesson.slug,
            String(userId),
            submission.submittedAt
        );

        enqueueSync({
            type: 'putJson',
            filePath,
            data: {
                userId: String(userId),
                lessonId: String(lessonId),
                subjectId: String(lesson.subjectId),
                answerHtml,
                score: aiResult.score,
                feedback: aiResult.feedback,
                breakdown: aiResult.breakdown,
                grammar: aiResult.grammar,
                sampleComparison: aiResult.sampleComparison,
                promptSnapshot,
                model: aiResult.modelUsed,
                gradedAt: submission.gradedAt,
                submittedAt: submission.submittedAt
            },
            commitMessage: `Submission: ${lesson.title} - ${user.email}`,
            submissionId: String(submission._id)
        });
    }

    // 7. Notification
    await notificationService.createNotification({
        userId,
        type: 'graded',
        title: 'Bài nộp đã được chấm',
        message: `Bài "${lesson.title}" đã được chấm: ${aiResult.score}/${promptSnapshot.maxScore}`,
        link: `/student/history`
    });

    return submission;
}

module.exports = { gradeAndSave };