// ============================================================
// CONFIG - DANH SÁCH MODEL GOOGLE AI (GEMINI) ĐƯỢC HỖ TRỢ
// ============================================================

const SUPPORTED_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-2-flash",
    "gemini-2-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3-flash",
    "gemini-3.1-pro",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemma-4-26b",
    "gemma-4-31b"
];

const DEFAULT_MODEL = "gemini-3.6-flash";

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