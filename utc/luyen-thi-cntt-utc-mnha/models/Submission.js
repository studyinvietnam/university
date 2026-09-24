const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
            index: true
        },

        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            default: null,
            index: true
        },

        // Nội dung bài làm
        answerHtml: {
            type: String,
            default: ''
        },

        // Kết quả chấm
        score: {
            type: Number,
            default: null
        },

        feedback: {
            type: String,
            default: ''
        },

        breakdown: {
            type: Array,
            default: []
        },

        grammar: {
            type: Object,
            default: null
        },

        sampleComparison: {
            type: Object,
            default: null
        },

        // ★ SNAPSHOT PROMPT TẠI THỜI ĐIỂM CHẤM
        promptSnapshot: {
            type: Object,
            default: null
        },

        // AI model đã dùng
        model: {
            type: String,
            default: null
        },

        // ★ AI Key đã dùng để chấm bài này (audit trail — key nào, tên gì)
        aiKeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIKey',
            default: null
        },

        aiKeyName: {
            type: String,
            default: null
        },

        latencyMs: {
            type: Number,
            default: null
        },

        // Trạng thái
        status: {
            type: String,
            enum: ['pending', 'grading', 'graded', 'failed', 'regrading'],
            default: 'pending',
            index: true
        },

        errorMessage: {
            type: String,
            default: null
        },

        gradedAt: {
            type: Date,
            default: null
        },

        submittedAt: {
            type: Date,
            default: Date.now
        },

        // Đồng bộ GitHub
        syncStatus: {
            type: String,
            enum: ['none', 'pending', 'committed', 'failed'],
            default: 'none',
            index: true
        },

        githubFile: {
            type: String,
            default: null
        },

        syncedAt: {
            type: Date,
            default: null
        },

        syncError: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

submissionSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);