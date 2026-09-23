// routes/lesson.js
const express = require("express");
const router = express.Router();

const lessonController = require("../controllers/lesson.controller");

// ============================================================
// MIDDLEWARE — chỉ check đăng nhập, KHÔNG phân biệt role
// Student và Admin dùng chung
// ============================================================

function requireLogin(req, res, next) {
    const user = req.user || req.session?.user;

    if (!user) {
        const wantsJson =
            req.xhr ||
            req.path.startsWith("/api") ||
            req.headers.accept?.includes("json");
        if (wantsJson) {
            return res.status(401).json({ success: false, message: "Chưa đăng nhập." });
        }
        return res.redirect("/auth/login");
    }

    // Chỉ chặn client/pending. Admin LUÔN qua, bất kể status.
    if (user.role !== "admin") {
        if (user.status === "pending" || user.role === "client") {
            const wantsJson =
                req.xhr ||
                req.path.startsWith("/api") ||
                req.headers.accept?.includes("json");
            if (wantsJson) {
                return res.status(403).json({ success: false, message: "Tài khoản đang chờ duyệt." });
            }
            return res.redirect("/pages");
        }
    }

    next();
}

router.use(requireLogin);

// ============================================================
// Chi tiết bài học — controller tự phân biệt id vs slug
// ============================================================
router.get("/:id", lessonController.showLesson);

module.exports = router;