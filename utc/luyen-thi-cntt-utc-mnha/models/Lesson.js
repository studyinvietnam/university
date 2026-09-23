const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
    {
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        slug: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
            default: null
        },

        description: {
            type: String,
            default: ''
        },

        // Nội dung đề bài (HTML)
        contentHtml: {
            type: String,
            default: ''
        },

        // Lời giải mẫu (chỉ hiện sau khi chấm)
        sampleSolution: {
            type: String,
            default: ''
        },

        // Thứ tự trong môn
        order: {
            type: Number,
            default: 0,
            index: true
        },

        // File JSON trên GitHub
        githubFile: {
            type: String,
            default: null
        },

        // Prompt riêng cho bài (fallback: prompt môn → global)
        promptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GradingPrompt',
            default: null
        },

        isPublished: {
            type: Boolean,
            default: true,
            index: true
        },

        // ============ AUDIT ============
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
        },

        deletedAt: {
            type: Date,
            default: null,
            index: true
        },

        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        deletedForever: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    {
        timestamps: true
    }
);

lessonSchema.index({ subject: 1, deletedForever: 1, isPublished: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);