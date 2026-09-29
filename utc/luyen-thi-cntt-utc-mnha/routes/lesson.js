// routes/lesson.js
const express = require('express');
const router = express.Router();

const lessonController = require('../controllers/lesson.controller');
const requireApproved = require('../middleware/requireApproved');
const { attachUser } = require('../middleware/auth');

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// - attachUser     : đảm bảo req.user + cờ isDefaultAdmin/isUserKeyAdmin luôn có
//                    (idempotent nếu đã gắn global)
// - requireApproved: giữ nguyên, tự refresh user từ DB để tránh session cũ
// Việc lọc Lesson theo userKey đã nằm trong lesson.controller (trả 404 ngoài phạm vi).
// ============================================================
router.use(attachUser);
router.use(requireApproved);

// ============================================================
// LESSON
// ============================================================

// Chi tiết bài học — id hoặc slug
router.get('/:id', lessonController.showLesson);

module.exports = router;
