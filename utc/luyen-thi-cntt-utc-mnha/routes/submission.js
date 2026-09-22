const express = require("express");

const submissionController = require("../controllers/submission.controller");

const router = express.Router();


// ============================================================
// STUDENT
// ============================================================

// Lịch sử nộp bài
router.get(
    "/history",
    submissionController.getHistory
);

// Chi tiết bài nộp
router.get(
    "/:id",
    submissionController.getSubmission
);

// Nộp bài
router.post(
    "/",
    submissionController.createSubmission
);


// ============================================================
// ADMIN
// ============================================================

// Danh sách bài nộp
router.get(
    "/admin/all",
    submissionController.getAdminSubmissions
);

// Chấm / cập nhật điểm
router.put(
    "/admin/:id/grade",
    submissionController.updateGrade
);


module.exports = router;