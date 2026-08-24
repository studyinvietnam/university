// =============================================================
// GEMINI API - BÀI VIẾT WRITING
// =============================================================

// ⚠️ KHÔNG ĐƯA FILE NÀY LÊN FRONTEND
// API KEY phải nằm ở backend.
//
// Thay 1111 bằng API key thật của bạn.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model Gemini
const GEMINI_MODEL = "gemini-2.5-flash";


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

${topic}

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
Kiểm tra riêng:

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
`;
}


// =============================================================
// CHUẨN HÓA RESULT
// =============================================================

function normalizeWritingResult(data, essay) {

    const wordCount =
        String(essay || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;


    return {

        score:
            Number(data?.score ?? 0),


        wordCount:
            Number(
                data?.wordCount ??
                wordCount
            ),


        grammar: {

            score:
                Number(
                    data?.grammar?.score ?? 0
                ),

            comment:
                String(
                    data?.grammar?.comment ?? ""
                ),

            errors:
                Array.isArray(
                    data?.grammar?.errors
                )
                    ? data.grammar.errors
                    : []

        },


        vocabulary: {

            score:
                Number(
                    data?.vocabulary?.score ?? 0
                ),

            comment:
                String(
                    data?.vocabulary?.comment ?? ""
                ),

            suggestions:
                Array.isArray(
                    data?.vocabulary?.suggestions
                )
                    ? data.vocabulary.suggestions
                    : []

        },


        coherence: {

            score:
                Number(
                    data?.coherence?.score ?? 0
                ),

            comment:
                String(
                    data?.coherence?.comment ?? ""
                )

        },


        content: {

            score:
                Number(
                    data?.content?.score ?? 0
                ),

            comment:
                String(
                    data?.content?.comment ?? ""
                )

        },


        outline: {

            introduction: {

                score:
                    Number(
                        data?.outline
                            ?.introduction
                            ?.score ?? 0
                    ),

                comment:
                    String(
                        data?.outline
                            ?.introduction
                            ?.comment ?? ""
                    )

            },


            body: {

                score:
                    Number(
                        data?.outline
                            ?.body
                            ?.score ?? 0
                    ),

                comment:
                    String(
                        data?.outline
                            ?.body
                            ?.comment ?? ""
                    )

            },


            conclusion: {

                score:
                    Number(
                        data?.outline
                            ?.conclusion
                            ?.score ?? 0
                    ),

                comment:
                    String(
                        data?.outline
                            ?.conclusion
                            ?.comment ?? ""
                    )

            }

        },


        strengths:
            Array.isArray(data?.strengths)
                ? data.strengths
                : [],


        weaknesses:
            Array.isArray(data?.weaknesses)
                ? data.weaknesses
                : [],


        improvements:
            Array.isArray(data?.improvements)
                ? data.improvements
                : [],


        overall_comment:
            String(
                data?.overall_comment ?? ""
            )

    };

}


// =============================================================
// GỌI GEMINI API
// =============================================================

async function checkWritingByGemini(
    topic,
    essay
) {

    // ---------------------------------------------------------
    // CHECK API KEY
    // ---------------------------------------------------------

    if (
        !GEMINI_API_KEY ||
        GEMINI_API_KEY === "1111" ||
        GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY"
    ) {

        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình."
        );

    }


    if (!essay || !essay.trim()) {

        throw new Error(
            "Bài viết đang trống."
        );

    }


    // ---------------------------------------------------------
    // TẠO PROMPT
    // ---------------------------------------------------------

    const prompt =
        createWritingPrompt(
            topic,
            essay
        );


    // ---------------------------------------------------------
    // URL GEMINI
    // ---------------------------------------------------------

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;


    console.log("");
    console.log(
        "=========================================="
    );

    console.log(
        "🤖 ĐANG GỌI GEMINI"
    );

    console.log(
        "Model:",
        GEMINI_MODEL
    );

    console.log(
        "=========================================="
    );


    // ---------------------------------------------------------
    // REQUEST
    // ---------------------------------------------------------

    let response;

    try {

        response =
            await fetch(
                url,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        contents: [

                            {

                                role: "user",

                                parts: [

                                    {

                                        text:
                                            prompt

                                    }

                                ]

                            }

                        ],

                        generationConfig: {

                            temperature: 0.2,

                            responseMimeType:
                                "application/json"

                        }

                    })

                }
            );

    } catch (error) {

        console.error(
            "❌ FETCH GEMINI ERROR:",
            error
        );

        throw new Error(
            "Không thể kết nối tới Gemini API."
        );

    }


    // ---------------------------------------------------------
    // ĐỌC RESPONSE
    // ---------------------------------------------------------

    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        console.error(
            "❌ GEMINI JSON ERROR:",
            error
        );

        throw new Error(
            "Gemini trả về dữ liệu không hợp lệ."
        );

    }


    // ---------------------------------------------------------
    // API ERROR
    // ---------------------------------------------------------

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
            data
                ?.error
                ?.message ||
            "Gemini API không thể xử lý yêu cầu.";


        throw new Error(message);

    }


    // ---------------------------------------------------------
    // LẤY TEXT
    // ---------------------------------------------------------

    const text =
        data
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;


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


    // ---------------------------------------------------------
    // PARSE JSON
    // ---------------------------------------------------------

    let result;

    try {

        result =
            JSON.parse(text);

    } catch (error) {

        console.warn(
            "⚠️ Gemini trả về JSON có Markdown."
        );


        const cleaned =
            text
                .replace(
                    /^```json\s*/i,
                    ""
                )
                .replace(
                    /^```\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/i,
                    ""
                )
                .trim();


        try {

            result =
                JSON.parse(cleaned);

        } catch (secondError) {

            console.error(
                "❌ GEMINI RAW RESPONSE:"
            );

            console.error(text);


            throw new Error(
                "Gemini trả về JSON không hợp lệ."
            );

        }

    }


    // ---------------------------------------------------------
    // NORMALIZE
    // ---------------------------------------------------------

    return normalizeWritingResult(
        result,
        essay
    );

}


// =============================================================
// TEST GEMINI CONNECTION
// =============================================================

async function testGeminiConnection() {

    if (
        !GEMINI_API_KEY ||
        GEMINI_API_KEY === "1111" ||
        GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY"
    ) {

        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình."
        );

    }


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;


    const response =
        await fetch(
            url,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text:
                                        "Reply only with the word OK."

                                }

                            ]

                        }

                    ],

                    generationConfig: {

                        temperature: 0

                    }

                })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "Gemini API chưa kết nối."
        );

    }


    const text =
        data
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;


    if (!text) {

        throw new Error(
            "Gemini không trả về dữ liệu."
        );

    }


    return {

        connected: true,

        model: GEMINI_MODEL,

        response: text.trim()

    };

}


// =============================================================
// EXPORT
// =============================================================

module.exports = {

    checkWritingByGemini,

    testGeminiConnection,

    createWritingPrompt,

    normalizeWritingResult

};