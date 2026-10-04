const mongoose = require('mongoose');

// ★ Nhận xét của giảng viên (tách biệt với feedback của AI)
//   AI chấm xong là đăng kết quả luôn, không cần giảng viên duyệt.
//   teacherComment chỉ tồn tại khi giảng viên chủ động viết (null = không có).
const teacherCommentSchema = new mongoose.Schema(
    {
        content: { type: String, default: '', trim: true, maxlength: 5000 },
        commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        // Snapshot tên người chấm → sinh viên thấy tên mà không cần populate User
        commentedByName: { type: String, default: '' },
        commentedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

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

        // ★ Loại bài nộp: thiếu = 'essay' (lean: `s.type || 'essay'`)
        type: {
            type: String,
            enum: ['essay', 'quiz'],
            default: 'essay',
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

        // ★ Nhà cung cấp AI lúc chấm (snapshot): 'gemini' | 'vilao'.
        //   Bài cũ không có field này → nơi đọc phải tra provider qua aiKeyId
        //   (xem resolveAiLabel trong submission.controller.js).
        aiProvider: {
            type: String,
            enum: ['gemini', 'vilao'],
            // null (không phải 'gemini') để bài cũ không bị gán nhầm Gemini khi đọc
            // bằng Mongoose document; nơi đọc dùng `aiProvider || tra theo aiKeyId`.
            default: null
        },

        latencyMs: {
            type: Number,
            default: null
        },

        // ★ TRẮC NGHIỆM: score đã quy về thang maxScore (server chấm, không dùng AI)
        maxScore: { type: Number, default: null },
        correctCount: { type: Number, default: null },
        totalCount: { type: Number, default: null },

        // ★ Phân tích AI (quiz): dùng để giới hạn số lần + cooldown
        analysisCount: { type: Number, default: 0 },
        lastAnalyzedAt: { type: Date, default: null },

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

        // ★ Nhận xét giảng viên + lịch sử các lần sửa
        teacherComment: {
            type: teacherCommentSchema,
            default: null
        },

        teacherCommentHistory: {
            type: [teacherCommentSchema],
            default: []
        },

        // Trạng thái đồng bộ RIÊNG cho nhận xét (không đụng syncStatus của bài nộp,
        // vì getSubmission chỉ đọc GitHub khi syncStatus === 'committed')
        teacherCommentSyncStatus: {
            type: String,
            enum: ['none', 'pending', 'committed', 'failed'],
            default: 'none',
            index: true
        },

        teacherCommentSyncError: {
            type: String,
            default: null
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