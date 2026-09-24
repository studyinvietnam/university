// routes/subject.js
const express = require("express");
const router = express.Router();

const subjectController = require("../controllers/subject.controller");

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// Chỉ chặn CLIENT chưa duyệt (status=pending hoặc role=client)
// ============================================================
function requireLogin(req, res, next) {
    const user = req.session?.user || req.user;

    if (!user) {
        return res.redirect("/auth/login");
    }

    // Admin luôn qua
    if (user.role === "admin") {
        return next();
    }

    // Student đã được duyệt → qua
    if (user.role === "student" && user.status !== "pending") {
        return next();
    }

    // Client chờ duyệt → trang chờ
    if (user.role === "client" || user.status === "pending") {
        return res.redirect("/pages");
    }

    // Fallback: mọi role khác đã login → cho qua
    next();
}

router.use(requireLogin);

// ============================================================
// SUBJECT — dùng chung admin + student
// ============================================================

router.get("/", subjectController.getSubjects);
router.get("/:id", subjectController.getSubject);

module.exports = router;