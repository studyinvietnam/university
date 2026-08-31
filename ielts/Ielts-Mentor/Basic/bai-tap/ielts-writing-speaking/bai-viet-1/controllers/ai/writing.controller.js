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
                    "BÃ i viáº¿t khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng."

            });

        }


        // =====================================================
        // CHáº¤M GEMINI
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
                "Cháº¥m bÃ i thÃ nh cÃ´ng.",

            data: result

        });

    } catch (error) {

        console.error(
            "âŒ WRITING AI ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "KhÃ´ng thá»ƒ cháº¥m bÃ i báº±ng AI."

        });

    }

};


// =============================================================
// KIá»‚M TRA GEMINI CONNECTION
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
                "Gemini AI Ä‘ang hoáº¡t Ä‘á»™ng.",

            model:
                process.env.GEMINI_MODEL ||
                "gemini-2.5-flash",

            test: {

                score:
                    result.score,

                wordCount:
                    result.wordCount

            }

        });

    } catch (error) {

        console.error(
            "âŒ GEMINI STATUS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            connected: false,

            message:
                error.message ||
                "Gemini AI chÆ°a káº¿t ná»‘i.",

            model:
                process.env.GEMINI_MODEL ||
                "gemini-2.5-flash"

        });

    }

};
