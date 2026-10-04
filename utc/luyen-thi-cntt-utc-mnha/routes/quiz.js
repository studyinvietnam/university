// routes/quiz.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const rateLimit = require('express-rate-limit');

const submitLimit = rateLimit({ windowMs: 60 * 1000, max: 6 });
const parseLimit  = rateLimit({ windowMs: 60 * 1000, max: 30 });
const analyzeLimit = rateLimit({ windowMs: 60 * 1000, max: 6 });

// Admin
router.get('/admin/quiz/new',       requireAuth, requireRole('admin'), ctrl.newForm);
router.get('/admin/quiz/:lessonId/edit', requireAuth, requireRole('admin'), ctrl.editForm);
router.post('/admin/quiz/parse',    requireAuth, requireRole('admin'), parseLimit, ctrl.parsePreview);
router.post('/admin/quiz',          requireAuth, requireRole('admin'), ctrl.create);
router.post('/admin/quiz/:lessonId', requireAuth, requireRole('admin'), ctrl.update);

// Student
// ⚠️ quiz.controller.js KHÔNG có hàm hiển thị trang làm bài (showQuizLesson).
// Trang /lessons/:lessonId/quiz đang do controller khác (lesson) xử lý, hoặc bạn cần viết thêm.
// router.get('/lessons/:lessonId/quiz', requireAuth, requireRole('student'), ctrl.showQuizLesson);

// API (client-side)
router.post('/api/quiz/:lessonId/submit',              requireAuth, requireRole(['admin', 'student']), submitLimit, ctrl.submit);
router.get('/api/quiz/submissions/:id/status',         requireAuth, ctrl.status);
router.post('/api/quiz/submissions/:id/analyze',       requireAuth, requireRole(['admin', 'student']), analyzeLimit, ctrl.analyze);

// Trang chi tiết (dùng chung route /submissions/:id, controller submission sẽ rẽ nhánh)
router.get('/quiz-submissions/:id',        requireAuth, ctrl.renderStudentDetail);

// Admin review quiz
router.get('/admin/quiz-submissions/:id/review', requireAuth, requireRole('admin'), ctrl.reviewPage);
router.post('/admin/quiz-submissions/:id/review', requireAuth, requireRole('admin'), ctrl.saveQuizTeacherComment);

module.exports = router;
