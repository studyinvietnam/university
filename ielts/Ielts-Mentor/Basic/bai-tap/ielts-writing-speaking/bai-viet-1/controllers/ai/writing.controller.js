// =============================================================
// WRITING AI CONTROLLER
// =============================================================

const {
    checkWritingByGemini
} = require('../../helpers/gemini-writing.helper');


// =============================================================
// CHECK WRITING
// POST /api/check-writing
// =============================================================

exports.checkWriting = async (req, res) => {

    try {

        const {
            topic,
            writing
        } = req.body;


        // =====================================================
        // VALIDATE
        // =====================================================

        if (
            !writing ||
            !String(writing).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Bài viết không được để trống."

            });

        }


        // =====================================================
        // CHẤM GEMINI
        // =====================================================

        const result =
            await checkWritingByGemini(
                String(writing).trim(),
                String(topic || "").trim()
            );


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.json({

            success: true,

            message:
                "Chấm bài thành công.",

            data: result

        });

    } catch (error) {

        console.error(
            "❌ WRITING AI ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Không thể chấm bài bằng AI."

        });

    }

};


// =============================================================
// KIỂM TRA GEMINI CONNECTION
// GET /api/check-writing/ai-status
// =============================================================

exports.checkAIStatus = async (req, res) => {

    try {

        const {
            checkWritingByGemini
        } = require(
            '../../helpers/gemini-writing.helper'
        );


        const result =
            await checkWritingByGemini(
                "I like Sunday because I can relax and spend time with my family.",
                "Write a short paragraph about your typical Sunday."
            );


        return res.json({

            success: true,

            connected: true,

            message:
                "Gemini AI đang hoạt động.",

            model:
                process.env.GEMINI_MODEL ||
                "gemini-flash-latest",

            test: {

                score:
                    result.score,

                wordCount:
                    result.wordCount

            }

        });

    } catch (error) {

        console.error(
            "❌ GEMINI STATUS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            connected: false,

            message:
                error.message ||
                "Gemini AI chưa kết nối.",

            model:
                process.env.GEMINI_MODEL ||
                "gemini-flash-latest"

        });

    }

};