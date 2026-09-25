const express = require("express");

const lessonController = require("../controllers/lesson.controller");
const subjectController = require("../controllers/subject.controller");
const submissionController = require("../controllers/submission.controller");
const disputeController = require("../controllers/dispute.controller");
const promptController = require("../controllers/prompt.controller");
const aiKeyController = require("../controllers/aikey.controller");

const router = express.Router();


// ============================================================
// MIDDLEWARE — yêu cầu admin
// ============================================================

function requireAdmin(req, res, next) {
    const user = req.session?.user;

    if (!user) {
        return res.redirect("/auth/login");
    }

    if (user.role !== "admin") {
        return res.status(403).render("error", {
            title: "Không có quyền truy cập",
            message: "Bạn không có quyền truy cập trang quản trị.",
            statusCode: 403,
            stack: null
        });
    }

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
            recentSubmissions
        ] = await Promise.all([
            User.countDocuments({ deletedForever: { $ne: true } }),
            Subject.countDocuments({ deletedForever: { $ne: true }, deletedAt: null }),
            Lesson.countDocuments({ isDeleted: false }),
            Submission.countDocuments(),
            Submission.find()
                .populate("userId", "name email")
                .populate("lessonId", "title")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);

        const stats = {
            users: usersCount,
            subjects: subjectsCount,
            lessons: lessonsCount,
            submissions: submissionsCount
        };

        const mappedRecent = recentSubmissions.map((s) => ({
            _id: s._id,
            student: s.userId || null,
            lesson: s.lessonId || null,
            score: s.score,
            status: s.status || (s.gradedAt ? "graded" : "pending"),
            createdAt: s.createdAt
        }));

        return res.render("admin/dashboard", {
            title: "Dashboard",
            user: req.user,
            stats,
            recentSubmissions: mappedRecent
        });
    } catch (error) {
        console.error("dashboard error:", error);
        return res.status(500).render("error", {
            title: "Lỗi",
            message: "Không thể tải dashboard.",
            statusCode: 500,
            stack: null
        });
    }
});


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
// ============================================================

// ⚠️ QUAN TRỌNG: /lessons/create PHẢI đặt TRƯỚC /lessons/:id
router.get("/lessons", lessonController.getAdminLessons);

router.get("/lessons/create", lessonController.showCreateLesson);
router.post("/lessons", lessonController.createLesson);

router.get("/lessons/:id/edit", lessonController.showEditLesson);
router.post("/lessons/:id/edit", lessonController.updateLesson);

router.post("/lessons/:id/delete", lessonController.deleteLesson);
router.post("/lessons/:id/restore", lessonController.restoreLesson);
router.post("/lessons/:id/hard-delete", lessonController.hardDeleteLesson);


// ============================================================
// SUBMISSIONS
// ============================================================

router.get("/submissions", submissionController.getAdminSubmissions);


// ============================================================
// PROMPTS — CRUD
// ============================================================

router.get("/prompts", promptController.getPrompts);

// ⚠️ QUAN TRỌNG: /prompts/create PHẢI đặt TRƯỚC /prompts/:id/edit
router.get("/prompts/create", promptController.showCreatePrompt);
router.post("/prompts", promptController.createPrompt);

router.get("/prompts/:id/edit", promptController.showEditPrompt);
router.post("/prompts/:id/edit", promptController.updatePrompt);

router.post("/prompts/:id/set-default", promptController.setDefault);
router.post("/prompts/:id/delete", promptController.deletePrompt);
router.post("/prompts/:id/hard-delete", promptController.hardDeletePrompt);


// ============================================================
// AI KEYS — CRUD  ★ ĐÃ THÊM
// ============================================================

router.get("/ai-keys", aiKeyController.getAIKeys);

router.post("/ai-keys", aiKeyController.createAIKey);
router.post("/ai-keys/:id/toggle", aiKeyController.toggleAIKey);
router.post("/ai-keys/:id/delete", aiKeyController.deleteAIKey);


// ============================================================
// DISPUTES
// ============================================================

router.get("/disputes", disputeController.getDisputes);


// ============================================================
// ROLES
// ============================================================

router.get("/roles", async (req, res) => {
    try {
        const Role = require("../models/Role");
        const roles = await Role.find().sort({ name: 1 }).lean();

        return res.render("admin/roles", {
            title: "Quản lý quyền",
            user: req.user,
            roles
        });
    } catch (error) {
        console.error("roles error:", error);
        return res.status(500).render("admin/roles", {
            title: "Quản lý quyền",
            user: req.user,
            roles: [],
            error: error.message
        });
    }
});


// ============================================================
// USERS
// ============================================================

router.get("/users", async (req, res) => {
    try {
        const User = require("../models/User");

        const q = (req.query.q || "").trim();
        const role = req.query.role || "all";
        const status = req.query.status || "all";

        const filter = {};

        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }
            ];
        }

        if (role !== "all") {
            filter.role = role;
        }

        if (status !== "all") {
            filter.status = status;
        }

        const [users, total, pending, student, admin, client] = await Promise.all([
            User.find(filter)
                .select("-password")
                .populate("approvedBy", "name email")
                .sort({ createdAt: -1 })
                .lean(),
            User.countDocuments(),
            User.countDocuments({ status: "pending" }),
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "client" })
        ]);

        const stats = { total, pending, student, admin, client };
        const filters = { q, role, status };

        return res.render("admin/users", {
            title: "Quản lý người dùng",
            user: req.user,
            users,
            stats,
            filters
        });
    } catch (error) {
        console.error("users error:", error);
        return res.status(500).render("admin/users", {
            title: "Quản lý người dùng",
            user: req.user,
            users: [],
            stats: { total: 0, pending: 0, student: 0, admin: 0, client: 0 },
            filters: { q: "", role: "all", status: "all" },
            error: error.message
        });
    }
});

router.post("/users/:id/approve", async (req, res) => {
    try {
        const User = require("../models/User");
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        targetUser.status = "approved";
        targetUser.approvedBy = req.user?._id || req.session?.user?._id;
        await targetUser.save();

        return res.json({ success: true });
    } catch (error) {
        console.error("approve user error:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi duyệt người dùng." });
    }
});

router.post("/users/:id/update", async (req, res) => {
    try {
        const User = require("../models/User");
        const { name, role, status } = req.body;

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        if (name !== undefined) targetUser.name = name;
        if (role !== undefined) targetUser.role = role;
        if (status !== undefined) targetUser.status = status;

        await targetUser.save();

        return res.json({ success: true });
    } catch (error) {
        console.error("update user error:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật người dùng." });
    }
});

router.post("/users/:id/delete", async (req, res) => {
    try {
        const User = require("../models/User");
        const deleted = await User.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("delete user error:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi xoá người dùng." });
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
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return res.render("admin/auditlog", {
            title: "Audit Log",
            user: req.user,
            logs
        });
    } catch (error) {
        console.error("audit-log error:", error);
        return res.status(500).render("admin/auditlog", {
            title: "Audit Log",
            user: req.user,
            logs: [],
            error: error.message
        });
    }
});


module.exports = router;
