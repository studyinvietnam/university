const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, logout, getMe } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

module.exports = router;