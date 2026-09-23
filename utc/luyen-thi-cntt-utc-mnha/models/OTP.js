const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },

        code: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ['register', 'reset'],
            required: true,
            index: true
        },

        attempts: {
            type: Number,
            default: 0
        },

        expiresAt: {
            type: Date,
            required: true,
            index: true
        },

        // Lưu tạm dữ liệu đăng ký (KHÔNG lưu password plaintext)
        // { name, email, passwordHash }
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// TTL: Mongo tự xoá document khi expiresAt < now
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);