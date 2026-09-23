// ============================================================
// SUBMISSION MODEL
// ============================================================

const mongoose = require("mongoose");

const GrammarErrorSchema = new mongoose.Schema({
    original:    String,
    corrected:   String,
    explanation: String,
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    subjectId:{ type: mongoose.Schema.Types.ObjectId, ref: "Subject", index: true },

    // GitHub
    githubFile: { type: String, default: null },
    githubUrl:  { type: String, default: null },
    githubError:{ type: String, default: null },

    // Kết quả AI
    score:       { type: Number, default: null },
    maxScore:    { type: Number, default: 10 },
    wordCount:   { type: Number, default: 0 },
    model:       { type: String, default: null },
    latencyMs:   { type: Number, default: null },

    // Tóm tắt để hiển thị nhanh
    errorCount:  { type: Number, default: 0 },
    summary:     { type: String, default: "" },

    // Prompt đã dùng
    promptId:       { type: mongoose.Schema.Types.ObjectId, ref: "GradingPrompt", default: null },
    promptVersion:  { type: Number, default: null },
    promptSnapshot: { type: String, default: null },

    // Lỗi ngữ pháp (lưu sẵn để badge list nhanh, không cần đọc GitHub)
    grammarErrors: { type: [GrammarErrorSchema], default: [] },

    // Thời gian
    submittedAt: { type: Date, default: Date.now, index: true },
    gradedAt:    { type: Date, default: null },

    status: {
        type: String,
        enum: ["pending", "graded", "committed", "failed"],
        default: "pending",
        index: true,
    },
}, { timestamps: true });

SubmissionSchema.index({ userId: 1, lessonId: 1, submittedAt: -1 });

module.exports = mongoose.model("Submission", SubmissionSchema);