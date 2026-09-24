// routes/prompt.js
const express = require("express");
const router = express.Router();

const promptController = require("../controllers/prompt.controller");

// ============================================================
// MIDDLEWARE — chỉ check login
// ============================================================
function requireLogin(req, res, next) {
    const user = req.session?.user || req.user;

    if (!user) {
        return res.redirect("/auth/login");
    }

    if (user.role !== "admin") {
        if (user.status === "pending" || user.role === "client") {
            return res.redirect("/pages");
        }
    }

    next();
}

// ============================================================
// MIDDLEWARE — chỉ admin mới được thêm/sửa/xoá prompt
// ============================================================
function requireAdmin(req, res, next) {
    const user = req.session?.user || req.user;
    if (!user || user.role !== "admin") {
        return res.redirect("/pages");
    }
    next();
}

router.use(requireLogin);

// ============================================================
// PROMPT ROUTES
// ============================================================

// Danh sách prompt (xem)
router.get("/", promptController.getPrompts);

// CRUD — chỉ admin
router.get("/create", requireAdmin, promptController.showCreatePrompt);
router.post("/", requireAdmin, promptController.createPrompt);
router.get("/:id/edit", requireAdmin, promptController.showEditPrompt);
router.post("/:id/edit", requireAdmin, promptController.updatePrompt);
router.post("/:id/set-default", requireAdmin, promptController.setDefault);
router.post("/:id/delete", requireAdmin, promptController.deletePrompt);
router.post("/:id/hard-delete", requireAdmin, promptController.hardDeletePrompt);

module.exports = router;