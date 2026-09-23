const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        code: {
            type: String,
            trim: true,
            default: null
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

        // Thứ tự hiển thị
        order: {
            type: Number,
            default: 0,
            index: true
        },

        // GitHub folder name
        githubFolder: {
            type: String,
            default: null
        },

        // Prompt riêng cho môn (fallback: prompt global)
        promptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GradingPrompt',
            default: null
        },

        // Công khai cho sinh viên
        isPublished: {
            type: Boolean,
            default: true,
            index: true
        },

        // ============================================
        // AUDIT
        // ============================================
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

        // Soft delete
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
        timestamps: true // createdAt + updatedAt tự động
    }
);

// Index tổng hợp cho query phổ biến
subjectSchema.index({ deletedForever: 1, isPublished: 1, order: 1 });
subjectSchema.index({ deletedAt: 1 });

// Virtual để dùng trong view: subject.createdAtFormatted
subjectSchema.virtual('createdAtFormatted').get(function () {
    return this.createdAt
        ? new Date(this.createdAt).toLocaleString('vi-VN')
        : '';
});

subjectSchema.virtual('updatedAtFormatted').get(function () {
    return this.updatedAt
        ? new Date(this.updatedAt).toLocaleString('vi-VN')
        : '';
});

subjectSchema.set('toObject', { virtuals: true });
subjectSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Subject', subjectSchema);