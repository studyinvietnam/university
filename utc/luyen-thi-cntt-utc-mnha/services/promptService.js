// ============================================================
// PROMPT SERVICE
// Ghép biến động vào nội dung prompt (từ DB) trước khi gửi AI.
// Nếu DB không có prompt nào active → dùng FALLBACK_PROMPT hardcoded.
//
// ★ THÊM: resolvePrompt, buildPrompt, buildSnapshot — submissionService.js
// đã gọi 3 hàm này từ trước nhưng file này CHƯA TỪNG export chúng
// (trước đây chỉ có FALLBACK_PROMPT + renderPromptTemplate) → mỗi lượt
// nộp bài thật đều crash "resolvePrompt is not a function" ngay bước đầu
// tiên, trước cả khi kịp gọi tới AI.
// ============================================================

// GradingPrompt có thể chưa tồn tại tuỳ tiến độ dự án — require an toàn
// giống cách controllers/ai.controller.js đang làm, để không sập cả app
// nếu model này chưa được tạo.
const GradingPrompt = (() => {
    try { return require('../models/GradingPrompt'); } catch (_) { return null; }
})();

const FALLBACK_PROMPT = `
Bạn là giáo viên chấm bài. Hãy chấm bài viết sau dựa trên đề bài và rubric.

Đề bài:
{đề_bài}

Bài làm sinh viên:
{bài_làm}

Lời giải mẫu (nếu có, chỉ dùng để đối chiếu ý, không chép nguyên văn vào feedback):
{lời_giải_mẫu}

Rubric: {rubric}
Điểm tối đa: {max_score}

QUY TẮC PHÁT HIỆN LỖI:
- Chỉ liệt kê lỗi khi lỗi thực sự tồn tại trong bài làm, không tự bịa.
- Nếu đề bài/rubric không đủ căn cứ để xác định một lỗi cụ thể, bỏ qua, không đoán.
- Mỗi lỗi nêu rõ: câu gốc sai, câu đã sửa, giải thích ngắn gọn.

Chỉ trả về JSON hợp lệ, không Markdown, không giải thích ngoài JSON:
{
  "score": number,
  "feedback": string,
  "breakdown": [{ "criterion": string, "score": number, "comment": string }],
  "errors": [{ "original": string, "corrected": string, "explanation": string }]
}
`.trim();

function escapeForPrompt(value) {
    return String(value ?? '').trim();
}

function formatRubric(rubric) {
    if (!rubric) return '(Không có rubric riêng, chấm theo cảm quan chung.)';
    if (typeof rubric === 'string') return rubric;
    try {
        return JSON.stringify(rubric, null, 2);
    } catch (_) {
        return '(Rubric không hợp lệ.)';
    }
}

/**
 * Thay các biến {đề_bài}, {bài_làm}, {rubric}, {max_score},
 * {lời_giải_mẫu}, {strictness}, {student_name} trong nội dung prompt.
 */
function renderPromptTemplate(promptContent, variables = {}) {
    const template = promptContent && String(promptContent).trim()
        ? promptContent
        : FALLBACK_PROMPT;

    const map = {
        '{đề_bài}': escapeForPrompt(variables.topic),
        '{bài_làm}': escapeForPrompt(variables.essay),
        '{lời_giải_mẫu}': variables.sampleSolution
            ? escapeForPrompt(variables.sampleSolution)
            : '(Không có lời giải mẫu cho bài này.)',
        '{rubric}': formatRubric(variables.rubric),
        '{max_score}': String(variables.maxScore ?? 10),
        '{strictness}': escapeForPrompt(variables.strictness) || 'normal',
        '{student_name}': escapeForPrompt(variables.studentName) || 'học sinh'
    };

    let rendered = template;
    for (const [placeholder, value] of Object.entries(map)) {
        rendered = rendered.split(placeholder).join(value);
    }

    return rendered;
}

// ============================================================
// ★ FALLBACK PROMPT OBJECT — dùng khi DB không có prompt nào phù hợp.
// Có hình dạng giống 1 document GradingPrompt để resolvePrompt/buildPrompt/
// buildSnapshot xử lý đồng nhất, không cần rẽ nhánh riêng ở nơi gọi.
// ============================================================
function buildFallbackPromptObject() {
    return {
        _id: null,
        name: 'Fallback mặc định (hardcoded)',
        description: 'Dùng khi không có GradingPrompt nào active phù hợp trong DB.',
        content: FALLBACK_PROMPT,
        rubric: null,
        strictness: 'normal',
        maxScore: 10,
        scope: 'fallback',
        version: 0,
        isFallback: true
    };
}

// ============================================================
// ★ RESOLVE PROMPT — thứ tự ưu tiên đúng như README:
// 1. Lesson.promptId (prompt gán riêng cho bài học)
// 2. Subject.promptId (prompt gán riêng cho môn)
// 3. GradingPrompt { scope: 'global', isDefault: true, active: true }
// 4. Fallback hardcoded (an toàn nếu DB trống / model chưa có / lỗi query)
//
// @param {object} lesson - lesson doc (lean), có thể có field promptId
// @param {object} subject - subject doc (lean), có thể có field promptId
// @returns {Promise<object>} prompt document (hoặc fallback object)
// ============================================================
async function resolvePrompt(lesson, subject) {
    if (!GradingPrompt) {
        console.warn('⚠️ [promptService] Model GradingPrompt chưa có — dùng fallback prompt.');
        return buildFallbackPromptObject();
    }

    try {
        if (lesson?.promptId) {
            const lessonPrompt = await GradingPrompt.findOne({
                _id: lesson.promptId,
                active: { $ne: false }
            }).lean();
            if (lessonPrompt) return lessonPrompt;
        }

        if (subject?.promptId) {
            const subjectPrompt = await GradingPrompt.findOne({
                _id: subject.promptId,
                active: { $ne: false }
            }).lean();
            if (subjectPrompt) return subjectPrompt;
        }

        const globalDefault = await GradingPrompt.findOne({
            scope: 'global',
            isDefault: true,
            active: { $ne: false }
        }).lean();
        if (globalDefault) return globalDefault;
    } catch (error) {
        console.error('❌ [promptService] resolvePrompt lỗi, dùng fallback:', error.message);
    }

    return buildFallbackPromptObject();
}

// ============================================================
// ★ BUILD PROMPT — render prompt đã resolve với dữ liệu bài làm cụ thể.
//
// submissionService.js gọi hàm này với tên biến tiếng Việt khớp đúng
// placeholder trong template ({đề_bài}, {bài_làm}, {lời_giải_mẫu},
// student_name), còn rubric/maxScore/strictness lấy từ chính promptDoc
// (đúng bản chất: đây là thuộc tính của PROMPT, không phải của bài nộp).
//
// Hàm này chỉ là lớp chuyển đổi tên biến sang renderPromptTemplate() —
// nơi khác (vd controllers/ai.controller.js testPrompt) vẫn gọi thẳng
// renderPromptTemplate() với tên biến chuẩn (topic/essay/...), không đổi.
//
// @param {object} promptDoc - kết quả từ resolvePrompt()
// @param {object} vars - { 'đề_bài', 'bài_làm', 'lời_giải_mẫu', student_name }
// @returns {string} prompt đã render đầy đủ, sẵn sàng gửi cho Gemini
// ============================================================
function buildPrompt(promptDoc, vars = {}) {
    const content = promptDoc?.content;

    return renderPromptTemplate(content, {
        topic: vars['đề_bài'],
        essay: vars['bài_làm'],
        sampleSolution: vars['lời_giải_mẫu'],
        rubric: promptDoc?.rubric,
        maxScore: promptDoc?.maxScore,
        strictness: promptDoc?.strictness,
        studentName: vars.student_name
    });
}

// ============================================================
// ★ BUILD SNAPSHOT — lưu TOÀN BỘ nội dung prompt tại thời điểm chấm.
// Theo đúng lưu ý trong README: promptId có thể còn nhưng nội dung prompt
// có thể đã bị admin sửa sau đó → phải lưu nguyên snapshot, không chỉ ID,
// để sau này biết chính xác bài đã được chấm bằng nội dung/rubric nào.
//
// @param {object} promptDoc - kết quả từ resolvePrompt()
// @returns {object} snapshot lưu vào Submission.promptSnapshot
// ============================================================
function buildSnapshot(promptDoc) {
    if (!promptDoc) {
        return { ...buildFallbackPromptObject(), snapshotAt: new Date() };
    }

    return {
        promptId: promptDoc._id || null,
        name: promptDoc.name || null,
        content: promptDoc.content || FALLBACK_PROMPT,
        rubric: promptDoc.rubric || null,
        strictness: promptDoc.strictness || 'normal',
        maxScore: promptDoc.maxScore ?? 10,
        scope: promptDoc.scope || null,
        version: promptDoc.version ?? 0,
        isFallback: Boolean(promptDoc.isFallback),
        snapshotAt: new Date()
    };
}

module.exports = {
    FALLBACK_PROMPT,
    renderPromptTemplate,
    resolvePrompt,
    buildPrompt,
    buildSnapshot
};
