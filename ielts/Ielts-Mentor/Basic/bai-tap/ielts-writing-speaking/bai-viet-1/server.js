// ============================================================
// IELTS WRITING AI - BACKEND
// ============================================================

require("dotenv").config();

const express = require("express");
const path = require("path");


// ============================================================
// APP
// ============================================================

const app = express();

const PORT = 3001;


// ============================================================
// GEMINI CONFIG
// ============================================================

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY?.trim();


// Dùng cố định Gemini 3.6 Flash
const GEMINI_MODEL =
    "gemini-3.6-flash";


const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


// ============================================================
// LOG KHỞI ĐỘNG
// ============================================================

console.log("");
console.log("========================================");
console.log("🚀 IELTS WRITING AI BACKEND");
console.log("========================================");

console.log(
    "📁 Thư mục server:",
    __dirname
);

console.log(
    "📄 File .env:",
    path.join(__dirname, ".env")
);

console.log(
    "🌐 PORT:",
    PORT
);

console.log(
    "🤖 GEMINI MODEL:",
    GEMINI_MODEL
);

console.log(
    "🔑 GEMINI_API_KEY:",
    GEMINI_API_KEY
        ? "ĐÃ TÌM THẤY"
        : "❌ KHÔNG TÌM THẤY"
);

console.log(
    "========================================");
console.log("");


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    express.json({
        limit: "1mb"
    })
);


// ============================================================
// STATIC FILE
// ============================================================

app.use(
    express.static(__dirname)
);


// ============================================================
// KIỂM TRA API KEY
// ============================================================

if (!GEMINI_API_KEY) {

    console.error("");
    console.error("========================================");
    console.error("❌ GEMINI API KEY ERROR");
    console.error("========================================");

    console.error(
        "Không tìm thấy GEMINI_API_KEY."
    );

    console.error(
        "Hãy kiểm tra file .env:"
    );

    console.error(
        path.join(__dirname, ".env")
    );

    console.error(
        "Ví dụ:"
    );

    console.error(
        "GEMINI_API_KEY=YOUR_API_KEY"
    );

    console.error(
        "========================================");
    console.error("");

}


// ============================================================
// HÀM GỌI GEMINI
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
        "URL:",
        GEMINI_URL
    );

    console.log(
        "API KEY:",
        GEMINI_API_KEY
            ? "ĐÃ CẤU HÌNH"
            : "❌ THIẾU"
    );

    console.log(
        "PROMPT LENGTH:",
        prompt.length
    );

    console.log(
        "========================================");


    // --------------------------------------------------------
    // Kiểm tra API KEY
    // --------------------------------------------------------

    if (!GEMINI_API_KEY) {

        console.error(
            "❌ GEMINI_API_KEY chưa được cấu hình."
        );

        throw new Error(
            "GEMINI_API_KEY chưa được cấu hình trong .env"
        );

    }


    // --------------------------------------------------------
    // GỌI API
    // --------------------------------------------------------

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

                    body: JSON.stringify({

                        contents: [

                            {

                                parts: [

                                    {
                                        text: prompt
                                    }

                                ]

                            }

                        ]

                    })

                }
            );

    } catch (error) {

        console.error("");
        console.error("========================================");
        console.error("❌ FETCH GEMINI ERROR");
        console.error("========================================");

        console.error(
            "NAME:",
            error.name
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "STACK:",
            error.stack
        );

        console.error(
            "========================================");

        throw new Error(
            "Không thể kết nối tới Gemini API."
        );

    }


    // --------------------------------------------------------
    // HTTP STATUS
    // --------------------------------------------------------

    console.log(
        "📡 GEMINI HTTP STATUS:",
        response.status,
        response.statusText
    );


    // --------------------------------------------------------
    // Đọc JSON
    // --------------------------------------------------------

    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        console.error("");
        console.error(
            "❌ GEMINI KHÔNG TRẢ JSON HỢP LỆ"
        );

        throw new Error(
            "Gemini API không trả về JSON hợp lệ."
        );

    }


    // --------------------------------------------------------
    // GEMINI ERROR
    // --------------------------------------------------------

    if (!response.ok) {

        console.error("");
        console.error("========================================");
        console.error("❌ GEMINI API ERROR");
        console.error("========================================");

        console.error(
            "HTTP STATUS:",
            response.status
        );

        console.error(
            "STATUS TEXT:",
            response.statusText
        );

        console.error(
            "MODEL:",
            GEMINI_MODEL
        );

        console.error(
            "ERROR CODE:",
            data?.error?.code
        );

        console.error(
            "ERROR STATUS:",
            data?.error?.status
        );

        console.error(
            "ERROR MESSAGE:",
            data?.error?.message
        );

        console.error(
            "FULL RESPONSE:"
        );

        console.error(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        console.error(
            "========================================");


        // ----------------------------------------------------
        // Các lỗi thường gặp
        // ----------------------------------------------------

        if (response.status === 401) {

            throw new Error(
                "Gemini API Key không hợp lệ hoặc đã hết hạn."
            );

        }


        if (response.status === 403) {

            throw new Error(
                "Gemini API Key không có quyền sử dụng model này."
            );

        }


        if (response.status === 404) {

            throw new Error(
                `Gemini không tìm thấy model "${GEMINI_MODEL}".`
            );

        }


        if (response.status === 429) {

            throw new Error(
                "Gemini API đang giới hạn số lượt gọi. Vui lòng thử lại sau."
            );

        }


        if (response.status === 503) {

            throw new Error(
                "Gemini đang quá tải. Vui lòng thử lại sau ít phút."
            );

        }


        throw new Error(
            data?.error?.message ||
            `Gemini API lỗi HTTP ${response.status}`
        );

    }


    // --------------------------------------------------------
    // LẤY TEXT
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Không có text
    // --------------------------------------------------------

    if (!text) {

        console.error("");
        console.error("========================================");
        console.error("❌ GEMINI KHÔNG TRẢ TEXT");
        console.error("========================================");

        console.error(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        console.error(
            "========================================");


        throw new Error(
            "Gemini không trả về nội dung."
        );

    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    console.log("");
    console.log(
        "✅ GEMINI TRẢ KẾT QUẢ THÀNH CÔNG"
    );

    console.log(
        "TEXT LENGTH:",
        text.length
    );

    console.log(
        "========================================");


    return text;

}


// ============================================================
// PARSE JSON GEMINI
// ============================================================

function parseGeminiJSON(text) {

    console.log("");
    console.log(
        "🔍 ĐANG PARSE JSON GEMINI..."
    );


    let cleaned =
        String(text || "")
            .trim();


    // --------------------------------------------------------
    // Xóa markdown
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Tìm JSON
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Parse
    // --------------------------------------------------------

    try {

        const result =
            JSON.parse(
                cleaned
            );


        console.log(
            "✅ PARSE JSON THÀNH CÔNG"
        );


        return result;

    } catch (error) {

        console.error("");
        console.error("========================================");
        console.error("❌ JSON PARSE ERROR");
        console.error("========================================");

        console.error(
            "ERROR:",
            error.message
        );

        console.error(
            "GEMINI RAW RESPONSE:"
        );

        console.error(
            text
        );

        console.error(
            "========================================");


        throw new Error(
            "Gemini trả dữ liệu không đúng định dạng JSON."
        );

    }

}


// ============================================================
// GET /api/ai-status
// ============================================================

app.get(
    "/api/ai-status",
    async (req, res) => {

        console.log("");
        console.log("========================================");
        console.log("🔍 KIỂM TRA GEMINI AI");
        console.log("========================================");


        try {

            const text =
                await callGemini(
                    "Reply with exactly one word: OK"
                );


            console.log(
                "✅ GEMINI STATUS OK"
            );


            res.json({

                success: true,

                connected: true,

                model:
                    GEMINI_MODEL,

                message:
                    "Gemini AI đã kết nối thành công.",

                response:
                    text

            });

        } catch (error) {

            console.error("");
            console.error(
                "❌ GEMINI STATUS ERROR:"
            );

            console.error(
                error.message
            );


            res.status(500).json({

                success: false,

                connected: false,

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
    "/api/check-writing",
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


            // ------------------------------------------------
            // LOG
            // ------------------------------------------------

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


            // ------------------------------------------------
            // VALIDATE
            // ------------------------------------------------

            if (
                typeof writing !== "string" ||
                !writing.trim()
            ) {

                console.error(
                    "❌ BÀI VIẾT RỖNG"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "Bài viết không được để trống."

                });

            }


            const cleanWriting =
                writing.trim();


            // ------------------------------------------------
            // WORD COUNT
            // ------------------------------------------------

            const wordCount =
                cleanWriting
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;


            console.log(
                "📊 Số từ:",
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

Không được tự đoán quá mức.

Hãy ghi rõ:

"Chưa rõ ý"

và giải thích tại sao câu đó khó hiểu.

9. Không bắt học sinh sử dụng từ vựng quá khó.

10. Không yêu cầu bài viết phải giống văn mẫu.

11. Hãy đánh giá phù hợp với người Việt Nam đang học tiếng Anh.

12. Nhận xét phải giống giáo viên Việt Nam đang chữa bài tiếng Anh.

13. Ưu tiên giải thích đơn giản, dễ hiểu.

14. Nếu học sinh viết đúng thì KHÔNG được cố tình tìm lỗi.

15. Không sửa câu chỉ vì có thể viết theo cách tự nhiên hơn nếu câu hiện tại vẫn đúng.

============================================================
CÁCH CHỮA LỖI
============================================================

Mỗi lỗi cần có:

original:

Phần tiếng Anh bị sai.

corrected:

Cách sửa ngắn gọn.

explanation:

Giải thích bằng TIẾNG VIỆT.

Ví dụ:

original:
"He go to school every day."

corrected:
"He goes to school every day."

explanation:
"Chủ ngữ 'He' là ngôi thứ ba số ít nên động từ ở thì hiện tại đơn cần thêm 's'."

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
YÊU CẦU TRẢ KẾT QUẢ
============================================================

Chỉ trả về JSON hợp lệ.

KHÔNG Markdown.

KHÔNG dùng code fence.

KHÔNG viết lời giải thích bên ngoài JSON.

JSON phải có cấu trúc:

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

============================================================
STRENGTHS
============================================================

strengths phải là danh sách điểm mạnh.

Viết bằng tiếng Việt.

============================================================
WEAKNESSES
============================================================

weaknesses phải là danh sách điểm yếu.

Viết bằng tiếng Việt.

============================================================
IMPROVEMENTS
============================================================

improvements phải là danh sách gợi ý cải thiện.

Viết bằng tiếng Việt.

Không được viết lại toàn bộ bài.

============================================================
OVERALL COMMENT
============================================================

Nhận xét tổng quan bằng tiếng Việt.

Hãy nói rõ:

- Bài có đáp ứng đề không.
- Ý có dễ hiểu không.
- Ngữ pháp có vấn đề gì.
- Từ vựng thế nào.
- Cần cải thiện điều gì.

Không viết lại bài.

============================================================
QUAN TRỌNG NHẤT
============================================================

CHỈ CHỮA LỖI TIẾNG ANH.

NHẬN XÉT BẰNG TIẾNG VIỆT.

KHÔNG VIẾT LẠI TOÀN BỘ BÀI.

KHÔNG BỊA Ý CỦA HỌC SINH.

NẾU KHÔNG CHẮC Ý -> GHI "CHƯA RÕ Ý".

CHỈ TRẢ JSON.
`;


            console.log(
                "🤖 Bắt đầu gửi bài cho Gemini..."
            );


            // ------------------------------------------------
            // CALL GEMINI
            // ------------------------------------------------

            const aiText =
                await callGemini(
                    prompt
                );


            console.log(
                "📥 Đã nhận kết quả từ Gemini."
            );


            // ------------------------------------------------
            // PARSE
            // ------------------------------------------------

            const result =
                parseGeminiJSON(
                    aiText
                );


            // ------------------------------------------------
            // NORMALIZE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            console.log("");
            console.log("========================================");
            console.log("✅ CHẤM BÀI THÀNH CÔNG");
            console.log("========================================");

            console.log(
                "⭐ SCORE:",
                data.score
            );

            console.log(
                "📝 WORD COUNT:",
                data.wordCount
            );


            res.json({

                success: true,

                data

            });


        } catch (error) {

            console.error("");
            console.error("========================================");
            console.error("❌ CHECK WRITING ERROR");
            console.error("========================================");

            console.error(
                "MESSAGE:",
                error.message
            );

            console.error(
                "STACK:",
                error.stack
            );

            console.error(
                "========================================");


            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Không thể chấm bài bằng Gemini AI."

            });

        }

    }
);


// ============================================================
// TRANG CHỦ
// ============================================================

app.get(
    "/",
    (req, res) => {

        const indexPath =
            path.join(
                __dirname,
                "index.html"
            );


        console.log(
            "🌐 GET / ->",
            indexPath
        );


        res.sendFile(
            indexPath,
            error => {

                if (error) {

                    console.error("");
                    console.error(
                        "❌ KHÔNG TÌM THẤY index.html"
                    );

                    console.error(
                        "PATH:",
                        indexPath
                    );

                    console.error(
                        "ERROR:",
                        error.message
                    );

                }

            }
        );

    }
);


// ============================================================
// 404 API
// ============================================================

app.use(
    "/api",
    (req, res) => {

        console.error(
            "❌ API NOT FOUND:",
            req.method,
            req.originalUrl
        );


        res.status(404).json({

            success: false,

            message:
                "API không tồn tại."

        });

    }
);


// ============================================================
// GLOBAL ERROR
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error("");
        console.error("========================================");
        console.error("💥 GLOBAL SERVER ERROR");
        console.error("========================================");

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "STACK:",
            error.stack
        );

        console.error(
            "========================================");


        if (res.headersSent) {

            return next(error);

        }


        res.status(500).json({

            success: false,

            message:
                "Lỗi server."

        });

    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("========================================");
        console.log("🚀 IELTS WRITING ĐANG CHẠY");
        console.log("========================================");

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🤖 Gemini model:",
            GEMINI_MODEL
        );

        console.log(
            "🔑 Gemini API:",
            GEMINI_API_KEY
                ? "✅ Đã kết nối .env"
                : "❌ Chưa có API KEY"
        );

        console.log(
            "📁 Root:",
            __dirname
        );

        console.log(
            "========================================");
        console.log("");

    }
);