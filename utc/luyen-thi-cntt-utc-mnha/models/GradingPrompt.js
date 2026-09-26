const mongoose = require('mongoose');

const gradingPromptSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            default: ''
        },

        // ❌ ĐÃ BỎ: content   → nội dung thật nằm trên GitHub
        // ❌ ĐÃ BỎ: rubric    → nội dung thật nằm trên GitHub
        // ❌ ĐÃ BỎ: variables → nội dung thật nằm trên GitHub

        // Mức độ chặt
        strictness: {
            type: String,
            enum: ['lenient', 'normal', 'strict', 'very_strict'],
            default: 'normal',
            index: true
        },

        // Điểm tối đa
        maxScore: {
            type: Number,
            default: 10,
            min: 0
        },

        // Prompt mặc định toàn hệ thống (chỉ 1)
        isDefault: {
            type: Boolean,
            default: false,
            index: true
        },

        // Phạm vi áp dụng
        scope: {
            type: String,
            enum: ['global', 'subject', 'lesson'],
            default: 'global',
            index: true
        },

        // Nếu scope = 'subject' — tham chiếu Subject
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            default: null,
            index: true
        },

        // Nếu scope = 'lesson' — 1 prompt có thể gán cho NHIỀU bài
        lessonIds: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Lesson'
                }
            ],
            default: [],
            index: true
        },

        // Số phiên bản — tăng mỗi lần sửa content (đối chiếu với GitHub)
        version: {
            type: Number,
            default: 1
        },

        // ★ Đường dẫn file JSON trên GitHub — NGUỒN THẬT của
        //   content / rubric / variables. MongoDB chỉ giữ con trỏ này.
        githubFile: {
            type: String,
            default: null,
            index: true
        },

        // Còn hiệu lực hay không
        active: {
            type: Boolean,
            default: true,
            index: true
        },

        // ===== AUDIT =====
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Index tổng hợp
gradingPromptSchema.index({ active: 1, scope: 1, isDefault: -1 });
gradingPromptSchema.index({ subjectId: 1, active: 1 });
gradingPromptSchema.index({ lessonIds: 1, active: 1 });

module.exports = mongoose.model('GradingPrompt', gradingPromptSchema);