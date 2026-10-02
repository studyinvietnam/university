// ============================================================
// CONFIG - DANH SÁCH MODEL GOOGLE AI (GEMINI) ĐƯỢC HỖ TRỢ
// ------------------------------------------------------------
// Cập nhật theo tài liệu Google mới (2026):
//   - gemini-2.0-* đã bị khai tử
//   - Ưu tiên dùng các alias "-latest" để tự động chuyển model mới
//   - Auth keys (AQ.xxx) hoạt động với các model trong danh sách này
// ============================================================

const SUPPORTED_MODELS = [
    // === Alias tự động trỏ model mới nhất (khuyên dùng) ===
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",

    // === Gemini 3.x (mới nhất) ===
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash",
    "gemini-3.1-pro",

    // === Gemini 2.5 (backup) ===
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",

    // === Gemini 2.x (legacy) ===
    "gemini-2-flash",
    "gemini-2-flash-lite",

    // === Gemma (open-source model của Google) ===
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it"
];

// Model mặc định — alias "-latest" tự động chuyển model mới khi Google update
const DEFAULT_MODEL = "gemini-flash-latest";

function isSupportedModel(model) {
    return typeof model === "string" && SUPPORTED_MODELS.includes(model);
}

function getSafeModel(model = null) {
    return isSupportedModel(model) ? model : DEFAULT_MODEL;
}

// ============================================================
// ★ vilao.ai (THÊM MỚI — API tương thích OpenAI)
// ------------------------------------------------------------
// Gemini vẫn là mặc định. Phần dưới chỉ THÊM, không đụng phần trên.
// - Địa chỉ API là hằng số trong code, KHÔNG đặt trong .env
// - Danh sách model vilao.ai tách riêng khỏi SUPPORTED_MODELS của Gemini
// ============================================================

const VILAO_BASE_URL = "https://api.vilao.ai";

// ⚠️ Chỉ có "gpt-4o" (ví dụ trong README). Danh sách model hợp lệ của
//    vilao.ai CHƯA được xác nhận → đọc tài liệu vilao.ai rồi bổ sung ở đây.
const VILAO_MODELS = [
    "gpt-4o"
];

const VILAO_DEFAULT_MODEL = "gpt-4o";

// README ví dụ 1024, nhưng JSON chấm bài (feedback + breakdown + strengths...)
// dễ dài hơn 1024 token → bị cắt giữa chừng, parse lỗi. Đặt 4096 cho an toàn;
// nếu vilao.ai giới hạn thấp hơn thì hạ xuống.
const VILAO_MAX_TOKENS = 4096;

function isSupportedVilaoModel(model) {
    return typeof model === "string" && VILAO_MODELS.includes(model);
}

function getSafeVilaoModel(model = null) {
    return isSupportedVilaoModel(model) ? model : VILAO_DEFAULT_MODEL;
}

// ============================================================
// ★ PROVIDER
// ------------------------------------------------------------
// 'google' là giá trị cũ đã có trong enum của AIKey → vẫn chấp nhận,
// coi như Gemini. Dữ liệu cũ thiếu provider (đặc biệt khi query .lean(),
// Mongoose KHÔNG áp default) cũng coi là Gemini.
// ============================================================

const AI_PROVIDERS = ["gemini", "google", "vilao"];

function isValidProvider(provider) {
    return typeof provider === "string" && AI_PROVIDERS.includes(provider);
}

// Trả về 'gemini' | 'vilao'
function normalizeProvider(provider) {
    return provider === "vilao" ? "vilao" : "gemini";
}

// ============================================================
// ★ NHÃN HIỂN THỊ
//   gemini → "Gemini: {ten-api}"   |  vilao → "vilao.ai: {ten-api}"
//   không có keyName → chỉ "Gemini" / "vilao.ai"
// ⚠️ Nhãn làm lộ TÊN KEY cho sinh viên → đặt tên key không chứa
//    thông tin nhạy cảm.
// ============================================================

function formatAiLabel(provider, keyName) {
    const base = normalizeProvider(provider) === "vilao" ? "vilao.ai" : "Gemini";
    const name = typeof keyName === "string" ? keyName.trim() : "";
    return name ? `${base}: ${name}` : base;
}

module.exports = {
    // Gemini (giữ nguyên)
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel,
    getSafeModel,

    // vilao.ai
    VILAO_BASE_URL,
    VILAO_MODELS,
    VILAO_DEFAULT_MODEL,
    VILAO_MAX_TOKENS,
    isSupportedVilaoModel,
    getSafeVilaoModel,

    // Provider + nhãn
    AI_PROVIDERS,
    isValidProvider,
    normalizeProvider,
    formatAiLabel
};
