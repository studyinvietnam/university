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

        // ★ FIX: đây mới là field thật sự dùng để lọc "xoá mềm" (thùng rác).
        //   Trước đây controller gán `lesson.isDeleted = true/false` nhưng schema
        //   không khai báo field này → mọi query `{ isDeleted: ... }` không khớp
        //   document nào cả (Mongo không tự suy ra field thiếu = false).
        //   Đây chính là lý do xoá/khôi phục "chạy nhưng không có tác dụng".
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },

        // Thời điểm xoá mềm (chỉ mang tính thông tin, KHÔNG dùng để lọc nữa —
        // lọc bằng `isDeleted` cho rõ ràng, tránh phải nhớ quy ước null/không-null)
        deletedAt: {
            type: Date,
            default: null
        },

        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }

        // ★ FIX: bỏ field `deletedForever` — không còn cần nữa vì xoá vĩnh viễn
        //   giờ xoá thật document khỏi MongoDB (`Lesson.deleteOne`), không đánh
        //   dấu cờ nữa.
    },
    { timestamps: true }
);

lessonSchema.index({ subjectId: 1, isDeleted: 1, isPublished: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
