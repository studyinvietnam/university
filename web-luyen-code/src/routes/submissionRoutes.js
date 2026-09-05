const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', submissionController.submit);
router.get('/', submissionController.getSubmissions);
router.get('/:id', submissionController.getSubmissionById);

module.exports = router;