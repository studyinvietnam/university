const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const User = require('../models/User');
const AIKey = require('../models/AIKey');
const { normalizeProvider } = require('../config/aiModels');

const { resolvePrompt, buildPrompt, buildSnapshot } = require('./promptService');
const { wrapUserContent } = require('./sanitizeService');
const { gradeSubmission } = require('./aiService');
const githubService = require('./githubService');
const lessonContentService = require('./lessonContentService');
const notificationService = require('./notificationService');
const { enqueue } = require('./syncQueueService');

/**
 * Chấm 1 bài nộp và lưu kết quả.
 *
 * MONGODB giữ (nhẹ ~1KB):
 *   _id, userId, lessonId, subjectId, score, model, aiKeyName, aiKeyId,
 *   status, errorMessage, githubFile, syncStatus, syncedAt,
 *   submittedAt, gradedAt, latencyMs
 *
 * GITHUB giữ (nặng ~30KB):
 *   answerHtml, feedback, breakdown, grammar, sampleComparison,
 *   promptSnapshot, lessonContentHtml, lessonSampleSolution, raw
 *
 * Sau khi đẩy GitHub OK → onSuccess xoá các field nặng khỏi MongoDB.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.lessonId
 * @param {string} params.answerHtml
 * @param {string} [params.model]
 * @param {string} [params.aiKeyId]
 * @returns {Promise<object>} submission document
 */
async function gradeAndSave({ userId, lessonId, answerHtml, model, aiKeyId }) {
    // ============================================================
    // 1. Load dữ liệu
    // ============================================================
    const [user, lesson] = await Promise.all([
        User.findById(userId).lean(),
        Lesson.findById(lessonId).lean()
    ]);

    if (!user) throw new Error('User không tồn tại.');
    if (!lesson) throw new Error('Lesson không tồn tại.');

    const subject = await Subject.findById(lesson.subjectId).lean();

    // ★ contentHtml CHỈ ở GitHub: đọc đề bài TRƯỚC khi tạo Submission.
    //   Không đọc được → ném lỗi, KHÔNG tạo Submission, KHÔNG chấm (tránh chấm với đề rỗng).
    let lessonContent;
    try {
        lessonContent = await lessonContentService.getLessonContent(lesson, subject?.slug);
    } catch (e) {
        console.error(`[submissionService] Không đọc được đề bài từ GitHub: ${e.message}`);
        throw new Error('Không tải được đề bài từ GitHub. Vui lòng thử nộp lại sau ít phút.');
    }

    // ============================================================
    // 2. Tạo Submission TẠM trong MongoDB — giữ answerHtml tạm
    // ------------------------------------------------------------
    // Nếu GitHub fail → answerHtml vẫn còn trong MongoDB.
    // Nếu GitHub OK → onSuccess xoá answerHtml.
    // ============================================================
    const submission = await Submission.create({
        userId,
        lessonId,
        subjectId: lesson.subjectId,
        answerHtml,          // TẠM giữ — sẽ xoá khi đẩy GitHub thành công
        status: 'grading',
        submittedAt: new Date(),
        syncStatus: 'pending',
        model: model || null
    });

    console.log(`📝 [submissionService] Đã tạo submission ${submission._id} (status=grading)`);

    // ============================================================
    // 3. Chấm AI — có thể thành công hoặc thất bại
    // ============================================================
    let aiResult = null;
    let promptSnapshot = null;
    let errorMessage = null;

    try {
        const prompt = await resolvePrompt(lesson, subject);

        // ★ FIX: nếu đọc nội dung prompt từ GitHub thất bại (timeout, file
        //   chưa kịp sync, lỗi mạng...), KHÔNG được âm thầm chấm bằng
        //   FALLBACK_PROMPT — báo lỗi rõ ràng để học sinh biết thử nộp lại,
        //   thay vì bị chấm sai rubric mà không ai hay.
        if (prompt.hydrateFailed) {
            throw new Error(
                'Không tải được nội dung prompt từ GitHub (lỗi mạng/timeout). Vui lòng thử nộp lại.'
            );
        }

        const đề_bài = lessonContent.contentHtml || lesson.title || '';
        const bài_làm = wrapUserContent('BÀI_LÀM', answerHtml || '');
        const lời_giải_mẫu = lesson.sampleSolution || '';

        const fullPrompt = buildPrompt(prompt, {
            'đề_bài': đề_bài,
            'bài_làm': bài_làm,
            'lời_giải_mẫu': lời_giải_mẫu,
            student_name: user.name
        });

        // ★ FIX (BUG CHÍNH): buildPrompt() trả về { text, unknownPlaceholders },
        //   không phải string. gradeSubmission() yêu cầu string và luôn throw
        //   "Prompt rỗng." nếu nhận object — đây là nguyên nhân lỗi 100% các
        //   lần nộp bài trước đây, không liên quan gì tới GitHub hay lesson.
        aiResult = await gradeSubmission(fullPrompt.text, {
            model,
            preferredKeyId: aiKeyId || null
        });

        // ★ FIX: truyền luôn unknownPlaceholders (đã tính sẵn trong buildPrompt)
        //   để snapshot lưu lại cảnh báo nếu admin gõ sai tên biến trong prompt.
        promptSnapshot = buildSnapshot(prompt, fullPrompt.unknownPlaceholders);

        // Cập nhật metadata nhẹ vào MongoDB
        await Submission.updateOne(
            { _id: submission._id },
            {
                $set: {
                    score: aiResult.score,
                    model: aiResult.modelUsed,
                    aiKeyId: aiResult.keyUsed?.id || null,
                    aiKeyName: aiResult.keyUsed?.name || null,
                    // ★ Snapshot nhà cung cấp lúc chấm (vilao / gemini)
                    aiProvider: normalizeProvider(aiResult.aiProvider || aiResult.keyUsed?.provider),
                    latencyMs: aiResult.latencyMs,
                    // ★ Số lỗi lưu nhẹ ở Mongo để trang lịch sử hiện đúng (grammar đầy đủ chỉ ở GitHub)
                    errorCount: Array.isArray(aiResult.grammar?.errors) ? aiResult.grammar.errors.length : 0,
                    gradedAt: new Date(),
                    status: 'graded',
                    errorMessage: null
                    // ★ KHÔNG lưu feedback/breakdown/grammar vào MongoDB
                    //   → chỉ đẩy GitHub ở bước sau
                }
            }
        );

        console.log(
            `✅ [submissionService] Chấm xong: ${submission._id} — score=${aiResult.score}`
        );
    } catch (err) {
        // AI chấm thất bại → vẫn tiếp tục đẩy GitHub
        errorMessage = err.message;

        console.error(
            `❌ [submissionService] Chấm thất bại: ${submission._id} — ${err.message}`
        );

        // ★ Chấm lỗi vẫn ghi lại key + provider đã được chọn (nếu có),
        //   để controller hiển thị đúng thông báo lỗi của vilao.ai / Gemini.
        let failedKeyMeta = {};
        if (aiKeyId) {
            try {
                const k = await AIKey.findById(aiKeyId).select('name provider').lean();
                if (k) {
                    failedKeyMeta = {
                        aiKeyId: k._id,
                        aiKeyName: k.name || null,
                        aiProvider: normalizeProvider(k.provider)
                    };
                }
            } catch (_) { /* bỏ qua: chỉ là metadata */ }
        }

        await Submission.updateOne(
            { _id: submission._id },
            {
                $set: {
                    status: 'failed',
                    errorMessage: err.message,
                    gradedAt: new Date(),
                    model: model || null,
                    ...failedKeyMeta
                }
            }
        );
    }

    // ============================================================
    // 4. Đẩy GitHub — LUÔN đẩy (bất kể AI thành công hay thất bại)
    // ------------------------------------------------------------
    // Payload đầy đủ: answerHtml + feedback + breakdown + grammar + ...
    // ============================================================
    const canPushGitHub =
        githubService.isConfigured &&
        subject &&
        subject.slug &&
        lesson &&
        lesson.slug;

    if (canPushGitHub) {
        // ★ Mỗi bài nộp = 1 file JSON với TÊN NGẪU NHIÊN, không trùng file nào trên GitHub
        //   (submissions/{môn}/{bài}/{tên-ngẫu-nhiên}.json)
        let filePath = null;
        try {
            filePath = await githubService.uniqueJsonPath(`submissions/${subject.slug}/${lesson.slug}`);
        } catch (e) {
            console.warn(`[submissionService] Không sinh được tên file ngẫu nhiên: ${e.message}`);
        }

        try {
            if (!filePath) throw new Error('Không có đường dẫn file bài nộp');
            enqueue({
                type: 'putJson',
                filePath,
                commitMessage: `[Submission] ${lesson.title} - ${user.email} - ${
                    aiResult ? `${aiResult.score ?? '?'}/10` : 'FAILED'
                }`,
                submissionId: String(submission._id),

                // ★ PAYLOAD ĐẦY ĐỦ — TẤT CẢ DATA NẶNG ĐẨY GITHUB
                data: {
                    // ===== METADATA =====
                    submissionId: String(submission._id),
                    submittedAt: submission.submittedAt,
                    gradedAt: new Date(),

                    // ===== TRẠNG THÁI =====
                    status: aiResult ? 'graded' : 'failed',
                    errorMessage: errorMessage || null,

                    // ===== USER =====
                    userId: String(userId),
                    userName: user.name || null,
                    userEmail: user.email || null,

                    // ===== MÔN HỌC =====
                    subjectId: String(lesson.subjectId),
                    subjectName: subject?.name || null,
                    subjectCode: subject?.code || null,
                    subjectSlug: subject?.slug || null,

                    // ===== BÀI HỌC =====
                    lessonId: String(lessonId),
                    lessonTitle: lesson.title || null,
                    lessonSlug: lesson.slug || null,
                    lessonDuration: lesson.duration || 20,

                    // ★ ĐỀ BÀI (HTML)
                    lessonContentHtml: lessonContent.contentHtml || '',

                    // ★ LỜI GIẢI MẪU
                    lessonSampleSolution: lesson.sampleSolution || '',

                    // ★ BÀI LÀM CỦA HỌC SINH
                    answerHtml,

                    // ===== KẾT QUẢ CHẤM (nếu có) =====
                    score: aiResult?.score ?? null,
                    feedback: aiResult?.feedback ?? '',
                    breakdown: aiResult?.breakdown ?? [],
                    grammar: aiResult?.grammar ?? null,
                    sampleComparison: aiResult?.sampleComparison ?? null,

                    // ===== AI INFO =====
                    model: aiResult?.modelUsed || model || null,
                    aiKeyId: aiResult?.keyUsed?.id || null,
                    aiKeyName: aiResult?.keyUsed?.name || null,
                    aiProvider: aiResult
                        ? normalizeProvider(aiResult.aiProvider || aiResult.keyUsed?.provider)
                        : null,
                    latencyMs: aiResult?.latencyMs || null,

                    // ===== PROMPT SNAPSHOT =====
                    promptSnapshot: promptSnapshot,

                    // ===== RAW AI RESPONSE =====
                    raw: aiResult?.raw || null
                },

                // ========================================================
                // onSuccess — đẩy GitHub OK
                // → Xoá các field NẶNG khỏi MongoDB (đã có trên GitHub)
                // ========================================================
                onSuccess: async (result) => {
                    try {
                        await Submission.updateOne(
                            { _id: submission._id },
                            {
                                $set: {
                                    syncStatus: 'committed',
                                    githubFile: filePath,
                                    githubSha: result?.sha || null,
                                    syncedAt: new Date(),
                                    // ★ Xoá answerHtml — đã có trên GitHub
                                    answerHtml: '',
                                    // ★ Xoá các field nặng khác (nếu có lỡ lưu)
                                    feedback: '',
                                    breakdown: [],
                                    grammar: null,
                                    sampleComparison: null,
                                    promptSnapshot: null
                                }
                            }
                        );

                        console.log(
                            `📤 [submissionService] Đã đẩy GitHub + xoá data nặng khỏi DB: ${result?.url || filePath}`
                        );
                    } catch (e) {
                        console.warn(
                            `[submissionService] Update syncStatus fail: ${e.message}`
                        );
                    }
                },

                // ========================================================
                // onFinalFail — đẩy GitHub THẤT BẠI sau retry
                // → GIỮ answerHtml trong MongoDB (fallback)
                // ========================================================
                onFinalFail: async (err) => {
                    try {
                        await Submission.updateOne(
                            { _id: submission._id },
                            {
                                $set: {
                                    syncStatus: 'failed',
                                    syncError: err.message
                                    // KHÔNG xoá answerHtml — giữ để xem được
                                }
                            }
                        );
                        console.error(
                            `❌ [submissionService] Đẩy GitHub thất bại — giữ answerHtml trong DB: ${err.message}`
                        );
                    } catch (e) {
                        console.warn(
                            `[submissionService] Update syncStatus (fail) fail: ${e.message}`
                        );
                    }
                }
            });
        } catch (e) {
            console.warn(`[submissionService] Enqueue fail: ${e.message}`);
        }
    } else {
        console.warn(
            '[submissionService] Không đẩy được GitHub (thiếu config hoặc slug) — giữ answerHtml trong DB'
        );
    }

    // ============================================================
    // 5. Notification — chỉ gửi khi chấm thành công
    // ============================================================
    if (aiResult && !errorMessage) {
        try {
            await notificationService.createNotification({
                userId,
                type: 'graded',
                title: 'Bài nộp đã được chấm',
                message: `Bài "${lesson.title}" đã được chấm: ${aiResult.score}/${
                    promptSnapshot?.maxScore || 10
                }`,
                link: `/submissions/${submission._id}`
            });
        } catch (e) {
            console.warn(`[submissionService] Notification fail: ${e.message}`);
        }
    }

    // ============================================================
    // 6. Trả về document mới nhất
    // ============================================================
    const final = await Submission.findById(submission._id).lean();
    return final;
}

module.exports = { gradeAndSave };