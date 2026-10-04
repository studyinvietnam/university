const mongoose = require('mongoose');
const crypto = require('crypto');

// ============================================================
// UserKey = một "tổ chức" (tenant). Chỉ ADMIN DEFAULT được tạo.
// Tổ chức gốc "default" KHÔNG có document — được biểu diễn bằng
// userKey = null ở User / Subject / Lesson.
// ============================================================
const userKeySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        // Mã để đăng ký / kết nối. Luôn viết HOA, duy nhất.
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },

        // Admin default bật/tắt. Tắt → dữ liệu của tổ chức bị ẩn với student.
        active: {
            type: Boolean,
            default: true,
            index: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        // Giao diện riêng của tổ chức. Mọi field null = hiển thị như cũ.
        // Validate thật sự nằm ở services/layoutService.js (updateOne không
        // chạy validator mặc định) — maxlength ở đây chỉ là lớp phụ.
        layout: {
            logoFile:    { type: String, default: null },               // layouts/<userKeyId>/logo.<ext> trên GitHub
            logoVersion: { type: Number, default: null },               // Date.now() lúc upload → ?v= chống cache
            brandSub:    { type: String, default: null, trim: true, maxlength: 20 },
            footerText:  { type: String, default: null, trim: true, maxlength: 100 }
        }
    },
    {
        timestamps: true
    }
);

// Sinh mã ngẫu nhiên 8 ký tự hex (vd "A3F09C1E"). Controller nên
// kiểm tra trùng rồi sinh lại nếu va chạm.
userKeySchema.statics.generateCode = function () {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = mongoose.model('UserKey', userKeySchema);
