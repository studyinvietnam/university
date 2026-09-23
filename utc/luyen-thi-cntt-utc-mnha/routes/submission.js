// ============================================================
// SUBMISSION ROUTES
// Dùng đúng export có sẵn trong middleware:
//   middleware/auth  → requireAuth
//   middleware/role  → requireRole, adminOnly, studentOnly, studentOrAdmin
// ============================================================

const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submission.controller");
const { requireAuth } = require("../middleware/auth");
const { adminOnly, studentOrAdmin } = require("../middleware/role");

// ============================================================
// STATIC PATHS — PHẢI đặt TRƯỚC /:id (tránh nuốt nhầm)
// ============================================================

router.get("/my",      requireAuth, submissionController.history);
router.get("/history", requireAuth, submissionController.history);

router.get(
    "/admin/all",
    requireAuth,
    adminOnly,
    submissionController.getAdminSubmissions
);

// ============================================================
// STUDENT / ADMIN — nộp bài & khiếu nại
// ============================================================

router.post(
    "/",
    requireAuth,
    studentOrAdmin,
    submissionController.submit
);

router.post(
    "/:id/dispute",
    requireAuth,
    submissionController.dispute
);

// ============================================================
// ADMIN — override điểm
// ============================================================

router.patch(
    "/:id/override",
    requireAuth,
    adminOnly,
    submissionController.override
);

router.post(
    "/:id/override",
    requireAuth,
    adminOnly,
    submissionController.override
);

// ============================================================
// DYNAMIC — đặt CUỐI
// ============================================================

router.get("/:id", requireAuth, submissionController.detail);

module.exports = router;