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

        // Nội dung prompt chính (system prompt)
        content: {
            type: String,
            required: true
        },

        // Rubric: [{ criterion, weight, description }]
        rubric: {
            type: [
                {
                    criterion: { type: String, required: true, trim: true },
                    weight: { type: Number, required: true, min: 0, max: 100 },
                    description: { type: String, default: '' }
                }
            ],
            default: []
        },

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

        // ★ Nếu scope = 'subject' — tham chiếu Subject
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            default: null,
            index: true
        },

        // ★ Nếu scope = 'lesson' — 1 prompt có thể gán cho NHIỀU bài
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

        // Biến động hỗ trợ: ['{đề_bài}', '{bài_làm}', ...]
        variables: {
            type: [String],
            default: []
        },

        // Số phiên bản — tăng mỗi lần sửa content
        version: {
            type: Number,
            default: 1
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
        timestamps: true // createdAt + updatedAt
    }
);

// Index tổng hợp
gradingPromptSchema.index({ active: 1, scope: 1, isDefault: -1 });
gradingPromptSchema.index({ subjectId: 1, active: 1 });
gradingPromptSchema.index({ lessonIds: 1, active: 1 });

module.exports = mongoose.model('GradingPrompt', gradingPromptSchema);