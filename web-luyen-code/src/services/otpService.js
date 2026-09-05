const bcrypt = require('bcryptjs');

/**
 * Tạo OTP 6 chữ số ngẫu nhiên
 * @returns {string} Mã OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP
 * @param {string} otp - OTP plaintext
 * @returns {string} Hash
 */
function hashOTP(otp) {
    return bcrypt.hashSync(otp, 10);
}

/**
 * So sánh OTP với hash
 * @param {string} plainOTP - OTP nhập từ user
 * @param {string} hashedOTP - Hash trong DB
 * @returns {boolean} Đúng / sai
 */
function verifyOTP(plainOTP, hashedOTP) {
    return bcrypt.compareSync(plainOTP, hashedOTP);
}

module.exports = { generateOTP, hashOTP, verifyOTP };