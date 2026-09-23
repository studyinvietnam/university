// ============================================================
// PROMPT SERVICE
// Ghép biến động vào nội dung prompt (từ DB) trước khi gửi AI.
// Nếu DB không có prompt nào active → dùng FALLBACK_PROMPT hardcoded.
// ============================================================

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

module.exports = {
    FALLBACK_PROMPT,
    renderPromptTemplate
};
