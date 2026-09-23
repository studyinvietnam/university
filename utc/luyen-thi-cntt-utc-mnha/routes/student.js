// routes/student.js
const express = require('express');
const router = express.Router();
const { studentOrAdmin, studentOnly } = require('../middleware/role');
const lessonCtrl = require('../controllers/lesson.controller');
const submissionCtrl = require('../controllers/submission.controller');

// Danh sách + xem đề — cả admin & student
router.get('/subjects', studentOrAdmin, lessonCtrl.listSubjects);
router.get('/subjects/:slug', studentOrAdmin, lessonCtrl.listLessons);
router.get('/practice', studentOrAdmin, lessonCtrl.listSubjects);
router.get('/lesson/:slug', studentOrAdmin, lessonCtrl.showLesson);

// Nộp bài — cả admin & student (chấm y hệt nhau)
router.post('/submission', studentOrAdmin, submissionCtrl.submit);

// Xem chi tiết — cả 2 (admin xem được mọi bài, student chỉ bài của mình)
router.get('/submission/:id', studentOrAdmin, submissionCtrl.detail);

// Lịch sử — cả 2 (mỗi người xem lịch sử của chính mình)
router.get('/history', studentOrAdmin, submissionCtrl.history);

// Khiếu nại — chỉ student
router.post('/submission/:id/dispute', studentOnly, submissionCtrl.dispute);

module.exports = router;