// =============================================================
// GEMINI API - WRITING AI
// =============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-flash-latest";


// =============================================================
// TẠO PROMPT CHẤM WRITING
// =============================================================

function createWritingPrompt(essay, topic = "") {

    return `
Bạn là một giáo viên chấm bài viết tiếng Anh.

Nhiệm vụ:

- Đọc bài viết do học sinh gửi.
- Đánh giá chất lượng bài viết một cách khách quan.
- Chỉ dựa trên nội dung bài viết được cung cấp.
- Không tự bịa thêm thông tin.
- Nhận xét dễ hiểu, phù hợp với học sinh.

=============================================================
ĐỀ BÀI
=============================================================

${topic}

=============================================================
DÀN Ý HƯỚNG DẪN LÀM BÀI WRITING
=============================================================

1. ĐỌC ĐỀ VÀ XÁC ĐỊNH YÊU CẦU

- Xác định đúng chủ đề.
- Xác định các từ khóa quan trọng trong đề.
- Kiểm tra số lượng từ.
- Bài yêu cầu tối thiểu 80 từ.

2. LẬP DÀN Ý CƠ BẢN

Bài viết nên có 3 phần:

Introduction – Body – Conclusion

2.1. INTRODUCTION

- Viết 1–2 câu giới thiệu chung theo đề bài.
- Giới thiệu đúng chủ đề.

2.2. BODY

- Viết khoảng 3–4 câu phát triển ý.
- Trả lời các câu hỏi gợi ý trong đề.
- Có thể sử dụng:
  What / When / Where / Who
- Bổ sung các chi tiết:
  màu sắc, thời gian, đồ vật, hoạt động, cảm xúc...

2.3. CONCLUSION

- Viết 1–2 câu kết đoạn.
- Nêu cảm xúc hoặc lý do thích/không thích.

3. LƯU Ý NGÔN NGỮ

- Sử dụng thì chính xác.
- Với bài mô tả thói quen, ưu tiên Present Simple.
- Sử dụng từ nối phù hợp.

Ví dụ:

First,
Then,
After that,
Sometimes,
In the morning,
In the evening,
Because,
So,

- Câu nên rõ ràng, đơn giản và dễ hiểu.
- Mục tiêu khoảng 80–100 từ.
- Khoảng 8–10 câu là phù hợp.

4. CHECKLIST

Kiểm tra:

- Có Introduction không?
- Có Body không?
- Có Conclusion không?
- Có đủ ít nhất 80 từ không?
- Có đúng chủ đề không?
- Có trả lời các ý chính của đề không?
- Thì có chính xác không?
- Có sử dụng từ nối không?
- Các câu có liên kết với nhau không?

=============================================================
TIÊU CHÍ CHẤM
=============================================================

1. Grammar

- Kiểm tra lỗi ngữ pháp.
- Chỉ ra lỗi quan trọng.
- Đưa ra cách sửa.
- Không cố tạo lỗi nếu bài không có lỗi.

2. Vocabulary

- Đánh giá độ đa dạng và chính xác.
- Kiểm tra cách dùng từ.
- Gợi ý từ/cụm từ tốt hơn nếu cần.

3. Coherence & Cohesion

- Kiểm tra cách triển khai ý.
- Kiểm tra sự liên kết giữa các câu.
- Kiểm tra bố cục Introduction – Body – Conclusion.
- Kiểm tra cách sử dụng từ nối.

4. Content

- Kiểm tra bài viết có trả lời đúng đề không.
- Kiểm tra mức độ phát triển ý.
- Kiểm tra các ý còn thiếu.

5. Outline

Kiểm tra riêng:

- Introduction
- Body
- Conclusion

Đánh giá xem học sinh có thực sự triển khai đủ 3 phần hay không.

6. Overall

- Đưa ra điểm tổng quan trên thang 10.
- Nhận xét ưu điểm.
- Nhận xét điểm cần cải thiện.
- Đưa ra 3–5 gợi ý cụ thể.

=============================================================
BÀI VIẾT CỦA HỌC SINH
=============================================================

"""
${essay}
"""

=============================================================
TRẢ KẾT QUẢ THEO JSON
=============================================================

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

- Chỉ trả về JSON hợp lệ.
- Không thêm Markdown.
- Không thêm \`\`\`json.
- Không thêm lời giải thích bên ngoài JSON.

- score từ 0 đến 10.
- grammar.score từ 0 đến 10.
- vocabulary.score từ 0 đến 10.
- coherence.score từ 0 đến 10.
- content.score từ 0 đến 10.

- outline.introduction.score từ 0 đến 10.
- outline.body.score từ 0 đến 10.
- outline.conclusion.score từ 0 đến 10.

- errors luôn là array.
- suggestions luôn là array.
- strengths luôn là array.
- weaknesses luôn là array.
- improvements luôn là array.

- wordCount phải là số nguyên.

- Không tự bịa lỗi ngữ pháp.
- Nếu không có lỗi thì errors phải là [].
`;

}


// =============================================================
// GỌI GEMINI API
// =============================================================

async function checkWritingByGemini(essay, topic = "") {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "Chưa cấu hình GEMINI_API_KEY trong file .env."
        );

    }


    if (!essay || !essay.trim()) {

        throw new Error(
            "Bài viết không được để trống."
        );

    }


    const prompt =
        createWritingPrompt(
            essay,
            topic
        );


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


    let response;


    try {

        response = await fetch(
            url,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "X-goog-api-key":
                        GEMINI_API_KEY

                },

                body: JSON.stringify({

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text: prompt

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
            "Gemini connection error:",
            error
        );

        throw new Error(
            "Không thể kết nối đến Gemini API."
        );

    }


    let data;


    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            "Gemini trả về dữ liệu không hợp lệ."
        );

    }


    // =========================================================
    // GEMINI ERROR
    // =========================================================

    if (!response.ok) {

        console.error(
            "Gemini API Error:",
            data
        );


        const message =
            data?.error?.message ||
            "Gemini API không thể xử lý yêu cầu.";


        throw new Error(message);

    }


    // =========================================================
    // LẤY TEXT
    // =========================================================

    const text =
        data
            ?.candidates
            ?.[0]
            ?.content
            ?.parts
            ?.[0]
            ?.text;


    if (!text) {

        console.error(
            "Gemini response:",
            data
        );


        throw new Error(
            "Gemini không trả về kết quả chấm bài."
        );

    }


    // =========================================================
    // PARSE JSON
    // =========================================================

    let result;


    try {

        result =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "JSON Gemini:",
            text
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

            throw new Error(
                "Gemini trả về JSON không hợp lệ."
            );

        }

    }


    return normalizeWritingResult(
        result,
        essay
    );

}


// =============================================================
// CHUẨN HÓA RESULT
// =============================================================

function normalizeWritingResult(
    data,
    essay
) {

    const wordCount =
        essay
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;


    return {

        score:
            normalizeScore(
                data?.score
            ),


        wordCount:
            Number(
                data?.wordCount ??
                wordCount
            ),


        grammar: {

            score:
                normalizeScore(
                    data?.grammar?.score
                ),

            comment:
                String(
                    data?.grammar?.comment ??
                    ""
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
                normalizeScore(
                    data?.vocabulary?.score
                ),

            comment:
                String(
                    data?.vocabulary?.comment ??
                    ""
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
                normalizeScore(
                    data?.coherence?.score
                ),

            comment:
                String(
                    data?.coherence?.comment ??
                    ""
                )

        },


        content: {

            score:
                normalizeScore(
                    data?.content?.score
                ),

            comment:
                String(
                    data?.content?.comment ??
                    ""
                )

        },


        outline: {

            introduction: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.introduction
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.introduction
                            ?.comment ??
                        ""
                    )

            },


            body: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.body
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.body
                            ?.comment ??
                        ""
                    )

            },


            conclusion: {

                score:
                    normalizeScore(
                        data
                            ?.outline
                            ?.conclusion
                            ?.score
                    ),

                comment:
                    String(
                        data
                            ?.outline
                            ?.conclusion
                            ?.comment ??
                        ""
                    )

            }

        },


        strengths:
            normalizeArray(
                data?.strengths
            ),


        weaknesses:
            normalizeArray(
                data?.weaknesses
            ),


        improvements:
            normalizeArray(
                data?.improvements
            ),


        overall_comment:
            String(
                data?.overall_comment ??
                ""
            )

    };

}


// =============================================================
// SCORE
// =============================================================

function normalizeScore(value) {

    const score =
        Number(value);


    if (
        Number.isNaN(score)
    ) {

        return 0;

    }


    return Math.min(
        10,
        Math.max(
            0,
            score
        )
    );

}


// =============================================================
// ARRAY
// =============================================================

function normalizeArray(value) {

    return Array.isArray(value)
        ? value.map(item =>
            String(item)
        )
        : [];

}


// =============================================================
// EXPORT
// =============================================================

module.exports = {

    checkWritingByGemini

};