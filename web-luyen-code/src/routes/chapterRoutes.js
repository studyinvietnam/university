const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy danh sách bài tập của một chương
router.get('/:id/problems', authMiddleware, chapterController.getProblemsByChapter);

module.exports = router;