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

module.exports = {
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel,
    getSafeModel
};