const express = require("express");
const router = express.Router();
const promptController = require("../controllers/prompt.controller");

function requireAuth(req, res, next) {
    const user = req.user || req.session?.user;
    if (!user) return res.redirect("/auth/login");
    next();
}

function requireAdmin(req, res, next) {
    const user = req.user || req.session?.user;
    if (!user) return res.redirect("/auth/login");
    if (user.role !== "admin") {
        return res.status(403).render("error", {
            title: "Không có quyền",
            message: "Chỉ admin mới quản lý prompt.",
            statusCode: 403,
            stack: null
        });
    }
    next();
}

router.use(requireAuth);

// Danh sách prompt — admin
router.get("/", requireAdmin, promptController.getPrompts);

// Tạo mới — admin
router.post("/", requireAdmin, promptController.createPrompt);

// Lấy prompt hiệu lực cho lesson/subject (dùng cho chấm bài)
router.get("/effective", promptController.getEffectivePrompt);

// Test prompt — admin
router.post("/:id/test", requireAdmin, promptController.testPrompt);

// Cập nhật — admin
router.post("/:id/update", requireAdmin, promptController.updatePrompt);

// Xoá — admin
router.post("/:id/delete", requireAdmin, promptController.deletePrompt);

module.exports = router;