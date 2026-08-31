
// ============================================================
// IELTS WRITING AI - BACKEND
// Express + Vercel + Render
// ============================================================

require("dotenv").config();

const express = require("express");
const path = require("path");


// ============================================================
// APP
// ============================================================

const app = express();


// ============================================================
// ENVIRONMENT
// ============================================================

const IS_VERCEL =
    Boolean(process.env.VERCEL);

const IS_RENDER =
    Boolean(process.env.RENDER);


// ============================================================
// BASE PATH
// ============================================================
//
// Render:
//
// /ielts/Ielts-Mentor/Basic/bai-tap/ielts-writing-speaking/bai-viet-1
//
// Vercel:
//
// /

const BASE_PATH =
    IS_VERCEL
        ? ""
        : "/ielts/Ielts-Mentor/Basic/bai-tap/ielts-writing-speaking/bai-viet-1";


// ============================================================
// PORT
// ============================================================

const PORT =
    process.env.PORT || 3001;


// ============================================================
// GEMINI
// ============================================================

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY?.trim();

const GEMINI_MODEL =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.6-flash";

const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


// ============================================================
// PATH
// ============================================================

const ROOT_DIR =
    __dirname;

const INDEX_PATH =
    path.join(
        ROOT_DIR,
        "index.html"
    );


// ============================================================
// LOG STARTUP
// ============================================================

console.log("");

console.log("========================================");
console.log("🚀 IELTS WRITING AI BACKEND");
console.log("========================================");

console.log(
    "📁 ROOT:",
    ROOT_DIR
);

console.log(
    "📄 INDEX:",
    INDEX_PATH
);

console.log(
    "🌐 PORT:",
    PORT
);

console.log(
    "☁️ VERCEL:",
    IS_VERCEL ? "YES" : "NO"
);

console.log(
    "🔥 RENDER:",
    IS_RENDER ? "YES" : "NO"
);

console.log(
    "🔗 BASE PATH:",
    BASE_PATH || "/"
);

console.log(
    "🤖 GEMINI MODEL:",
    GEMINI_MODEL
);

console.log(
    "🔑 GEMINI API KEY:",
    GEMINI_API_KEY
        ? "✅ ĐÃ TÌM THẤY"
        : "❌ KHÔNG TÌM THẤY"
);

console.log("========================================");


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


// ============================================================
// STATIC - LOCAL / RENDER
// ============================================================
//
// Trên Render:
//
// /ielts/.../bai-viet-1/style.css
//
// sẽ lấy từ thư mục project.
//
// Trên Vercel:
// static file nên đặt trong public/.
// Nhưng index.html vẫn được trả bằng sendFile().
//
// ============================================================

if (!IS_VERCEL) {

    app.use(
        BASE_PATH,
        express.static(ROOT_DIR)
    );

}


// ============================================================
// GEMINI FUNCTION
// ============================================================

async function callGemini(prompt) {

    console.log("");
    console.log("========================================");
    console.log("🤖 GỌI GEMINI AI");
    console.log("========================================");

    console.log(
        "MODEL:",
        GEMINI_MODEL
    );

    console.log(
        "PROMPT LENGTH:",
        prompt.length
    );


    // ========================================================
    // API KEY
    // ========================================================

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình."
        );

    }


    // ========================================================
    // REQUEST
    // ========================================================

    let response;

    try {

        response =
            await fetch(
                GEMINI_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "X-goog-api-key":
                            GEMINI_API_KEY

                    },

                    body:
                        JSON.stringify({

                            contents: [

                                {

                                    parts: [

                                        {
                                            text:
                                                prompt
                                        }

                                    ]

                                }

                            ]

                        })

                }
            );

    } catch (error) {

        console.error(
            "❌ FETCH GEMINI ERROR:",
            error.message
        );

        throw new Error(
            "Không thể kết nối tới Gemini API."
        );

    }


    // ========================================================
    // STATUS
    // ========================================================

    console.log(
        "📡 GEMINI STATUS:",
        response.status,
        response.statusText
    );


    // ========================================================
    // JSON
    // ========================================================

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Gemini API không trả về JSON hợp lệ."
        );

    }


    // ========================================================
    // ERROR
    // ========================================================

    if (!response.ok) {

        console.error(
            "❌ GEMINI ERROR:",
            JSON.stringify(
                data,
                null,
                2
            )
        );


        if (
            response.status === 400
        ) {

            throw new Error(
                data?.error?.message ||
                "Gemini nhận request không hợp lệ."
            );

        }


        if (
            response.status === 401
        ) {

            throw new Error(
                "Gemini API Key không hợp lệ hoặc đã hết hạn."
            );

        }


        if (
            response.status === 403
        ) {

            throw new Error(
                "Gemini API Key không có quyền sử dụng model này."
            );

        }


        if (
            response.status === 404
        ) {

            throw new Error(
                `Gemini không tìm thấy model "${GEMINI_MODEL}".`
            );

        }


        if (
            response.status === 429
        ) {

            throw new Error(
                "Gemini API đang giới hạn số lượt gọi."
            );

        }


        if (
            response.status === 503
        ) {

            throw new Error(
                "Gemini đang quá tải. Vui lòng thử lại sau."
            );

        }


        throw new Error(
            data?.error?.message ||
            `Gemini API lỗi HTTP ${response.status}`
        );

    }


    // ========================================================
    // GET TEXT
    // ========================================================

    const text =
        data
            ?.candidates?.[0]
            ?.content?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            ?.join("")
            ?.trim();


    // ========================================================
    // EMPTY
    // ========================================================

    if (!text) {

        console.error(
            "❌ GEMINI KHÔNG TRẢ TEXT"
        );

        console.error(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            "Gemini không trả về nội dung."
        );

    }


    console.log(
        "✅ GEMINI TRẢ KẾT QUẢ"
    );

    console.log(
        "TEXT LENGTH:",
        text.length
    );


    return text;

}


// ============================================================
// PARSE GEMINI JSON
// ============================================================

function parseGeminiJSON(text) {

    let cleaned =
        String(
            text || ""
        )
            .trim();


    // ========================================================
    // REMOVE MARKDOWN
    // ========================================================

    cleaned =
        cleaned
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


    // ========================================================
    // FIND JSON
    // ========================================================

    const firstBrace =
        cleaned.indexOf("{");

    const lastBrace =
        cleaned.lastIndexOf("}");


    if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        lastBrace > firstBrace
    ) {

        cleaned =
            cleaned.substring(
                firstBrace,
                lastBrace + 1
            );

    }


    // ========================================================
    // PARSE
    // ========================================================

    try {

        return JSON.parse(
            cleaned
        );

    } catch (error) {

        console.error(
            "❌ JSON PARSE ERROR:",
            error.message
        );

        console.error(
            "RAW:",
            text
        );

        throw new Error(
            "Gemini trả dữ liệu không đúng định dạng JSON."
        );

    }

}


// ============================================================
// GET /api/ai-status
// ============================================================

app.get(
    `${BASE_PATH}/api/ai-status`,
    async (req, res) => {

        try {

            const text =
                await callGemini(
                    "Reply with exactly one word: OK"
                );


            return res.json({

                success:
                    true,

                connected:
                    true,

                model:
                    GEMINI_MODEL,

                message:
                    "Gemini AI đã kết nối thành công.",

                response:
                    text

            });

        } catch (error) {

            console.error(
                "❌ AI STATUS ERROR:",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                connected:
                    false,

                model:
                    GEMINI_MODEL,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// POST /api/check-writing
// ============================================================

app.post(
    `${BASE_PATH}/api/check-writing`,
    async (req, res) => {

        console.log("");
        console.log("========================================");
        console.log("📝 NHẬN BÀI WRITING");
        console.log("========================================");


        try {

            const {
                topic,
                title,
                outline,
                writing
            } = req.body;


            console.log(
                "📌 Topic:",
                topic || "(không có)"
            );

            console.log(
                "📌 Title:",
                title || "(không có)"
            );

            console.log(
                "📌 Outline:",
                outline
                    ? "Có"
                    : "Không"
            );


            // =================================================
            // VALIDATE
            // =================================================

            if (
                typeof writing !== "string" ||
                !writing.trim()
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Bài viết không được để trống."

                });

            }


            const cleanWriting =
                writing.trim();


            // =================================================
            // WORD COUNT
            // =================================================

            const wordCount =
                cleanWriting
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;


            console.log(
                "📊 WORD COUNT:",
                wordCount
            );


            // =================================================
            // PROMPT
            // =================================================

            const prompt = `

Bạn là một GIÁO VIÊN TIẾNG ANH NGƯỜI VIỆT NAM.

Bạn đang chấm bài viết tiếng Anh của một học sinh/sinh viên Việt Nam.

NHIỆM VỤ:

Đọc bài viết tiếng Anh của học sinh.

Hãy cố gắng hiểu Ý CHÍNH mà học sinh muốn diễn đạt.

Sau đó đánh giá bài viết và chỉ ra những lỗi tiếng Anh cần sửa.

============================================================
NGUYÊN TẮC CHẤM
============================================================

1. TẤT CẢ NHẬN XÉT PHẢI VIẾT BẰNG TIẾNG VIỆT.

2. Phần bài viết của học sinh là TIẾNG ANH.

3. Chỉ ra các lỗi tiếng Anh thực sự đáng chú ý.

Có thể bao gồm:

- Grammar
- Tense
- Subject-verb agreement
- Articles
- Prepositions
- Singular / plural
- Pronouns
- Word form
- Word choice
- Spelling
- Sentence structure
- Cách dùng từ
- Cấu trúc câu

4. KHÔNG được viết lại toàn bộ bài của học sinh.

5. KHÔNG được biến bài của học sinh thành bài văn mẫu.

6. KHÔNG tự thêm ý tưởng mà học sinh không viết.

7. Nếu câu có lỗi nhưng vẫn hiểu được ý:

- Không phạt quá nặng.
- Giữ nguyên ý của học sinh.
- Chỉ ra lỗi.
- Đưa cách sửa ngắn gọn.
- Giải thích bằng tiếng Việt.

8. Nếu câu khó hiểu:

Ghi rõ:

"Chưa rõ ý"

và giải thích tại sao câu đó khó hiểu.

9. Không bắt học sinh sử dụng từ vựng quá khó.

10. Không yêu cầu bài viết phải giống văn mẫu.

11. Đánh giá phù hợp với người Việt Nam đang học tiếng Anh.

12. Nhận xét giống giáo viên Việt Nam đang chữa bài tiếng Anh.

13. Ưu tiên giải thích đơn giản, dễ hiểu.

14. Nếu học sinh viết đúng thì KHÔNG được cố tình tìm lỗi.

15. Không sửa câu chỉ vì có thể viết tự nhiên hơn nếu câu hiện tại vẫn đúng.

============================================================
ĐỀ BÀI
============================================================

${topic || ""}

============================================================
TÊN BÀI
============================================================

${title || ""}

============================================================
DÀN Ý GỢI Ý
============================================================

${outline || ""}

============================================================
BÀI VIẾT CỦA HỌC SINH
============================================================

${cleanWriting}

============================================================
SỐ TỪ
============================================================

${wordCount} từ

============================================================
YÊU CẦU
============================================================

CHỈ TRẢ VỀ JSON HỢP LỆ.

KHÔNG MARKDOWN.

KHÔNG CODE FENCE.

JSON:

{
    "score": 0,

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
        "comment": ""
    },

    "coherence": {
        "score": 0,
        "comment": ""
    },

    "content": {
        "score": 0,
        "comment": ""
    },

    "strengths": [],

    "weaknesses": [],

    "improvements": [],

    "overall_comment": ""
}

============================================================
GIẢI THÍCH
============================================================

score:
Điểm tổng từ 0 đến 10.

grammar.score:
Điểm ngữ pháp từ 0 đến 10.

vocabulary.score:
Điểm từ vựng từ 0 đến 10.

coherence.score:
Điểm mạch lạc và liên kết từ 0 đến 10.

content.score:
Điểm nội dung và mức độ trả lời đúng đề từ 0 đến 10.

strengths:
Danh sách điểm mạnh bằng tiếng Việt.

weaknesses:
Danh sách điểm yếu bằng tiếng Việt.

improvements:
Danh sách gợi ý cải thiện bằng tiếng Việt.

overall_comment:
Nhận xét tổng quan bằng tiếng Việt.

Không viết lại toàn bộ bài.

QUAN TRỌNG:

CHỈ CHỮA LỖI TIẾNG ANH.

NHẬN XÉT BẰNG TIẾNG VIỆT.

KHÔNG VIẾT LẠI TOÀN BỘ BÀI.

KHÔNG BỊA Ý CỦA HỌC SINH.

NẾU KHÔNG CHẮC Ý -> GHI "CHƯA RÕ Ý".

CHỈ TRẢ JSON.
`;


            // =================================================
            // CALL GEMINI
            // =================================================

            const aiText =
                await callGemini(
                    prompt
                );


            // =================================================
            // PARSE
            // =================================================

            const result =
                parseGeminiJSON(
                    aiText
                );


            // =================================================
            // NORMALIZE
            // =================================================

            const data = {

                score:
                    Number(
                        result?.score
                    ) || 0,


                grammar: {

                    score:
                        Number(
                            result
                                ?.grammar
                                ?.score
                        ) || 0,

                    comment:
                        result
                            ?.grammar
                            ?.comment ||
                        "",

                    errors:
                        Array.isArray(
                            result
                                ?.grammar
                                ?.errors
                        )
                            ? result
                                .grammar
                                .errors
                            : []

                },


                vocabulary: {

                    score:
                        Number(
                            result
                                ?.vocabulary
                                ?.score
                        ) || 0,

                    comment:
                        result
                            ?.vocabulary
                            ?.comment ||
                        ""

                },


                coherence: {

                    score:
                        Number(
                            result
                                ?.coherence
                                ?.score
                        ) || 0,

                    comment:
                        result
                            ?.coherence
                            ?.comment ||
                        ""

                },


                content: {

                    score:
                        Number(
                            result
                                ?.content
                                ?.score
                        ) || 0,

                    comment:
                        result
                            ?.content
                            ?.comment ||
                        ""

                },


                strengths:
                    Array.isArray(
                        result?.strengths
                    )
                        ? result.strengths
                        : [],


                weaknesses:
                    Array.isArray(
                        result?.weaknesses
                    )
                        ? result.weaknesses
                        : [],


                improvements:
                    Array.isArray(
                        result?.improvements
                    )
                        ? result.improvements
                        : [],


                overall_comment:
                    result
                        ?.overall_comment ||
                    "",


                wordCount:
                    wordCount

            };


            // =================================================
            // SUCCESS
            // =================================================

            console.log("");
            console.log("========================================");
            console.log("✅ CHẤM BÀI THÀNH CÔNG");
            console.log("⭐ SCORE:", data.score);
            console.log("📝 WORD COUNT:", data.wordCount);
            console.log("========================================");


            return res.json({

                success:
                    true,

                data

            });

        } catch (error) {

            console.error("");
            console.error("========================================");
            console.error("❌ CHECK WRITING ERROR");
            console.error("MESSAGE:", error.message);
            console.error("STACK:", error.stack);
            console.error("========================================");


            return res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Không thể chấm bài bằng Gemini AI."

            });

        }

    }
);


// ============================================================
// HOME
// ============================================================
//
// Render:
//
// /ielts/Ielts-Mentor/Basic/bai-tap/ielts-writing-speaking/bai-viet-1/
//
// Vercel:
//
// /

app.get(
    BASE_PATH || "/",
    (req, res) => {

        console.log(
            "🌐 HOME:",
            req.originalUrl
        );


        res.sendFile(
            INDEX_PATH,
            error => {

                if (error) {

                    console.error(
                        "❌ INDEX ERROR:",
                        error.message
                    );


                    if (
                        !res.headersSent
                    ) {

                        res.status(500).send(
                            "Không tìm thấy index.html"
                        );

                    }

                }

            }
        );

    }
);


// ============================================================
// VERCEL ROOT
// ============================================================

if (IS_VERCEL) {

    app.get(
        "/",
        (req, res) => {

            res.sendFile(
                INDEX_PATH
            );

        }
    );

}


// ============================================================
// API 404
// ============================================================

app.use(
    `${BASE_PATH}/api`,
    (req, res) => {

        console.error(
            "❌ API NOT FOUND:",
            req.method,
            req.originalUrl
        );


        return res.status(404).json({

            success:
                false,

            message:
                "API không tồn tại.",

            path:
                req.originalUrl

        });

    }
);


// ============================================================
// GLOBAL ERROR
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "💥 GLOBAL ERROR:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(error);

        }


        return res.status(500).json({

            success:
                false,

            message:
                "Lỗi server."

        });

    }
);


// ============================================================
// RENDER / LOCAL SERVER
// ============================================================
//
// Vercel:
// Không listen.
//
// Render:
// Có listen.
//
// Local:
// Có listen.

if (!IS_VERCEL) {

    app.listen(
        PORT,
        "0.0.0.0",
        () => {

            console.log("");
            console.log("========================================");
            console.log("🚀 IELTS WRITING AI ĐANG CHẠY");
            console.log("========================================");

            console.log(
                "🌐 http://localhost:" +
                PORT
            );

            console.log(
                "🔗 BASE PATH:",
                BASE_PATH
            );

            console.log(
                "🤖 Gemini:",
                GEMINI_MODEL
            );

            console.log("========================================");
            console.log("");

        }
    );

}


// ============================================================
// VERCEL EXPORT
// ============================================================

module.exports = app;
