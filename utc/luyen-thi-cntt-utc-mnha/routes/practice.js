// routes/practice.js
const express = require('express');
const router = express.Router();

const practiceController = require('../controllers/practice.controller');
const requireApproved = require('../middleware/requireApproved');

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// ============================================================
router.use(requireApproved);

// ============================================================
// PRACTICE
// ============================================================
router.get('/', practiceController.listPractice);

module.exports = router;