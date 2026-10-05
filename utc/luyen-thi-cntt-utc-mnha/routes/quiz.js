// routes/quiz.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole, studentOrAdmin } = require('../middleware/role');
const rateLimit = require('express-rate-limit');

const submitLimit = rateLimit({ windowMs: 60 * 1000, max: 6 });
const parseLimit  = rateLimit({ windowMs: 60 * 1000, max: 30 });
// Phân tích AI: tối đa 6 lượt/phút/IP (cooldown + giới hạn số lần/bài do controller kiểm tra thêm)
const analyzeLimit = rateLimit({ windowMs: 60 * 1000, max: 6 });

// Admin
router.get('/admin/quiz/new',       requireAuth, requireRole('admin'), ctrl.newForm);
router.get('/admin/quiz/:lessonId/edit', requireAuth, requireRole('admin'), ctrl.editForm);
router.post('/admin/quiz/parse',    requireAuth, requireRole('admin'), parseLimit, ctrl.parsePreview);
router.post('/admin/quiz',          requireAuth, requireRole('admin'), ctrl.create);
router.post('/admin/quiz/:lessonId', requireAuth, requireRole('admin'), ctrl.update);

// Student
// Trang làm bài /lessons/:lessonId/quiz do lesson.controller (renderQuizLessonPage) xử lý, không khai báo ở đây.

// API (client-side)
router.post('/api/quiz/:lessonId/submit',              requireAuth, studentOrAdmin, submitLimit, ctrl.submit);
router.get('/api/quiz/submissions/:id/status',         requireAuth, studentOrAdmin, ctrl.status);
router.post('/api/quiz/submissions/:id/analyze',       requireAuth, studentOrAdmin, analyzeLimit, ctrl.analyze);

// Trang chi tiết (dùng chung route /submissions/:id, controller submission sẽ rẽ nhánh)
router.get('/quiz-submissions/:id',        requireAuth, ctrl.renderStudentDetail);

// Admin review quiz
router.get('/admin/quiz-submissions/:id/review', requireAuth, requireRole('admin'), ctrl.reviewPage);
router.post('/admin/quiz-submissions/:id/review', requireAuth, requireRole('admin'), ctrl.saveQuizTeacherComment);

module.exports = router;
