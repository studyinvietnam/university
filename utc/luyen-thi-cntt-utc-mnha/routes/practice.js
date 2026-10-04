// routes/practice.js
const express = require('express');
const router = express.Router();

const practiceController = require('../controllers/practice.controller');
const requireApproved = require('../middleware/requireApproved');
const { attachUser } = require('../middleware/auth');

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// - attachUser: luôn nạp lại user từ DB (idempotent, chỉ query 1 lần/request).
//   Bắt buộc có trước controller vì getContentScope cần biết ai đang đăng nhập;
//   nếu thiếu, admin default cũng bị coi là khách → chỉ thấy nội dung default.
// - requireApproved: chặn client / tài khoản chờ duyệt
// Việc lọc Subject/Lesson theo userKey nằm trong practice.controller.
// ============================================================
router.use(attachUser, requireApproved);

// ============================================================
// PRACTICE
// ============================================================
router.get('/', practiceController.listPractice);

module.exports = router;
