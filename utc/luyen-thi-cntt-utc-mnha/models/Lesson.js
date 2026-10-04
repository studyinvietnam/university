const mongoose = require('mongoose');
const { formatAiLabel } = require('../config/aiModels');

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

        // ★ AI KEY dùng để chấm bài này (nếu trống → xoay key Gemini như cũ)
        //   Key có thể là Gemini hoặc vilao.ai (AIKey.provider). vilao.ai CHỈ được
        //   dùng khi bài gán đích danh key vilao.ai ở đây.
        //   Muốn lấy nhãn key: populate('aiKeyId', 'name provider') rồi dùng
        //   lesson.aiLabel (document) hoặc Lesson.getAiLabel(lesson) (lean).
        aiKeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIKey',
            default: null,
            index: true
        },

        // ★ MODEL AI dùng để chấm bài này
        //   Key Gemini  → thuộc SUPPORTED_MODELS (sai/trống → DEFAULT_MODEL)
        //   Key vilao.ai → thuộc VILAO_MODELS (sai/trống → VILAO_DEFAULT_MODEL)
        model: {
            type: String,
            default: null
        },

        isPublished: {
            type: Boolean,
            default: true,
            index: true
        },

        // ★ LOẠI BÀI: 'essay' (tự luận, AI chấm) | 'quiz' (trắc nghiệm, server chấm).
        //   Bài cũ không có field → coi là essay. Với dữ liệu .lean() dùng:
        //   `lesson.type || 'essay'` (lean không áp default của Mongoose).
        type: {
            type: String,
            enum: ['essay', 'quiz'],
            default: 'essay',
            index: true
        },

        // ★ Số câu từng phần (chỉ để hiện "20 câu" ở danh sách, khỏi đọc GitHub)
        quizCounts: {
            mcq: { type: Number, default: 0 },
            tf: { type: Number, default: 0 },
            fill: { type: Number, default: 0 }
        },

        // ★ Các AI Key cho phép sinh viên chọn khi bấm "Phân tích AI" (quiz).
        //   Rỗng = dùng aiKeyId của bài / xoay key Gemini.
        analysisAiKeyIds: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIKey' }],
            default: []
        },

        // ★ USER KEY (đa tổ chức): kế thừa từ Subject khi tạo/chuyển môn.
        //   null = tổ chức default. Bài cũ thiếu field vẫn khớp { userKey: null }.
        userKey: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserKey',
            default: null,
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

lessonSchema.virtual('isQuiz').get(function () {
    return this.type === 'quiz';
});

// ============================================================
// ★ NHÃN AI CỦA BÀI HỌC
// ------------------------------------------------------------
// - Bài gán key (đã populate 'aiKeyId' với name + provider)
//     → "Gemini: {tên}" hoặc "vilao.ai: {tên}"
// - Bài không gán key (hoặc key đã bị xoá → populate ra null)
//     → "Gemini" (mặc định, vì chưa biết key nào sẽ chấm)
// - Bài gán key nhưng CHƯA populate → null (tránh hiện nhãn sai;
//     nơi gọi cần populate trước)
// Dùng được với cả document lẫn object .lean().
// ============================================================
function getLessonAiLabel(lesson) {
    if (!lesson) return formatAiLabel('gemini', null);

    const k = lesson.aiKeyId;
    if (!k) return formatAiLabel('gemini', null);

    // Đã populate: object có `name` hoặc `provider` (ObjectId thuần thì không có)
    const populated = typeof k === 'object' && (k.name !== undefined || k.provider !== undefined);
    if (!populated) return null;

    return formatAiLabel(k.provider || 'gemini', k.name);
}

lessonSchema.virtual('aiLabel').get(function () {
    return getLessonAiLabel(this);
});

lessonSchema.statics.getAiLabel = getLessonAiLabel;

module.exports = mongoose.model('Lesson', lessonSchema);
