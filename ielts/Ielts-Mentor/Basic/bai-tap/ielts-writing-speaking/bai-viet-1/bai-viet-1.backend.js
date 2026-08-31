
// =============================================================
// GEMINI API - BÀI VIẾT WRITING
// IELTS WRITING AI
// Gemini 3.6 Flash + Interactions API
// =============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// =============================================================
// DANH SÁCH MODEL GEMINI
// =============================================================

const SUPPORTED_MODELS = [
    "gemini-3.6-flash",
];

// Model mặc định
const DEFAULT_MODEL = "gemini-3.6-flash";

// =============================================================
// KIỂM TRA API KEY
// =============================================================

function validateGeminiApiKey() {
    if (
        !GEMINI_API_KEY ||
        GEMINI_API_KEY === "1111" ||
        GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY"
    ) {
        throw new Error("GEMINI_API_KEY chưa được cấu hình.");
    }
}

// =============================================================
// CHỌN MODEL AN TOÀN
// =============================================================

function getSafeModel(model = null) {
    if (
        typeof model === "string" &&
        SUPPORTED_MODELS.includes(model)
    ) {
        return model;
    }

    return DEFAULT_MODEL;
}

// =============================================================
// TẠO PROMPT CHẤM WRITING
// =============================================================

function createWritingPrompt(topic, essay) {
    return `
Bạn là một giáo viên tiếng Anh chấm bài Writing cho học sinh.

Hãy chấm bài một cách khách quan và chỉ dựa trên:
- Đề bài
- Bài viết của học sinh
- Dàn ý hướng dẫn bên dưới

=============================================================
ĐỀ BÀI
=============================================================

${topic || "(Không có đề bài được cung cấp)"}

=============================================================
BÀI VIẾT CỦA HỌC SINH
=============================================================

"""
${essay}
"""

=============================================================
DÀN Ý GTBS - HƯỚNG DẪN LÀM BÀI WRITING
=============================================================

1. ĐỌC ĐỀ VÀ XÁC ĐỊNH YÊU CẦU

- Kiểm tra bài viết có đúng chủ đề không.
- Xác định các ý chính mà đề yêu cầu.
- Kiểm tra số lượng từ.
- Bài yêu cầu tối thiểu 80 từ.

2. LẬP DÀN Ý CƠ BẢN

Introduction:
- Có 1–2 câu giới thiệu chung về chủ đề.
- Giới thiệu trực tiếp và rõ ràng.

Body:
- Có khoảng 3–4 câu phát triển ý.
- Trả lời các câu hỏi gợi ý trong đề.
- Có các chi tiết cụ thể như:
  What / When / Where / Who
- Có thể bổ sung màu sắc, thời gian, đồ vật,
  hoạt động hoặc cảm xúc tùy chủ đề.

Conclusion:
- Có 1–2 câu kết.
- Thể hiện cảm xúc hoặc lý do thích/không thích
  nếu phù hợp với đề.

3. LƯU Ý NGÔN NGỮ

- Kiểm tra thì của động từ.
- Với thói quen thường xuyên, ưu tiên Present Simple.
- Kiểm tra chủ ngữ và động từ.
- Kiểm tra số ít / số nhiều.
- Kiểm tra mạo từ.
- Kiểm tra giới từ.
- Kiểm tra cách dùng từ.
- Kiểm tra dấu câu.
- Kiểm tra câu có rõ ràng hay không.

4. TỪ NỐI

Kiểm tra việc sử dụng các từ nối phù hợp như:

First,
Then,
After that,
Sometimes,
In the morning,
In the afternoon,
In the evening,
Because,
So,
Finally.

Không bắt buộc phải sử dụng tất cả.

5. ĐỘ DÀI

- Tối thiểu: 80 từ.
- Mục tiêu: 80–100 từ.
- Khoảng 8–10 câu là phù hợp.

=============================================================
TIÊU CHÍ CHẤM
=============================================================

1. Grammar
- Độ chính xác ngữ pháp.
- Chỉ ra lỗi thực sự tồn tại.
- Đưa ra câu sửa.
- Không tự tạo lỗi.
- Không đánh dấu một câu đúng thành câu sai.

2. Vocabulary
- Độ đa dạng.
- Độ chính xác.
- Cách sử dụng từ.
- Gợi ý từ/cụm từ tốt hơn nếu cần.

3. Coherence & Cohesion
- Bố cục.
- Trình tự ý tưởng.
- Từ nối.
- Sự liên kết giữa các câu.

4. Content
- Có trả lời đúng đề không.
- Có đủ các ý chính không.
- Ý tưởng có được phát triển không.
- Có chi tiết cụ thể không.

5. Outline

Introduction:
- Có mở đoạn phù hợp không?

Body:
- Có phát triển ý không?
- Có trả lời câu hỏi gợi ý không?

Conclusion:
- Có kết đoạn không?
- Có cảm xúc hoặc lý do phù hợp không?

6. Overall
- Điểm tổng thể từ 0 đến 10.
- Nêu điểm mạnh.
- Nêu điểm yếu.
- Đưa ra 3–5 cách cải thiện cụ thể.

=============================================================
JSON BẮT BUỘC
=============================================================

Chỉ trả về JSON hợp lệ.

{
    "score": 0,
    "wordCount": 0,

    "grammar": {
        "score": 0,
        "comment": "",
        "errors": [
            {
                "original": "",
                "corrected": "",
                "explanation": ""
            }
        ]
    },

    "vocabulary": {
        "score": 0,
        "comment": "",
        "suggestions": []
    },

    "coherence": {
        "score": 0,
        "comment": ""
    },

    "content": {
        "score": 0,
        "comment": ""
    },

    "outline": {
        "introduction": {
            "score": 0,
            "comment": ""
        },
        "body": {
            "score": 0,
            "comment": ""
        },
        "conclusion": {
            "score": 0,
            "comment": ""
        }
    },

    "strengths": [],
    "weaknesses": [],
    "improvements": [],

    "overall_comment": ""
}

=============================================================
QUY TẮC BẮT BUỘC
=============================================================

- Chỉ trả về JSON.
- Không Markdown.
- Không \`\`\`json.
- Không giải thích bên ngoài JSON.
- score từ 0 đến 10.
- Tất cả score phải là number.
- errors luôn là array.
- suggestions luôn là array.
- strengths luôn là array.
- weaknesses luôn là array.
- improvements luôn là array.
- wordCount phải là số từ thực tế của bài viết.
- Không được tự bịa lỗi ngữ pháp.
- Chỉ ghi lỗi khi lỗi thực sự tồn tại trong bài.
- Không thay đổi nội dung bài viết một cách không cần thiết.
- Đánh giá công bằng với trình độ học sinh.
`;
}

// =============================================================
// CHUẨN HÓA RESULT
// =============================================================

function normalizeWritingResult(data, essay) {
    const wordCount = String(essay || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;

    const safeNumber = (value, fallback = 0) => {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return number;
    };

    return {
        score: safeNumber(data?.score, 0),

        wordCount: wordCount,

        grammar: {
            score: safeNumber(data?.grammar?.score, 0),

            comment: String(
                data?.grammar?.comment ?? ""
            ),

            errors: Array.isArray(
                data?.grammar?.errors
            )
                ? data.grammar.errors
                : [],
        },

        vocabulary: {
            score: safeNumber(
                data?.vocabulary?.score,
                0
            ),

            comment: String(
                data?.vocabulary?.comment ?? ""
            ),

            suggestions: Array.isArray(
                data?.vocabulary?.suggestions
            )
                ? data.vocabulary.suggestions
                : [],
        },

        coherence: {
            score: safeNumber(
                data?.coherence?.score,
                0
            ),

            comment: String(
                data?.coherence?.comment ?? ""
            ),
        },

        content: {
            score: safeNumber(
                data?.content?.score,
                0
            ),

            comment: String(
                data?.content?.comment ?? ""
            ),
        },

        outline: {
            introduction: {
                score: safeNumber(
                    data?.outline?.introduction?.score,
                    0
                ),

                comment: String(
                    data?.outline?.introduction?.comment ?? ""
                ),
            },

            body: {
                score: safeNumber(
                    data?.outline?.body?.score,
                    0
                ),

                comment: String(
                    data?.outline?.body?.comment ?? ""
                ),
            },

            conclusion: {
                score: safeNumber(
                    data?.outline?.conclusion?.score,
                    0
                ),

                comment: String(
                    data?.outline?.conclusion?.comment ?? ""
                ),
            },
        },

        strengths: Array.isArray(data?.strengths)
            ? data.strengths
            : [],

        weaknesses: Array.isArray(data?.weaknesses)
            ? data.weaknesses
            : [],

        improvements: Array.isArray(data?.improvements)
            ? data.improvements
            : [],

        overall_comment: String(
            data?.overall_comment ?? ""
        ),
    };
}

// =============================================================
// PARSE GEMINI JSON
// =============================================================

function parseGeminiJson(text) {
    if (!text || typeof text !== "string") {
        throw new Error(
            "Gemini không trả về nội dung JSON."
        );
    }

    // Parse trực tiếp
    try {
        return JSON.parse(text.trim());
    } catch (_) {
        // Tiếp tục làm sạch
    }

    console.warn(
        "⚠️ Gemini trả về JSON có Markdown hoặc định dạng lạ. Đang làm sạch..."
    );

    let cleaned = text.trim();

    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        lastBrace > firstBrace
    ) {
        cleaned = cleaned.substring(
            firstBrace,
            lastBrace + 1
        );
    }

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        console.error(
            "❌ GEMINI RAW RESPONSE:",
            text
        );

        throw new Error(
            "Gemini trả về JSON không hợp lệ."
        );
    }
}

// =============================================================
// LẤY TEXT TỪ INTERACTION RESPONSE
// =============================================================

function extractInteractionText(data) {
    if (!data || !Array.isArray(data.steps)) {
        return "";
    }

    // Tìm step model_output
    for (const step of data.steps) {
        if (
            step?.type !== "model_output" ||
            !Array.isArray(step.content)
        ) {
            continue;
        }

        for (const content of step.content) {
            if (
                content?.type === "text" &&
                typeof content.text === "string"
            ) {
                return content.text;
            }
        }
    }

    return "";
}

// =============================================================
// GỌI GEMINI INTERACTIONS API
// =============================================================

async function checkWritingByGemini(
    topic,
    essay,
    timeoutMs = 45000,
    model = null
) {
    validateGeminiApiKey();

    if (
        !essay ||
        typeof essay !== "string" ||
        !essay.trim()
    ) {
        throw new Error(
            "Bài viết đang trống."
        );
    }

    const selectedModel = getSafeModel(model);

    console.log(
        `📌 Using model: ${selectedModel}`
    );

    const prompt = createWritingPrompt(
        topic,
        essay
    );

    if (prompt.length > 50000) {
        throw new Error(
            "Bài viết quá dài (trên 50.000 ký tự). Vui lòng rút gọn."
        );
    }

    // =========================================================
    // INTERACTIONS API
    // =========================================================

    const url =
        "https://generativelanguage.googleapis.com/v1beta/interactions";

    console.log("");
    console.log("==========================================");
    console.log("🤖 ĐANG GỌI GEMINI");
    console.log("==========================================");
    console.log("API: Interactions API");
    console.log("API Version: v1beta");
    console.log("Model:", selectedModel);
    console.log("Prompt length:", prompt.length);
    console.log("==========================================");

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    let response;

    try {
        response = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },

            body: JSON.stringify({
                model: selectedModel,

                input: prompt,

                response_format: {
                    type: "text",
                    mime_type: "application/json",

                    schema: {
                        type: "object",

                        properties: {
                            score: {
                                type: "number",
                            },

                            wordCount: {
                                type: "number",
                            },

                            grammar: {
                                type: "object",
                                properties: {
                                    score: {
                                        type: "number",
                                    },

                                    comment: {
                                        type: "string",
                                    },

                                    errors: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                original: {
                                                    type: "string",
                                                },

                                                corrected: {
                                                    type: "string",
                                                },

                                                explanation: {
                                                    type: "string",
                                                },
                                            },
                                        },
                                    },
                                },
                            },

                            vocabulary: {
                                type: "object",
                                properties: {
                                    score: {
                                        type: "number",
                                    },

                                    comment: {
                                        type: "string",
                                    },

                                    suggestions: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                        },
                                    },
                                },
                            },

                            coherence: {
                                type: "object",
                                properties: {
                                    score: {
                                        type: "number",
                                    },

                                    comment: {
                                        type: "string",
                                    },
                                },
                            },

                            content: {
                                type: "object",
                                properties: {
                                    score: {
                                        type: "number",
                                    },

                                    comment: {
                                        type: "string",
                                    },
                                },
                            },

                            outline: {
                                type: "object",
                                properties: {
                                    introduction: {
                                        type: "object",
                                        properties: {
                                            score: {
                                                type: "number",
                                            },

                                            comment: {
                                                type: "string",
                                            },
                                        },
                                    },

                                    body: {
                                        type: "object",
                                        properties: {
                                            score: {
                                                type: "number",
                                            },

                                            comment: {
                                                type: "string",
                                            },
                                        },
                                    },

                                    conclusion: {
                                        type: "object",
                                        properties: {
                                            score: {
                                                type: "number",
                                            },

                                            comment: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },

                            strengths: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                            },

                            weaknesses: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                            },

                            improvements: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                            },

                            overall_comment: {
                                type: "string",
                            },
                        },
                    },
                },
            }),

            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                `Gemini API không phản hồi sau ${timeoutMs / 1000} giây.`
            );
        }

        console.error(
            "❌ FETCH GEMINI ERROR:",
            error
        );

        throw new Error(
            "Không thể kết nối tới Gemini API."
        );
    } finally {
        clearTimeout(timeoutId);
    }

    // =========================================================
    // ĐỌC RESPONSE
    // =========================================================

    let data;

    try {
        data = await response.json();
    } catch (error) {
        console.error(
            "❌ GEMINI JSON ERROR:",
            error
        );

        throw new Error(
            "Gemini trả về dữ liệu không hợp lệ."
        );
    }

    // =========================================================
    // API ERROR
    // =========================================================

    if (!response.ok) {
        console.error(
            "❌ GEMINI API ERROR:"
        );

        console.error(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        const message =
            data?.error?.message ||
            "Gemini API không thể xử lý yêu cầu.";

        throw new Error(message);
    }

    // =========================================================
    // KIỂM TRA STATUS
    // =========================================================

    if (
        data?.status &&
        data.status !== "completed"
    ) {
        console.error(
            "❌ GEMINI INTERACTION STATUS:",
            data.status
        );

        throw new Error(
            `Gemini chưa hoàn thành yêu cầu. Status: ${data.status}`
        );
    }

    // =========================================================
    // LẤY TEXT
    // =========================================================

    const text = extractInteractionText(data);

    if (!text) {
        console.error(
            "❌ GEMINI RESPONSE:",
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            "Gemini không trả về kết quả chấm bài."
        );
    }

    console.log(
        "✅ Gemini trả về kết quả."
    );

    // =========================================================
    // PARSE JSON
    // =========================================================

    const result = parseGeminiJson(text);

    // =========================================================
    // NORMALIZE
    // =========================================================

    return normalizeWritingResult(
        result,
        essay
    );
}

// =============================================================
// TEST GEMINI CONNECTION
// =============================================================

async function testGeminiConnection(
    model = null,
    timeoutMs = 10000
) {
    validateGeminiApiKey();

    const selectedModel =
        getSafeModel(model);

    console.log(
        "🔍 testGeminiConnection with model:",
        selectedModel
    );

    const url =
        "https://generativelanguage.googleapis.com/v1beta/interactions";

    const controller =
        new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    let response;

    try {
        response = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },

            body: JSON.stringify({
                model: selectedModel,

                input: "Reply only with the word OK.",
            }),

            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                `Gemini API không phản hồi sau ${timeoutMs / 1000} giây.`
            );
        }

        console.error(
            "❌ GEMINI CONNECTION ERROR:",
            error
        );

        throw new Error(
            "Không thể kết nối tới Gemini API."
        );
    } finally {
        clearTimeout(timeoutId);
    }

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(
            "Gemini trả về dữ liệu không hợp lệ."
        );
    }

    if (!response.ok) {
        console.error(
            "❌ GEMINI STATUS ERROR:",
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            data?.error?.message ||
            "Gemini API chưa kết nối."
        );
    }

    const text =
        extractInteractionText(data);

    if (!text) {
        console.error(
            "❌ GEMINI TEST RESPONSE:",
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            "Gemini không trả về dữ liệu."
        );
    }

    return {
        connected: true,
        model: selectedModel,
        response: text.trim(),
        interactionId: data?.id || null,
        status: data?.status || null,
    };
}

// =============================================================
// EXPORT
// =============================================================

module.exports = {
    checkWritingByGemini,
    testGeminiConnection,
    createWritingPrompt,
    normalizeWritingResult,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    getSafeModel,
};

