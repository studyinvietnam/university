const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');
const authMiddleware = require('../middlewares/authMiddleware');

// Lấy chi tiết một bài tập
router.get('/:id', authMiddleware, problemController.getProblemById);

module.exports = router;