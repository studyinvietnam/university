// ============================================================
// IELTS WRITING AI - BACKEND SERVER
// Express + Vercel + Render
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

const IS_VERCEL = Boolean(
    process.env.VERCEL
);

const IS_RENDER = Boolean(
    process.env.RENDER
);

// ============================================================
// BASE PATH
// ============================================================

const BASE_PATH = IS_VERCEL
    ? ""
    : "/ielts/Ielts-Mentor/Basic/bai-tap/ielts-writing-speaking/bai-viet-1";

// ============================================================
// PORT
// ============================================================

const PORT =
    process.env.PORT || 3001;

// ============================================================
// PATH
// ============================================================

const ROOT_DIR = __dirname;

const INDEX_PATH = path.join(
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
// STATIC
// ============================================================

if (!IS_VERCEL) {
    app.use(
        BASE_PATH,
        express.static(ROOT_DIR)
    );
}

// ============================================================
// GET /api/models
// ============================================================

app.get(
    `${BASE_PATH}/api/models`,
    (req, res) => {
        console.log(
            "✅ /api/models called"
        );

        console.log(
            "📋 Models:",
            SUPPORTED_MODELS
        );

        res.json({
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
                req.query.model || null;

            console.log(
                "🔍 Checking AI status"
            );

            console.log(
                "🤖 Requested model:",
                requestedModel ||
                    "(default)"
            );

            const result =
                await testGeminiConnection(
                    requestedModel
                );

            res.json({
                success: true,

                connected: true,

                model:
                    result.model,

                message:
                    "Gemini AI đã kết nối thành công.",

                response:
                    result.response,
            });
        } catch (error) {
            console.error(
                "❌ AI STATUS ERROR:",
                error.message
            );

            res.status(500).json({
                success: false,

                connected: false,

                message:
                    error.message,
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
            const {
                topic,
                title,
                outline,
                writing,
                model,
            } = req.body || {};

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

            console.log(
                "🤖 Model yêu cầu:",
                model ||
                    "(mặc định)"
            );

            // ====================================================
            // VALIDATE WRITING
            // ====================================================

            if (
                typeof writing !== "string" ||
                !writing.trim()
            ) {
                return res.status(400).json({
                    success: false,

                    message:
                        "Bài viết không được để trống.",
                });
            }

            // ====================================================
            // CLEAN WRITING
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
            // CHECK WRITING
            // ====================================================

            const result =
                await checkWritingByGemini(
                    topic,
                    cleanWriting,
                    45000,
                    model || null
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
                "========================================"
            );

            res.json({
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

            res.status(500).json({
                success: false,

                message:
                    error.message ||
                    "Không thể chấm bài bằng Gemini AI.",
            });
        }
    }
);

// ============================================================
// HOME
// ============================================================

app.get(
    BASE_PATH || "/",
    (req, res) => {
        console.log(
            "🌐 HOME:",
            req.originalUrl
        );

        res.sendFile(
            INDEX_PATH,
            (error) => {
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

        res.status(404).json({
            success: false,

            message:
                "API không tồn tại.",

            path:
                req.originalUrl,
        });
    }
);

// ============================================================
// GLOBAL ERROR HANDLER
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

        res.status(500).json({
            success: false,

            message:
                "Lỗi server.",
        });
    }
);

// ============================================================
// START SERVER
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