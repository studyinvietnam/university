
// ============================================================
// GEMINI API - IELTS WRITING AI
// Gemini 3.6 Flash + Interactions API
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ============================================================
// MODELS
// ============================================================

const SUPPORTED_MODELS = [
    "gemini-3.6-flash",
];

const DEFAULT_MODEL = "gemini-3.6-flash";

// ============================================================
// VALIDATE API KEY
// ============================================================

function validateGeminiApiKey() {
    if (
        !GEMINI_API_KEY ||
        GEMINI_API_KEY === "1111" ||
        GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY"
    ) {
        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình."
        );
    }
}

// ============================================================
// SAFE MODEL
// ============================================================

function getSafeModel(model = null) {
    if (
        typeof model === "string" &&
        SUPPORTED_MODELS.includes(model)
    ) {
        return model;
    }

    return DEFAULT_MODEL;
}

// ============================================================
// PROMPT
// ============================================================

function createWritingPrompt(topic, essay) {
    return `
Bạn là một giáo viên tiếng Anh chuyên chấm IELTS Writing.

Hãy chấm bài viết một cách khách quan dựa trên:
- Đề bài
- Bài viết của học sinh
- Dàn ý hướng dẫn

============================================================
ĐỀ BÀI
============================================================

${topic || "(Không có đề bài được cung cấp)"}

============================================================
BÀI VIẾT CỦA HỌC SINH
============================================================

${essay}

============================================================
DÀN Ý HƯỚNG DẪN LÀM BÀI WRITING
============================================================

1. ĐỌC ĐỀ VÀ XÁC ĐỊNH YÊU CẦU

- Kiểm tra bài viết có đúng chủ đề không.
- Xác định các ý chính mà đề yêu cầu.
- Kiểm tra số lượng từ.
- Bài yêu cầu tối thiểu 80 từ.

2. LẬP DÀN Ý CƠ BẢN

Introduction:
- Có 1-2 câu giới thiệu chung về chủ đề.
- Giới thiệu trực tiếp và rõ ràng.

Body:
- Có khoảng 3-4 câu phát triển ý.
- Trả lời các câu hỏi gợi ý trong đề.
- Có các chi tiết cụ thể như:
  What / When / Where / Who
- Có thể bổ sung màu sắc, thời gian, đồ vật,
  hoạt động hoặc cảm xúc tùy chủ đề.

Conclusion:
- Có 1-2 câu kết.
- Thể hiện cảm xúc hoặc lý do thích/không thích nếu phù hợp.

3. NGÔN NGỮ

Kiểm tra:
- Thì của động từ.
- Chủ ngữ và động từ.
- Số ít / số nhiều.
- Mạo từ.
- Giới từ.
- Cách dùng từ.
- Dấu câu.
- Độ rõ ràng của câu.

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
- Mục tiêu: 80-100 từ.
- Khoảng 8-10 câu là phù hợp.

============================================================
TIÊU CHÍ CHẤM
============================================================

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
- Đưa ra 3-5 cách cải thiện cụ thể.

============================================================
JSON BẮT BUỘC
============================================================

Chỉ trả về một JSON object hợp lệ.

Không trả về Markdown.
Không sử dụng code fence.
Không thêm giải thích bên ngoài JSON.

Cấu trúc JSON:

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

============================================================
QUY TẮC BẮT BUỘC
============================================================

- Chỉ trả về JSON.
- Không Markdown.
- Không code fence.
- Không giải thích bên ngoài JSON.
- score phải là number từ 0 đến 10.
- Tất cả score phải là number.
- errors luôn là array.
- suggestions luôn là array.
- strengths luôn là array.
- weaknesses luôn là array.
- improvements luôn là array.
- wordCount phải là số từ thực tế của bài viết.
- Không tự bịa lỗi ngữ pháp.
- Chỉ ghi lỗi khi lỗi thực sự tồn tại trong bài.
- Không thay đổi nội dung bài viết một cách không cần thiết.
- Đánh giá công bằng với trình độ học sinh.
`;
}

// ============================================================
// WORD COUNT
// ============================================================

function countWords(text) {
    return String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

// ============================================================
// NORMALIZE RESULT
// ============================================================

function normalizeWritingResult(data, essay) {
    const wordCount = countWords(essay);

    const safeNumber = (value, fallback = 0) => {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return fallback;
        }

        return Math.max(0, Math.min(10, number));
    };

    return {
        score: safeNumber(data?.score),

        wordCount: countWords(essay),

        grammar: {
            score: safeNumber(
                data?.grammar?.score
            ),

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
                data?.vocabulary?.score
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
                data?.coherence?.score
            ),

            comment: String(
                data?.coherence?.comment ?? ""
            ),
        },

        content: {
            score: safeNumber(
                data?.content?.score
            ),

            comment: String(
                data?.content?.comment ?? ""
            ),
        },

        outline: {
            introduction: {
                score: safeNumber(
                    data?.outline?.introduction?.score
                ),

                comment: String(
                    data?.outline?.introduction?.comment ?? ""
                ),
            },

            body: {
                score: safeNumber(
                    data?.outline?.body?.score
                ),

                comment: String(
                    data?.outline?.body?.comment ?? ""
                ),
            },

            conclusion: {
                score: safeNumber(
                    data?.outline?.conclusion?.score
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

// ============================================================
// PARSE JSON
// ============================================================

function parseGeminiJson(text) {
    if (
        !text ||
        typeof text !== "string"
    ) {
        throw new Error(
            "Gemini không trả về nội dung JSON."
        );
    }

    let cleaned = text.trim();

    // Parse trực tiếp
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // Xóa Markdown fence nếu Gemini vẫn trả về
    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // Tìm JSON object
    const firstBrace =
        cleaned.indexOf("{");

    const lastBrace =
        cleaned.lastIndexOf("}");

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
            "❌ GEMINI RAW TEXT:"
        );

        console.error(text);

        throw new Error(
            "Gemini trả về JSON không hợp lệ."
        );
    }
}

// ============================================================
// EXTRACT INTERACTION TEXT
// ============================================================

function extractInteractionText(data) {
    // Trường hợp response có steps
    if (
        Array.isArray(data?.steps)
    ) {
        for (
            let i = data.steps.length - 1;
            i >= 0;
            i--
        ) {
            const step =
                data.steps[i];

            if (
                Array.isArray(
                    step?.content
                )
            ) {
                for (
                    let j =
                        step.content.length - 1;
                    j >= 0;
                    j--
                ) {
                    const item =
                        step.content[j];

                    if (
                        typeof item?.text ===
                        "string" &&
                        item.text.trim()
                    ) {
                        return item.text.trim();
                    }
                }
            }
        }
    }

    // Một số response có output trực tiếp
    if (
        typeof data?.output?.text ===
        "string"
    ) {
        return data.output.text.trim();
    }

    if (
        typeof data?.text ===
        "string"
    ) {
        return data.text.trim();
    }

    return "";
}

// ============================================================
// CALL GEMINI INTERACTIONS API
// ============================================================

async function callGeminiInteraction(
    prompt,
    model,
    timeoutMs
) {
    validateGeminiApiKey();

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {
            controller.abort();
        }, timeoutMs);

    try {
        const response =
            await fetch(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            GEMINI_API_KEY,
                    },

                    body: JSON.stringify({
                        model: model,

                        input: prompt,
                    }),

                    signal: controller.signal,
                }
            );

        let data;

        try {
            data =
                await response.json();
        } catch (_) {
            throw new Error(
                "Gemini trả về dữ liệu không hợp lệ."
            );
        }

        if (!response.ok) {
            console.error(
                "❌ GEMINI INTERACTIONS ERROR:"
            );

            console.error(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            throw new Error(
                data?.error?.message ||
                "Gemini Interactions API lỗi."
            );
        }

        return data;
    } catch (error) {
        if (
            error.name ===
            "AbortError"
        ) {
            throw new Error(
                `Gemini API không phản hồi sau ${timeoutMs / 1000} giây.`
            );
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ============================================================
// CHECK WRITING
// ============================================================

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

    const selectedModel =
        getSafeModel(model);

    console.log(
        "🤖 Gemini model:",
        selectedModel
    );

    const prompt =
        createWritingPrompt(
            topic,
            essay
        );

    if (
        prompt.length > 50000
    ) {
        throw new Error(
            "Bài viết quá dài. Vui lòng rút gọn."
        );
    }

    console.log("");
    console.log(
        "=========================================="
    );

    console.log(
        "🤖 ĐANG GỌI GEMINI INTERACTIONS API"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "Model:",
        selectedModel
    );

    console.log(
        "Prompt length:",
        prompt.length
    );

    console.log(
        "=========================================="
    );

    const data =
        await callGeminiInteraction(
            prompt,
            selectedModel,
            timeoutMs
        );

    console.log(
        "🆔 Interaction:",
        data?.id || "(không có)"
    );

    console.log(
        "📊 Status:",
        data?.status || "(không có)"
    );

    const text =
        extractInteractionText(
            data
        );

    if (!text) {
        console.error(
            "❌ GEMINI RESPONSE:"
        );

        console.error(
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
        "📥 Gemini text length:",
        text.length
    );

    const parsed =
        parseGeminiJson(text);

    return normalizeWritingResult(
        parsed,
        essay
    );
}

// ============================================================
// TEST GEMINI CONNECTION
// ============================================================

async function testGeminiConnection(
    model = null,
    timeoutMs = 15000
) {
    validateGeminiApiKey();

    const selectedModel =
        getSafeModel(model);

    console.log(
        "🔍 testGeminiConnection:",
        selectedModel
    );

    const data =
        await callGeminiInteraction(
            "Reply only with the word OK.",
            selectedModel,
            timeoutMs
        );

    const text =
        extractInteractionText(
            data
        );

    return {
        connected: true,

        model:
            selectedModel,

        response:
            text || "OK",

        interactionId:
            data?.id || null,
    };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    checkWritingByGemini,
    testGeminiConnection,
    createWritingPrompt,
    normalizeWritingResult,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    getSafeModel,
};

