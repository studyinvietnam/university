// ============================================================
// AI SERVICE - Gemini generateContent API
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SUPPORTED_MODELS = [
    "gemini-3.6-flash", "gemini-3.7-flash",
    "gemini-2-flash",   "gemini-2-flash-lite",
    "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro",
    "gemini-3-flash",   "gemini-3.1-pro", "gemini-3.1-flash-lite",
    "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash",
    "gemma-4-26b",      "gemma-4-31b",
];

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_PROMPT_CHARS = 50000;

// ============================================================
// VALIDATE + MODEL
// ============================================================

function validateGeminiApiKey() {
    if (
        !GEMINI_API_KEY ||
        GEMINI_API_KEY === "1111" ||
        GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY"
    ) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình.");
    }
}

function getSafeModel(model = null) {
    if (typeof model === "string" && SUPPORTED_MODELS.includes(model)) return model;
    return DEFAULT_MODEL;
}

// ============================================================
// PROMPT CHẤM IELTS (fallback mặc định)
// ============================================================

function createWritingPrompt(topic, essay) {
    return `
Bạn là giáo viên chấm IELTS Writing. Chấm khách quan, chỉ trả JSON.

============================================================
ĐỀ BÀI
============================================================
${topic || "(Không có đề bài)"}

============================================================
BÀI VIẾT HỌC SINH
============================================================
${essay}

============================================================
YÊU CẦU CHẤM
============================================================
1. Grammar: chỉ ra lỗi THẬT (original → corrected → explanation), không bịa lỗi.
2. Vocabulary: đa dạng, chính xác, gợi ý từ tốt hơn.
3. Coherence: bố cục, từ nối, liên kết câu.
4. Content: trả lời đúng đề, đủ ý, phát triển ý.
5. Outline: mở - thân - kết.
6. Tổng thể: 0-10, nêu điểm mạnh/yếu, 3-5 cách cải thiện.
7. wordCount = số từ thực tế của bài viết.

Chỉ trả DUY NHẤT JSON, KHÔNG markdown, KHÔNG code fence:

{
  "score": 0, "wordCount": 0,
  "grammar":    { "score": 0, "comment": "", "errors": [{ "original": "", "corrected": "", "explanation": "" }] },
  "vocabulary": { "score": 0, "comment": "", "suggestions": [] },
  "coherence":  { "score": 0, "comment": "" },
  "content":    { "score": 0, "comment": "" },
  "outline": {
    "introduction": { "score": 0, "comment": "" },
    "body":         { "score": 0, "comment": "" },
    "conclusion":   { "score": 0, "comment": "" }
  },
  "strengths": [], "weaknesses": [], "improvements": [],
  "overall_comment": ""
}
`;
}

// ============================================================
// WORD COUNT + NORMALIZE
// ============================================================

function countWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(10, n));
}

function normalizeWritingResult(data, essay) {
    const d = data || {};
    return {
        score: safeNumber(d.score),
        wordCount: countWords(essay),
        grammar: {
            score: safeNumber(d?.grammar?.score),
            comment: String(d?.grammar?.comment ?? ""),
            errors: Array.isArray(d?.grammar?.errors) ? d.grammar.errors : [],
        },
        vocabulary: {
            score: safeNumber(d?.vocabulary?.score),
            comment: String(d?.vocabulary?.comment ?? ""),
            suggestions: Array.isArray(d?.vocabulary?.suggestions) ? d.vocabulary.suggestions : [],
        },
        coherence: {
            score: safeNumber(d?.coherence?.score),
            comment: String(d?.coherence?.comment ?? ""),
        },
        content: {
            score: safeNumber(d?.content?.score),
            comment: String(d?.content?.comment ?? ""),
        },
        outline: {
            introduction: {
                score: safeNumber(d?.outline?.introduction?.score),
                comment: String(d?.outline?.introduction?.comment ?? ""),
            },
            body: {
                score: safeNumber(d?.outline?.body?.score),
                comment: String(d?.outline?.body?.comment ?? ""),
            },
            conclusion: {
                score: safeNumber(d?.outline?.conclusion?.score),
                comment: String(d?.outline?.conclusion?.comment ?? ""),
            },
        },
        strengths: Array.isArray(d?.strengths) ? d.strengths : [],
        weaknesses: Array.isArray(d?.weaknesses) ? d.weaknesses : [],
        improvements: Array.isArray(d?.improvements) ? d.improvements : [],
        overall_comment: String(d?.overall_comment ?? ""),
    };
}

// ============================================================
// PARSE JSON AN TOÀN
// ============================================================

function parseGeminiJson(text) {
    if (!text || typeof text !== "string") {
        throw new Error("Gemini không trả về nội dung JSON.");
    }
    let cleaned = text.trim();

    try { return JSON.parse(cleaned); } catch (_) {}

    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const first = cleaned.indexOf("{");
    const last  = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
        cleaned = cleaned.slice(first, last + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch (_) {
        console.error("❌ RAW GEMINI:", text.slice(0, 800));
        throw new Error("Gemini trả về JSON không hợp lệ.");
    }
}

// ============================================================
// CALL GEMINI generateContent
// ============================================================

async function callGeminiGenerateContent(prompt, model, timeoutMs = 45000) {
    validateGeminiApiKey();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
            signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ GEMINI ERROR:", data);
            throw new Error(data?.error?.message || `Gemini API lỗi (${response.status}).`);
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
            console.error("❌ GEMINI no text:", data);
            throw new Error("Gemini không trả về nội dung text.");
        }

        return text;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(`Gemini không phản hồi sau ${timeoutMs / 1000}s.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ============================================================
// CHẤM BÀI IELTS — 1 lần gọi, có retry parse 1 lần
// ============================================================

async function checkWritingByGemini(topic, essay, timeoutMs = 45000, model = null) {
    validateGeminiApiKey();

    if (!essay || typeof essay !== "string" || !essay.trim()) {
        throw new Error("Bài viết đang trống.");
    }

    const selectedModel = getSafeModel(model);
    const prompt = createWritingPrompt(topic, essay);

    if (prompt.length > MAX_PROMPT_CHARS) {
        throw new Error("Bài viết quá dài. Vui lòng rút gọn.");
    }

    console.log(`🤖 [aiService] checkWriting model=${selectedModel} len=${prompt.length}`);

    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await callGeminiGenerateContent(prompt, selectedModel, timeoutMs);
            const parsed = parseGeminiJson(text);
            return normalizeWritingResult(parsed, essay);
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ [aiService] attempt ${attempt} failed: ${err.message}`);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
        }
    }
    throw lastError;
}

// ============================================================
// CHẤM BÀI VỚI PROMPT TÙY CHỈNH (cho Admin test prompt)
// Trả về NGUYÊN parsed object — không normalize theo cấu trúc IELTS
// ============================================================

async function runCustomPrompt(renderedPrompt, model = null, timeoutMs = 45000) {
    validateGeminiApiKey();

    if (!renderedPrompt || typeof renderedPrompt !== "string") {
        throw new Error("Prompt rỗng.");
    }
    if (renderedPrompt.length > MAX_PROMPT_CHARS) {
        throw new Error(`Prompt quá dài (>${MAX_PROMPT_CHARS} ký tự).`);
    }

    const selectedModel = getSafeModel(model);
    console.log(`🧪 [aiService] runCustomPrompt model=${selectedModel} len=${renderedPrompt.length}`);

    const text = await callGeminiGenerateContent(renderedPrompt, selectedModel, timeoutMs);

    // Prompt tùy chỉnh có thể trả về format khác — thử parse JSON, nếu fail trả text thô
    try {
        return parseGeminiJson(text);
    } catch (_) {
        return { raw: text, score: null, feedback: text };
    }
}

// ============================================================
// TEST KẾT NỐI
// ============================================================

async function testGeminiConnection(model = null, timeoutMs = 15000) {
    validateGeminiApiKey();
    const selectedModel = getSafeModel(model);
    const text = await callGeminiGenerateContent("Reply only with the word OK.", selectedModel, timeoutMs);
    return { connected: true, model: selectedModel, response: text.trim() || "OK" };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    checkWritingByGemini,
    runCustomPrompt,
    testGeminiConnection,
    createWritingPrompt,
    normalizeWritingResult,
    parseGeminiJson,
    countWords,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    getSafeModel,
};