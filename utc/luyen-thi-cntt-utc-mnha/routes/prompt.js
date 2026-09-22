const express = require("express");

const promptController = require("../controllers/prompt.controller");

const router = express.Router();


// ============================================================
// ADMIN - GRADING PROMPTS
// ============================================================

// Danh sách prompt
router.get(
    "/",
    promptController.getPrompts
);

// Tạo prompt
router.post(
    "/",
    promptController.createPrompt
);

// Cập nhật prompt
router.put(
    "/:id",
    promptController.updatePrompt
);

// Xóa prompt
router.delete(
    "/:id",
    promptController.deletePrompt
);


// ============================================================
// AI - EFFECTIVE PROMPT
// ============================================================

router.get(
    "/effective",
    async (req, res) => {
        try {
            const prompt = await promptController.getEffectivePrompt({
                lessonId: req.query.lessonId,
                subjectId: req.query.subjectId
            });

            return res.json({
                success: true,
                prompt
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


module.exports = router;