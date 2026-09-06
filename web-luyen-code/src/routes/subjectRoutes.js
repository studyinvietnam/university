const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy danh sách tất cả môn học (chỉ published)
router.get('/', authMiddleware, subjectController.getAllSubjects);

// Lấy danh sách chương của một môn (đặt TRƯỚC route /:id)
router.get('/:id/chapters', authMiddleware, subjectController.getChaptersBySubject);

// Lấy chi tiết một môn học (đặt SAU)
router.get('/:id', authMiddleware, subjectController.getSubjectById);

module.exports = router;