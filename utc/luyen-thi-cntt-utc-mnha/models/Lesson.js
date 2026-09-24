const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
    {
        subjectId: {
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

        // Lời giải mẫu
        sampleSolution: {
            type: String,
            default: ''
        },

        // ★ THỜI GIAN LÀM BÀI (phút) — đọc từ đây để set timer ở student
        duration: {
            type: Number,
            default: 20,
            min: 1,
            max: 600
        },

        order: {
            type: Number,
            default: 0,
            index: true
        },

        githubFile: {
            type: String,
            default: null
        },

        // ★ PROMPT CHẤM ĐIỂM
        promptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GradingPrompt',
            default: null
        },

        // ★ AI KEY dùng để chấm bài này (nếu trống → key mặc định)
        aiKeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIKey',
            default: null,
            index: true
        },

        // ★ MODEL AI dùng để chấm bài này
        model: {
            type: String,
            default: null
        },

        isPublished: {
            type: Boolean,
            default: true,
            index: true
        },

        // AUDIT
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
    { timestamps: true }
);

lessonSchema.index({ subjectId: 1, deletedForever: 1, isPublished: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);