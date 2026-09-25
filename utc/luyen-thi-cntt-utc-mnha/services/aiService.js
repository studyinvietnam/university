// ============================================================
// AI SERVICE - Gemini API
// ------------------------------------------------------------
// Chấm bài code CNTT (thay vì IELTS)
// - Prompt chấm code: logic, chất lượng, edge case, trình bày
// - Hỗ trợ biến: {đề_bài}, {bài_làm}, {lời_giải_mẫu}, {student_name}, {max_score}
// - Retry 503 với exponential backoff
// - Xoay key khi quota
// ============================================================

const crypto = require("crypto");

const AIKey = require("../models/AIKey");
const {
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel,
    getSafeModel
} = require("../config/aiModels");

// SDK mới
let GoogleGenAI = null;
try {
    const genaiModule = require("@google/genai");
    GoogleGenAI = genaiModule.GoogleGenAI || genaiModule.default || genaiModule;
    console.log("✅ [aiService] SDK @google/genai đã load");
} catch (err) {
    console.warn("⚠️ [aiService] Không load được @google/genai SDK:", err.message);
    console.warn("   → Sẽ dùng fallback fetch với header X-goog-api-key");
}

const MAX_PROMPT_CHARS = 50000;
const MAX_KEYS_TO_TRY = 5;
const QUOTA_ERROR_THRESHOLD = 5;

// Cấu hình retry khi 503
const OVERLOAD_MAX_ATTEMPTS = 4;
const OVERLOAD_DELAYS = [3000, 6000, 12000];

// Model fallback khi model chính 503
const FALLBACK_MODEL_CHAIN = [
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2-flash-lite'
];

// ============================================================
// GIẢI MÃ KEY
// ============================================================

function getMasterKey() {
    const hex = process.env.ENCRYPTION_MASTER_KEY;
    if (!hex) throw new Error("ENCRYPTION_MASTER_KEY chưa cấu hình.");
    const buf = Buffer.from(hex, "hex");
    if (buf.length !== 32) throw new Error("ENCRYPTION_MASTER_KEY phải là 32 byte (64 hex).");
    return buf;
}

function decryptKey(aiKeyDoc) {
    const masterKey = getMasterKey();
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        masterKey,
        Buffer.from(aiKeyDoc.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(aiKeyDoc.authTag, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(aiKeyDoc.encryptedKey, "hex")),
        decipher.final()
    ]);
    return decrypted.toString("utf8");
}

// ============================================================
// QUẢN LÝ KEY
// ============================================================

async function findKeyById(keyId) {
    if (!keyId) return null;
    return AIKey.findOne({
        _id: keyId,
        isActive: true,
        isRevoked: false
    })
        .select("+encryptedKey +iv +authTag")
        .exec();
}

async function findNextActiveKey(excludeIds) {
    return AIKey.findOne({
        isActive: true,
        isRevoked: false,
        _id: { $nin: excludeIds }
    })
        .select("+encryptedKey +iv +authTag")
        .sort({ lastUsedAt: 1, usageCount: 1 })
        .exec();
}

async function markKeyUsed(keyDoc) {
    keyDoc.usageCount = (keyDoc.usageCount || 0) + 1;
    keyDoc.lastUsedAt = new Date();
    await keyDoc.save();
}

async function markKeyQuotaError(keyDoc) {
    // ★ ĐÃ BỎ AUTO-DISABLE: trước đây nếu quotaErrorCount vượt
    //   QUOTA_ERROR_THRESHOLD thì tự set isActive = false. Giờ chỉ còn
    //   đếm số lần dính lỗi quota để tham khảo (hiển thị ở admin/ai-keys),
    //   KHÔNG tự tắt key nữa — việc bật/tắt key hoàn toàn do admin bấm
    //   nút thủ công (xem toggleAIKey trong aikey.controller.js).
    keyDoc.quotaErrorCount = (keyDoc.quotaErrorCount || 0) + 1;
    await keyDoc.save();
}

// ============================================================
// NHẬN DIỆN LỖI
// ============================================================

function isQuotaError(err) {
    const msg = String(err?.message || "").toLowerCase();
    return (
        msg.includes("quota") ||
        msg.includes("429") ||
        msg.includes("rate limit") ||
        msg.includes("resource_exhausted")
    );
}

function isProjectDenied(err) {
    const msg = String(err?.message || "").toLowerCase();
    return msg.includes("denied access") || msg.includes("permission_denied");
}

function isOverloadError(err) {
    const msg = String(err?.message || "").toLowerCase();
    const status = err?.status || err?.code;
    return (
        status === 503 ||
        msg.includes("503") ||
        msg.includes("high demand") ||
        msg.includes("unavailable") ||
        msg.includes("overloaded") ||
        msg.includes("try again later")
    );
}

// ============================================================
// RETRY KHI 503
// ============================================================

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function retryOnOverload(fn, label = "gemini") {
    let lastErr = null;

    for (let attempt = 1; attempt <= OVERLOAD_MAX_ATTEMPTS; attempt++) {
        try {
            return await fn(attempt);
        } catch (err) {
            lastErr = err;

            if (!isOverloadError(err)) {
                throw err;
            }

            if (attempt < OVERLOAD_MAX_ATTEMPTS) {
                const waitMs = OVERLOAD_DELAYS[attempt - 1] || 12000;
                console.warn(
                    `⏳ [${label}] 503 overloaded — retry ${attempt}/${OVERLOAD_MAX_ATTEMPTS} sau ${waitMs / 1000}s...`
                );
                await sleep(waitMs);
            }
        }
    }

    console.error(`❌ [${label}] Vẫn 503 sau ${OVERLOAD_MAX_ATTEMPTS} lần thử`);
    throw lastErr;
}

// ============================================================
// ★ PROMPT CHẤM BÀI CODE CNTT
// ------------------------------------------------------------
// Thay thế hoàn toàn prompt IELTS cũ.
// Nếu admin tạo GradingPrompt trong DB → dùng prompt đó.
// Hàm này chỉ là FALLBACK khi DB không có prompt nào.
// ============================================================

function createCodeGradingPrompt(topic, answer, options = {}) {
    const { sampleSolution = "", studentName = "", maxScore = 10 } = options;

    const sampleSolutionBlock = sampleSolution
        ? `
============================================================
LỜI GIẢI MẪU / ĐÁP ÁN THAM KHẢO
============================================================
${sampleSolution}

Hãy so sánh bài làm với lời giải mẫu để phát hiện các ý còn thiếu.
KHÔNG chép nguyên văn lời giải mẫu vào feedback.
`
        : "";

    const studentBlock = studentName
        ? `Sinh viên: ${studentName}\n`
        : "";

    return `
Bạn là giảng viên chấm bài tập lập trình / CNTT.
Hãy chấm khách quan, chính xác, chỉ trả về JSON.

${studentBlock}============================================================
ĐỀ BÀI
============================================================
${topic || "(Không có đề bài)"}

============================================================
BÀI LÀM CỦA SINH VIÊN
============================================================
${answer}
${sampleSolutionBlock}
============================================================
TIÊU CHÍ CHẤM ĐIỂM (tổng 100%)
============================================================
1. Đúng logic       (50%) — Thuật toán/code đúng, không lỗi logic
2. Chất lượng code  (20%) — Clean, có comment, đặt tên biến/hàm tốt
3. Xử lý edge case  (20%) — Xử lý case biên: null, rỗng, âm, tràn số...
4. Trình bày        (10%) — Format rõ ràng, indent đúng, dễ đọc

============================================================
YÊU CẦU CHI TIẾT
============================================================
- Chỉ ra lỗi THẬT (nếu có): dòng code, mô tả lỗi, cách sửa
- KHÔNG bịa lỗi — nếu code đúng thì khen cụ thể
- Nhận xét thẳng thắn, chỉ rõ điểm mạnh và điểm yếu
- Nếu có lời giải mẫu: nêu các ý còn thiếu so với đáp án (KHÔNG chép đáp án)
- Điểm tối đa: ${maxScore}

============================================================
ĐẦU RA BẮT BUỘC — DUY NHẤT JSON
============================================================
Chỉ trả về 1 object JSON, KHÔNG markdown, KHÔNG code fence, KHÔNG text ngoài JSON:

{
  "score": 0,
  "feedback": "Nhận xét tổng quan, thẳng thắn, chỉ rõ lỗi và cách sửa",
  "breakdown": [
    {
      "criterion": "Đúng logic",
      "score": 0,
      "comment": "Nhận xét cụ thể cho tiêu chí này"
    },
    {
      "criterion": "Chất lượng code",
      "score": 0,
      "comment": "..."
    },
    {
      "criterion": "Xử lý edge case",
      "score": 0,
      "comment": "..."
    },
    {
      "criterion": "Trình bày",
      "score": 0,
      "comment": "..."
    }
  ],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
  "improvements": ["Gợi ý cải thiện 1", "Gợi ý 2", "Gợi ý 3"],
  "overall_comment": "Nhận xét tổng thể cuối cùng"
}

Quy tắc:
- Tất cả "score" phải là number (0 → ${maxScore})
- Tất cả array phải là array (có thể rỗng, KHÔNG để null)
- Không trả về field nào khác ngoài JSON trên
`;
}

// Alias tên cũ — để tương thích code cũ
const createWritingPrompt = createCodeGradingPrompt;

// ============================================================
// HELPERS
// ============================================================

function countWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(10, n));
}

function normalizeGradingResult(data, answer) {
    const d = data || {};
    return {
        score: safeNumber(d.score),
        wordCount: countWords(answer),
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
        breakdown: Array.isArray(d?.breakdown) ? d.breakdown : [],
    };
}

// Alias tên cũ
const normalizeWritingResult = normalizeGradingResult;

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
    const last = cleaned.lastIndexOf("}");
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
// GỌI GEMINI QUA SDK
// ============================================================

async function callGeminiViaSDK(prompt, model, apiKeyPlain, timeoutMs = 45000) {
    if (!GoogleGenAI) {
        throw new Error("SDK @google/genai chưa load được.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKeyPlain });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
            () => reject(new Error(`Gemini SDK timeout sau ${timeoutMs}ms`)),
            timeoutMs
        )
    );

    const callPromise = (async () => {
        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });

        let text = "";
        if (typeof response?.text === "string") {
            text = response.text;
        } else if (typeof response?.response?.text === "function") {
            text = response.response.text();
        } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        }

        if (!text) {
            throw new Error(
                "Gemini SDK không trả về text. Response: " +
                JSON.stringify(response).slice(0, 300)
            );
        }

        return text;
    })();

    return Promise.race([callPromise, timeoutPromise]);
}

// ============================================================
// GỌI GEMINI QUA FETCH
// ============================================================

async function callGeminiViaFetch(prompt, model, apiKeyPlain, timeoutMs = 45000) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKeyPlain
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data?.error?.message || `Gemini API lỗi (${response.status}).`;
            const err = new Error(errMsg);
            err.status = response.status;
            err.code = data?.error?.code;
            err.statusText = data?.error?.status;
            throw err;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
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
// GỌI TỔNG HỢP
// ============================================================

async function callGeminiGenerateContent(prompt, model, apiKeyPlain, timeoutMs = 45000) {
    if (!apiKeyPlain) {
        throw new Error("Thiếu API key để gọi Gemini.");
    }

    let sdkError = null;

    if (GoogleGenAI) {
        try {
            const text = await callGeminiViaSDK(prompt, model, apiKeyPlain, timeoutMs);
            return text;
        } catch (err) {
            sdkError = err;
            if (isOverloadError(err)) {
                console.warn(`⚠️ [aiService] SDK 503 (model=${model}), thử fetch fallback...`);
            } else {
                console.warn(
                    `⚠️ [aiService] SDK fail (${err.message.slice(0, 80)}), thử fetch fallback...`
                );
            }
        }
    }

    try {
        const text = await callGeminiViaFetch(prompt, model, apiKeyPlain, timeoutMs);
        return text;
    } catch (err) {
        if (isOverloadError(err)) {
            throw err;
        }

        console.error("❌ GEMINI ERROR (fetch):", err.message);
        if (sdkError && !isOverloadError(sdkError)) {
            console.error("   (SDK error trước đó:", sdkError.message, ")");
        }
        throw err;
    }
}

// ============================================================
// CALL VỚI KEY XOAY VÒNG
// ============================================================

async function callWithKeyRotation(promptText, model, timeoutMs, preferredKeyId = null) {
    const triedIds = [];
    let lastError = null;

    if (preferredKeyId) {
        try {
            const keyDoc = await findKeyById(preferredKeyId);
            if (keyDoc) {
                triedIds.push(keyDoc._id);
                const apiKeyPlain = decryptKey(keyDoc);

                try {
                    const text = await callGeminiGenerateContent(promptText, model, apiKeyPlain, timeoutMs);
                    await markKeyUsed(keyDoc);
                    return {
                        text,
                        keyUsed: { id: String(keyDoc._id), name: keyDoc.name || null }
                    };
                } catch (err) {
                    lastError = err;

                    if (isProjectDenied(err)) {
                        console.error(
                            `🚫 [aiService] Key "${keyDoc.name}" bị Google chặn: ${err.message}`
                        );
                        throw err;
                    }

                    if (isOverloadError(err)) {
                        throw err;
                    }

                    if (isQuotaError(err)) {
                        console.warn(
                            `⚠️ [aiService] key "${keyDoc.name}" hết quota, xoay key khác...`
                        );
                        await markKeyQuotaError(keyDoc);
                    } else {
                        throw err;
                    }
                }
            }
        } catch (e) {
            if (isOverloadError(e) || isProjectDenied(e)) {
                throw e;
            }
            console.warn("[aiService] preferred key failed:", e.message);
        }
    }

    for (let i = 0; i < MAX_KEYS_TO_TRY; i++) {
        const keyDoc = await findNextActiveKey(triedIds);

        if (!keyDoc) {
            if (triedIds.length === 0) {
                throw new Error(
                    "Không có AI Key nào đang hoạt động. Vui lòng thêm hoặc bật key trong Admin."
                );
            }
            break;
        }

        triedIds.push(keyDoc._id);

        let apiKeyPlain;
        try {
            apiKeyPlain = decryptKey(keyDoc);
        } catch (e) {
            console.error(
                `❌ [aiService] giải mã key ${keyDoc._id} thất bại:`,
                e.message
            );
            lastError = new Error("Giải mã AI Key thất bại: " + e.message);
            continue;
        }

        try {
            const text = await callGeminiGenerateContent(promptText, model, apiKeyPlain, timeoutMs);
            await markKeyUsed(keyDoc);
            return {
                text,
                keyUsed: { id: String(keyDoc._id), name: keyDoc.name || null }
            };
        } catch (err) {
            lastError = err;

            if (isProjectDenied(err)) {
                console.error(
                    `🚫 [aiService] Key "${keyDoc.name}" bị Google chặn: ${err.message}`
                );
                throw err;
            }

            if (isOverloadError(err)) {
                throw err;
            }

            if (isQuotaError(err)) {
                console.warn(
                    `⚠️ [aiService] key ${keyDoc._id} hết quota, xoay key khác...`
                );
                await markKeyQuotaError(keyDoc);
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error("Tất cả AI Key đều lỗi hoặc hết quota.");
}

// ============================================================
// ★ CHẤM BÀI VỚI PROMPT MẶC ĐỊNH (CNTT)
// ------------------------------------------------------------
// Signature mới hỗ trợ thêm: sampleSolution, studentName
// ============================================================

async function checkSubmissionByGemini(
    topic,
    answer,
    timeoutMs = 45000,
    model = null,
    preferredKeyId = null,
    options = {}
) {
    if (!answer || typeof answer !== "string" || !answer.trim()) {
        throw new Error("Bài làm đang trống.");
    }

    const selectedModel = getSafeModel(model);

    // ★ Dùng prompt chấm code CNTT (thay vì IELTS)
    const prompt = createCodeGradingPrompt(topic, answer, {
        sampleSolution: options.sampleSolution || "",
        studentName: options.studentName || "",
        maxScore: options.maxScore || 10
    });

    if (prompt.length > MAX_PROMPT_CHARS) {
        throw new Error("Bài làm quá dài. Vui lòng rút gọn.");
    }

    console.log(
        `🤖 [aiService] checkSubmission model=${selectedModel} keyId=${preferredKeyId || "auto"} len=${prompt.length}`
    );

    return retryOnOverload(
        async () => {
            const { text } = await callWithKeyRotation(
                prompt,
                selectedModel,
                timeoutMs,
                preferredKeyId
            );
            const parsed = parseGeminiJson(text);
            return normalizeGradingResult(parsed, answer);
        },
        `checkSubmission:${selectedModel}`
    );
}

// Alias tên cũ — để tương thích code cũ
const checkWritingByGemini = checkSubmissionByGemini;

// ============================================================
// CHẤM BÀI VỚI PROMPT TÙY CHỈNH
// ============================================================

async function runCustomPrompt(
    renderedPrompt,
    model = null,
    timeoutMs = 45000,
    preferredKeyId = null
) {
    if (!renderedPrompt || typeof renderedPrompt !== "string") {
        throw new Error("Prompt rỗng.");
    }
    if (renderedPrompt.length > MAX_PROMPT_CHARS) {
        throw new Error(`Prompt quá dài (>${MAX_PROMPT_CHARS} ký tự).`);
    }

    const selectedModel = getSafeModel(model);
    console.log(
        `🧪 [aiService] runCustomPrompt model=${selectedModel} keyId=${preferredKeyId || "auto"}`
    );

    return retryOnOverload(
        async () => {
            const { text } = await callWithKeyRotation(
                renderedPrompt,
                selectedModel,
                timeoutMs,
                preferredKeyId
            );

            try {
                return parseGeminiJson(text);
            } catch (_) {
                return { raw: text, score: null, feedback: text };
            }
        },
        `runCustomPrompt:${selectedModel}`
    );
}

// ============================================================
// CHẤM BÀI THẬT — có retry 503
// ============================================================

async function gradeSubmission(renderedPrompt, options = {}) {
    const {
        model = null,
        timeoutMs = 45000,
        preferredKeyId = null
    } = options;

    if (!renderedPrompt || typeof renderedPrompt !== "string") {
        throw new Error("Prompt rỗng.");
    }
    if (renderedPrompt.length > MAX_PROMPT_CHARS) {
        throw new Error(`Prompt quá dài (>${MAX_PROMPT_CHARS} ký tự).`);
    }

    const selectedModel = getSafeModel(model);
    const t0 = Date.now();

    console.log(
        `🧑‍🏫 [aiService] gradeSubmission model=${selectedModel} keyId=${preferredKeyId || "auto"} len=${renderedPrompt.length}`
    );

    const result = await retryOnOverload(
        async () => {
            const { text, keyUsed } = await callWithKeyRotation(
                renderedPrompt,
                selectedModel,
                timeoutMs,
                preferredKeyId
            );
            return { text, keyUsed };
        },
        `gradeSubmission:${selectedModel}`
    );

    const latencyMs = Date.now() - t0;

    let parsed;
    try {
        parsed = parseGeminiJson(result.text);
    } catch (_) {
        parsed = { score: null, feedback: result.text, breakdown: [] };
    }

    return {
        score: parsed?.score ?? null,
        feedback: parsed?.feedback ?? parsed?.overall_comment ?? "",
        breakdown: Array.isArray(parsed?.breakdown) ? parsed.breakdown : [],
        grammar: parsed?.grammar ?? null,
        sampleComparison: parsed?.sampleComparison ?? null,
        modelUsed: selectedModel,
        latencyMs,
        keyUsed: result.keyUsed || null,
        raw: parsed
    };
}

// ============================================================
// TEST KẾT NỐI — có retry 503
// ============================================================

async function testGeminiConnection(
    model = null,
    timeoutMs = 15000,
    preferredKeyId = null
) {
    const selectedModel = getSafeModel(model);

    const result = await retryOnOverload(
        async () => {
            const { text, keyUsed } = await callWithKeyRotation(
                "Reply only with the word OK.",
                selectedModel,
                timeoutMs,
                preferredKeyId
            );
            return { text, keyUsed };
        },
        `testConnection:${selectedModel}`
    );

    return {
        connected: true,
        model: selectedModel,
        response: (result.text || "").trim() || "OK",
        keyUsed: result.keyUsed
    };
}

module.exports = {
    // Tên mới (CNTT)
    checkSubmissionByGemini,
    createCodeGradingPrompt,
    normalizeGradingResult,

    // Tên cũ — alias để tương thích
    checkWritingByGemini,
    createWritingPrompt,
    normalizeWritingResult,

    // Chung
    runCustomPrompt,
    gradeSubmission,
    testGeminiConnection,
    parseGeminiJson,
    countWords,

    // Config
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel,
    getSafeModel,

    // Debug
    isOverloadError,
    retryOnOverload
};