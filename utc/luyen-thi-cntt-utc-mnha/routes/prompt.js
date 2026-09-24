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

router.use(requireLogin);

// ============================================================
// PROMPT ROUTES (public cho user đã login)
// ============================================================

// Danh sách prompt đang active (chỉ xem, không sửa)
router.get("/", promptController.getPrompts);

module.exports = router;