// ============================================================
// PROMPT SERVICE
// ============================================================
const GradingPrompt = (() => {
    try { return require('../models/GradingPrompt'); } catch (_) { return null; }
})();

const githubService = (() => {
    try { return require('./githubService'); } catch (_) { return null; }
})();

const GITHUB_READ_TIMEOUT_MS = 5000;

function readPromptFromGithub(filePath) {
    if (!githubService) return Promise.reject(new Error('githubService không khả dụng'));
    const fn =
        (typeof githubService.readJsonFile === 'function' && githubService.readJsonFile) ||
        (typeof githubService.getJSON === 'function' && githubService.getJSON) ||
        null;
    if (!fn) return Promise.reject(new Error('githubService không có method readJsonFile/getJSON'));
    return Promise.race([
        fn(filePath),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout đọc prompt từ GitHub')), GITHUB_READ_TIMEOUT_MS)
        )
    ]);
}

async function hydrateFromGithub(promptDoc) {
    // ★ FIX: thêm cờ hydrateFailed để phân biệt "đọc GitHub lỗi" (nên chấm
    //   lỗi hẳn, không âm thầm chấm sai) với "content thật sự rỗng" (lỗi
    //   nhập liệu của admin, cho phép fallback bình thường).
    if (!promptDoc || !promptDoc.githubFile) {
        return { ...promptDoc, hydrateFailed: false };
    }
    try {
        const json = await readPromptFromGithub(promptDoc.githubFile);
        if (json && typeof json === 'object') {
            return {
                ...promptDoc,
                content: json.content || promptDoc.content,
                rubric: json.rubric || promptDoc.rubric,
                variables: json.variables || promptDoc.variables,
                version: json.version ?? promptDoc.version,
                maxScore: json.maxScore ?? promptDoc.maxScore,
                strictness: json.strictness || promptDoc.strictness,
                hydrateFailed: false
            };
        }
    } catch (error) {
        console.warn(
            `⚠️ [promptService] Không đọc được prompt từ GitHub (${promptDoc.githubFile}):`,
            error.message
        );
        // ★ FIX: KHÔNG trả nguyên promptDoc (thiếu content) như một prompt
        //   bình thường — đánh dấu rõ hydrateFailed để nơi gọi (submissionService)
        //   quyết định chặn chấm bài thay vì âm thầm rơi về FALLBACK_PROMPT.
        return { ...promptDoc, content: null, hydrateFailed: true, hydrateError: error.message };
    }
    return { ...promptDoc, hydrateFailed: false };
}

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

// ★ NEW: danh sách biến hệ thống biết thay thế — dùng để phát hiện
// placeholder LẠ (gõ sai tên) trong content của GradingPrompt.
const KNOWN_PLACEHOLDERS = [
    '{đề_bài}', '{bài_làm}', '{lời_giải_mẫu}',
    '{rubric}', '{max_score}', '{strictness}', '{student_name}'
];

function findUnknownPlaceholders(text) {
    const found = String(text || '').match(/\{[^{}]{1,40}\}/g) || [];
    return [...new Set(found)].filter(p => !KNOWN_PLACEHOLDERS.includes(p));
}

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
        isFallback: true,
        hydrateFailed: false
    };
}

async function resolvePrompt(lesson, subject) {
    if (!GradingPrompt) {
        console.warn('⚠️ [promptService] Model GradingPrompt chưa có — dùng fallback prompt.');
        return buildFallbackPromptObject();
    }
    try {
        if (lesson?.promptId) {
            const lessonPrompt = await GradingPrompt.findOne({
                _id: lesson.promptId, active: { $ne: false }
            }).lean();
            if (lessonPrompt) return hydrateFromGithub({ ...lessonPrompt, scope: 'lesson' });
        }
        if (subject?.promptId) {
            const subjectPrompt = await GradingPrompt.findOne({
                _id: subject.promptId, active: { $ne: false }
            }).lean();
            if (subjectPrompt) return hydrateFromGithub({ ...subjectPrompt, scope: 'subject' });
        }
        const globalDefault = await GradingPrompt.findOne({
            scope: 'global', isDefault: true, active: { $ne: false }
        }).lean();
        if (globalDefault) return hydrateFromGithub(globalDefault);
    } catch (error) {
        console.error('❌ [promptService] resolvePrompt lỗi, dùng fallback:', error.message);
    }
    return buildFallbackPromptObject();
}

function buildPrompt(promptDoc, vars = {}) {
    const content = promptDoc?.content;
    const text = renderPromptTemplate(content, {
        topic: vars['đề_bài'],
        essay: vars['bài_làm'],
        sampleSolution: vars['lời_giải_mẫu'],
        rubric: promptDoc?.rubric,
        maxScore: promptDoc?.maxScore,
        strictness: promptDoc?.strictness,
        studentName: vars.student_name
    });
    return { text, unknownPlaceholders: findUnknownPlaceholders(content) };
}

function buildSnapshot(promptDoc, unknownPlaceholders = []) {
    if (!promptDoc) {
        return { ...buildFallbackPromptObject(), unknownPlaceholders: [], snapshotAt: new Date() };
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
        unknownPlaceholders,
        snapshotAt: new Date()
    };
}

module.exports = {
    FALLBACK_PROMPT,
    renderPromptTemplate,
    resolvePrompt,
    buildPrompt,
    buildSnapshot,
    findUnknownPlaceholders
};