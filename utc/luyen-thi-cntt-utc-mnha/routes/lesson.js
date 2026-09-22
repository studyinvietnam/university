const express = require("express");

const lessonController = require("../controllers/lesson.controller");

const router = express.Router();


// ============================================================
// STUDENT
// ============================================================

// Danh sách bài học của môn
router.get(
    "/subject/:subjectId",
    lessonController.getLessons
);

// Chi tiết bài học
router.get(
    "/:id",
    lessonController.getLesson
);


// ============================================================
// ADMIN
// ============================================================

// Tạo bài học
router.post(
    "/",
    lessonController.createLesson
);

// Cập nhật bài học
router.put(
    "/:id",
    lessonController.updateLesson
);

// Xóa bài học
router.delete(
    "/:id",
    lessonController.deleteLesson
);


module.exports = router;