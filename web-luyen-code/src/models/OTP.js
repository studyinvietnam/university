const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL tự xóa
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);