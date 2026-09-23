// routes/admin.js
const express = require("express");

const lessonController     = require("../controllers/lesson.controller");
const subjectController    = require("../controllers/subject.controller");
const submissionController = require("../controllers/submission.controller");
const disputeController    = require("../controllers/dispute.controller");
const promptController     = require("../controllers/prompt.controller");
const aiKeyController      = require("../controllers/aikey.controller");
const userController       = require("../controllers/user.controller");  // ✅ MỚI

const router = express.Router();

// ============================================================
// MIDDLEWARE — yêu cầu admin
// ============================================================

function requireAdmin(req, res, next) {
    const user = req.user || req.session?.user;

    if (!user) {
        if (req.xhr || req.path.startsWith("/api")) {
            return res.status(401).json({ error: "Chưa đăng nhập" });
        }
        return res.redirect("/auth/login");
    }

    if (user.role !== "admin") {
        if (req.xhr || req.path.startsWith("/api")) {
            return res.status(403).json({ error: "Không có quyền" });
        }
        return res.status(403).render("error", {
            title: "Không có quyền truy cập",
            message: "Bạn không có quyền truy cập trang quản trị.",
            statusCode: 403,
            stack: null,
        });
    }

    // ✅ FIX: đảm bảo req.user luôn được gán, kể cả khi hệ thống
    // đăng nhập bằng session (req.session.user) chứ không phải
    // Passport (req.user). Nếu không có dòng này, mọi controller
    // đọc req.user (vd lessonController.listSubjects render
    // "user: req.user") sẽ nhận undefined và đè mất res.locals.user
    // của layout, khiến header hiện như chưa đăng nhập.
    req.user = user;

    next();
}

router.use(requireAdmin);

// ============================================================
// DASHBOARD
// ============================================================

router.get("/dashboard", async (req, res) => {
    try {
        const User = require("../models/User");
        const Subject = require("../models/Subject");
        const Lesson = require("../models/Lesson");
        const Submission = require("../models/Submission");

        const [
            usersCount,
            subjectsCount,
            lessonsCount,
            submissionsCount,
            recentSubmissions,
        ] = await Promise.all([
            User.countDocuments({ deletedForever: { $ne: true } }),
            Subject.countDocuments({ deletedForever: { $ne: true }, deletedAt: null }),
            Lesson.countDocuments({ deletedForever: { $ne: true }, deletedAt: null }),
            Submission.countDocuments(),
            Submission.find()
                .populate("userId", "name email")
                .populate("lessonId", "title")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);

        const stats = {
            users: usersCount,
            subjects: subjectsCount,
            lessons: lessonsCount,
            submissions: submissionsCount,
        };

        const mappedRecent = recentSubmissions.map((s) => ({
            _id: s._id,
            student: s.userId || null,
            lesson: s.lessonId || null,
            score: s.score,
            status: s.status || (s.gradedAt ? "graded" : "pending"),
            createdAt: s.createdAt,
        }));

        return res.render("admin/dashboard", {
            title: "Dashboard",
            stats,
            recentSubmissions: mappedRecent,
        });
    } catch (error) {
        console.error("dashboard error:", error);
        return res.status(500).render("error", {
            title: "Lỗi",
            message: "Không thể tải dashboard.",
            statusCode: 500,
            stack: null,
        });
    }
});

// ============================================================
// PRACTICE — PHẢI ĐẶT TRƯỚC CÁC ROUTE CÓ :id
// ============================================================

router.get("/practice", lessonController.listSubjects);
router.get("/practice/subject/:slug", lessonController.listLessons);
router.get("/practice/lesson/:slug", lessonController.showLesson);
router.get("/practice/history", submissionController.history);
router.post("/practice/submit", submissionController.submit);
router.get("/practice/submission/:id", submissionController.detail);

// ============================================================
// SUBJECTS — CRUD
// ============================================================

router.get("/subjects", subjectController.getAdminSubjects);
router.post("/subjects", subjectController.createSubject);

router.get("/subjects/:id/edit", subjectController.showEditSubject);
router.post("/subjects/:id/edit", subjectController.updateSubject);

router.post("/subjects/:id/delete", subjectController.deleteSubject);
router.post("/subjects/:id/restore", subjectController.restoreSubject);
router.post("/subjects/:id/hard-delete", subjectController.hardDeleteSubject);

// ============================================================
// LESSONS — CRUD
// /lessons/create PHẢI đặt TRƯỚC /lessons/:id/edit
// ============================================================

router.get("/lessons", lessonController.getAdminLessons);

router.get("/lessons/create", lessonController.showCreateLesson);
router.post("/lessons", lessonController.createLesson);

router.get("/lessons/:id/edit", lessonController.showEditLesson);
router.post("/lessons/:id/edit", lessonController.updateLesson);

router.post("/lessons/:id/delete", lessonController.deleteLesson);
router.post("/lessons/:id/restore", lessonController.restoreLesson);
router.post("/lessons/:id/hard-delete", lessonController.hardDeleteLesson);

// ============================================================
// SUBMISSIONS / PROMPTS / AI KEYS / DISPUTES
// ============================================================

router.get("/submissions", submissionController.getAdminSubmissions);
router.get("/prompts", promptController.getPrompts);
router.get("/ai-keys", aiKeyController.getAIKeys);
router.get("/disputes", disputeController.getDisputes);

// ============================================================
// OVERRIDE SCORE
// ============================================================

router.post("/submission/:id/override", submissionController.override);

// ============================================================
// USERS — Quản lý tài khoản  ✅ MỚI (thay handler inline cũ)
// ============================================================

router.get("/users", userController.getUsers);

// Chi tiết 1 user (dùng cho modal hoặc AJAX)
router.get("/users/:id/detail", userController.getUser);

// Cập nhật role + status + name
router.post("/users/:id/update", userController.updateUser);

// Đổi role riêng
router.post("/users/:id/role", userController.changeRole);

// Duyệt nhanh (client + pending → student + approved)
router.post("/users/:id/approve", userController.approveUser);

// Từ chối
router.post("/users/:id/reject", userController.rejectUser);

// Bật / tắt trạng thái disabled
router.post("/users/:id/toggle", userController.toggleStatus);

// Xoá vĩnh viễn
router.post("/users/:id/delete", userController.deleteUser);

// ============================================================
// ROLES
// ============================================================

router.get("/roles", async (req, res) => {
    try {
        const Role = require("../models/Role");
        const roles = await Role.find().sort({ name: 1 }).lean();

        return res.render("admin/roles", {
            title: "Quản lý quyền",
            roles,
        });
    } catch (error) {
        console.error("roles error:", error);
        return res.status(500).render("admin/roles", {
            title: "Quản lý quyền",
            roles: [],
            error: error.message,
        });
    }
});

// ============================================================
// AUDIT LOG
// ============================================================

router.get("/audit-log", async (req, res) => {
    try {
        const AuditLog = require("../models/AuditLog");
        const logs = await AuditLog.find()
            .populate("actor", "name email")
            .populate("adminId", "name email")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return res.render("admin/auditlog", {
            title: "Audit Log",
            logs,
        });
    } catch (error) {
        console.error("audit-log error:", error);
        return res.status(500).render("admin/auditlog", {
            title: "Audit Log",
            logs: [],
            error: error.message,
        });
    }
});

module.exports = router;