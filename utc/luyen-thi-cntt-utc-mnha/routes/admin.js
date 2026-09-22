const express = require("express");

const lessonController = require("../controllers/lesson.controller");
const subjectController = require("../controllers/subject.controller");
const submissionController = require("../controllers/submission.controller");
const disputeController = require("../controllers/dispute.controller");
const promptController = require("../controllers/prompt.controller");
const aiKeyController = require("../controllers/aikey.controller");

const router = express.Router();


// ============================================================
// DASHBOARD
// ============================================================

router.get("/dashboard", (req, res) => {
    res.render("admin/dashboard", {
        title: "Dashboard"
    });
});


// ============================================================
// SUBJECTS
// ============================================================

router.get("/subjects", async (req, res) => {
    try {
        const Subject = require("../models/Subject");

        const subjects = await Subject.find()
            .sort({ order: 1, createdAt: -1 })
            .lean();

        return res.render("admin/subjects", {
            title: "Quản lý môn học",
            subjects
        });
    } catch (error) {
        console.error(error);

        return res.status(500).render("admin/subjects", {
            title: "Quản lý môn học",
            subjects: [],
            error: error.message
        });
    }
});


// ============================================================
// LESSONS
// ============================================================

router.get(
    "/lessons",
    async (req, res) => {
        try {
            const Lesson = require("../models/Lesson");
            const Subject = require("../models/Subject");

            const [lessons, subjects] = await Promise.all([
                Lesson.find()
                    .populate("subject")
                    .sort({ order: 1, createdAt: -1 })
                    .lean(),

                Subject.find()
                    .sort({ order: 1 })
                    .lean()
            ]);

            return res.render("admin/lessons", {
                title: "Quản lý bài học",
                lessons,
                subjects
            });
        } catch (error) {
            console.error(error);

            return res.status(500).render("admin/lessons", {
                title: "Quản lý bài học",
                lessons: [],
                subjects: [],
                error: error.message
            });
        }
    }
);


// ============================================================
// SUBMISSIONS
// ============================================================

router.get(
    "/submissions",
    submissionController.getAdminSubmissions
);


// ============================================================
// PROMPTS
// ============================================================

router.get(
    "/prompts",
    promptController.getPrompts
);


// ============================================================
// AI KEYS
// ============================================================

router.get(
    "/ai-keys",
    aiKeyController.getAIKeys
);


// ============================================================
// DISPUTES
// ============================================================

router.get(
    "/disputes",
    disputeController.getDisputes
);


// ============================================================
// ROLES
// ============================================================

router.get("/roles", async (req, res) => {
    try {
        const Role = require("../models/Role");

        const roles = await Role.find()
            .sort({ name: 1 })
            .lean();

        return res.render("admin/roles", {
            title: "Quản lý quyền",
            roles
        });
    } catch (error) {
        console.error(error);

        return res.status(500).render("admin/roles", {
            title: "Quản lý quyền",
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

        const users = await User.find()
            .select("-password")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 })
            .lean();

        return res.render("admin/users", {
            title: "Quản lý người dùng",
            users
        });
    } catch (error) {
        console.error(error);

        return res.status(500).render("admin/users", {
            title: "Quản lý người dùng",
            users: [],
            error: error.message
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
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return res.render("admin/auditlog", {
            title: "Audit Log",
            logs
        });
    } catch (error) {
        console.error(error);

        return res.status(500).render("admin/auditlog", {
            title: "Audit Log",
            logs: [],
            error: error.message
        });
    }
});


module.exports = router;