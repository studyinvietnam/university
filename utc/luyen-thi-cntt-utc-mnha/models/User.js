const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        // ====================================================
        // ROLE — mặc định là CLIENT khi đăng ký mới
        //   - client : vừa đăng ký, chờ admin duyệt
        //   - student: đã được duyệt
        //   - admin  : quản trị viên
        // ====================================================
        role: {
            type: String,
            enum: ['admin', 'student', 'client'],   // ← thêm 'client'
            default: 'client',                       // ← đổi từ 'student'
            index: true
        },

        // ====================================================
        // STATUS — mặc định PENDING chờ duyệt
        //   - pending  : chờ admin duyệt
        //   - approved : đã duyệt (dùng cùng với role=student)
        //   - rejected : bị từ chối
        //   - disabled : bị vô hiệu hoá
        // ====================================================
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'disabled'],
            default: 'pending',
            index: true
        },

        avatar: {
            type: String,
            default: null
        },

        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        },

        lastLoginAt: {
            type: Date,
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);