// routes/lesson.js
const express = require('express');
const router = express.Router();

const lessonController = require('../controllers/lesson.controller');
const requireApproved = require('../middleware/requireApproved');

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// Tự động refresh user từ DB để tránh session cũ
// ============================================================
router.use(requireApproved);

// ============================================================
// LESSON
// ============================================================

// Chi tiết bài học — id hoặc slug
router.get('/:id', lessonController.showLesson);

module.exports = router;