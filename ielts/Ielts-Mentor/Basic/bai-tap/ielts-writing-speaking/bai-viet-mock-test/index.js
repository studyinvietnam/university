// ============================================================
// IELTS WRITING AI - EXPRESS BACKEND
// Express + Vercel + Render + Local
// ============================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const {
    checkWritingByGemini,
    testGeminiConnection,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
} = require("./bai-viet-1.backend.js");

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

const BASE_PATH =
    IS_VERCEL
        ? ""
        : "/ielts/Ielts-Mentor/Basic/bai-tap/ielts-writing-speaking/bai-viet-1";

// ============================================================
// PORT
// ============================================================

const PORT =
    process.env.PORT || 3000;

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
// MIDDLEWARE
// ============================================================

app.use(
    cors()
);

app.use(
    express.json({
        limit: "1mb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb",
    })
);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use(
    (req, res, next) => {
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
        );

        next();
    }
);

// ============================================================
// HEALTH
// ============================================================

app.get(
    "/api/health",
    (req, res) => {
        return res.status(200).json({
            success: true,

            server:
                "IELTS Writing AI",

            environment:
                IS_VERCEL
                    ? "Vercel"
                    : IS_RENDER
                    ? "Render"
                    : "Local",

            geminiModel:
                DEFAULT_MODEL,

            timestamp:
                new Date().toISOString(),
        });
    }
);

// ============================================================
// STATIC LOCAL / RENDER
// ============================================================

if (!IS_VERCEL) {
    app.use(
        BASE_PATH,
        express.static(
            ROOT_DIR
        )
    );
}

// ============================================================
// GET /api/models
// ============================================================

app.get(
    `${BASE_PATH}/api/models`,
    (req, res) => {
        console.log(
            "✅ /api/models"
        );

        return res.status(200).json({
            success: true,

            models:
                SUPPORTED_MODELS,

            default:
                DEFAULT_MODEL,
        });
    }
);

// ============================================================
// GET /api/ai-status
// ============================================================

app.get(
    `${BASE_PATH}/api/ai-status`,
    async (req, res) => {
        try {
            const requestedModel =
                req.query.model ||
                null;

            console.log(
                "🔍 Checking Gemini status"
            );

            console.log(
                "🤖 Model:",
                requestedModel ||
                    DEFAULT_MODEL
            );

            const result =
                await testGeminiConnection(
                    requestedModel
                );

            return res.status(200).json({
                success: true,

                connected: true,

                model:
                    result.model,

                message:
                    "Gemini AI đã kết nối thành công.",

                response:
                    result.response,

                interactionId:
                    result.interactionId,
            });
        } catch (error) {
            console.error(
                "❌ AI STATUS ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,

                connected: false,

                message:
                    error.message ||
                    "Gemini API chưa kết nối.",
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

        console.log(
            "========================================"
        );

        console.log(
            "📝 NHẬN BÀI WRITING"
        );

        console.log(
            "========================================"
        );

        try {
            const body =
                req.body || {};

            const topic =
                body.topic || "";

            const title =
                body.title || "";

            const outline =
                body.outline || "";

            const writing =
                body.writing || "";

            const model =
                body.model || null;

            console.log(
                "📌 Topic:",
                topic ||
                    "(không có)"
            );

            console.log(
                "📌 Title:",
                title ||
                    "(không có)"
            );

            console.log(
                "📌 Outline:",
                outline
                    ? "Có"
                    : "Không"
            );

            console.log(
                "🤖 Model:",
                model ||
                    DEFAULT_MODEL
            );

            // ====================================================
            // VALIDATE
            // ====================================================

            if (
                typeof writing !==
                    "string" ||
                !writing.trim()
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Bài viết không được để trống.",
                });
            }

            // ====================================================
            // CLEAN
            // ====================================================

            const cleanWriting =
                writing.trim();

            // ====================================================
            // WORD COUNT
            // ====================================================

            const wordCount =
                cleanWriting
                    .split(/\s+/)
                    .filter(Boolean)
                    .length;

            console.log(
                "📊 WORD COUNT:",
                wordCount
            );

            // ====================================================
            // CALL GEMINI
            // ====================================================

            const result =
                await checkWritingByGemini(
                    topic,
                    cleanWriting,
                    45000,
                    model
                );

            // ====================================================
            // SUCCESS
            // ====================================================

            console.log("");

            console.log(
                "========================================"
            );

            console.log(
                "✅ CHẤM BÀI THÀNH CÔNG"
            );

            console.log(
                "⭐ SCORE:",
                result.score
            );

            console.log(
                "📝 WORD COUNT:",
                result.wordCount
            );

            console.log(
                "🤖 MODEL:",
                result.model
            );

            console.log(
                "🆔 INTERACTION:",
                result.interactionId
            );

            console.log(
                "========================================"
            );

            return res.status(200).json({
                success: true,

                data: result,
            });
        } catch (error) {
            console.error("");

            console.error(
                "========================================"
            );

            console.error(
                "❌ CHECK WRITING ERROR"
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
                "========================================"
            );

            return res.status(500).json({
                success: false,

                message:
                    error.message ||
                    "Không thể chấm bài bằng Gemini AI.",

                ...(IS_VERCEL
                    ? {}
                    : {
                        error:
                            error.stack,
                    }),
            });
        }
    }
);

// ============================================================
// HOME - LOCAL / RENDER
// ============================================================

if (!IS_VERCEL) {
    app.get(
        BASE_PATH,
        (req, res) => {
            return res.sendFile(
                INDEX_PATH
            );
        }
    );

    app.get(
        `${BASE_PATH}/`,
        (req, res) => {
            return res.sendFile(
                INDEX_PATH
            );
        }
    );
}

// ============================================================
// VERCEL HOME
// ============================================================

if (IS_VERCEL) {
    app.get(
        "/",
        (req, res) => {
            return res.sendFile(
                INDEX_PATH
            );
        }
    );
}

// ============================================================
// API 404
// ============================================================

app.use(
    "/api",
    (req, res) => {
        console.error(
            "❌ API NOT FOUND:",
            req.method,
            req.originalUrl
        );

        return res.status(404).json({
            success: false,

            message:
                "API không tồn tại.",

            path:
                req.originalUrl,
        });
    }
);

// ============================================================
// GLOBAL ERROR
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
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
            success: false,

            message:
                error.message ||
                "Lỗi server.",
        });
    }
);

// ============================================================
// START LOCAL / RENDER
// ============================================================

if (!IS_VERCEL) {
    app.listen(
        PORT,
        "0.0.0.0",
        () => {
            console.log("");

            console.log(
                "========================================"
            );

            console.log(
                "🚀 IELTS WRITING AI ĐANG CHẠY"
            );

            console.log(
                "========================================"
            );

            console.log(
                `🌐 http://localhost:${PORT}`
            );

            console.log(
                "🔗 BASE PATH:",
                BASE_PATH
            );

            console.log(
                "🤖 GEMINI DEFAULT MODEL:",
                DEFAULT_MODEL
            );

            console.log(
                "📋 GEMINI MODELS:",
                SUPPORTED_MODELS.join(
                    ", "
                )
            );

            console.log(
                "🖥️ ENVIRONMENT:",
                IS_RENDER
                    ? "Render"
                    : "Local"
            );

            console.log(
                "========================================"
            );

            console.log("");
        }
    );
}

// ============================================================
// VERCEL EXPORT
// ============================================================

module.exports = app;