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
//
// ⚠️ LƯU Ý QUAN TRỌNG VỀ LỖI 403 "Please subscribe to model":
//    vilao.ai yêu cầu MỖI API KEY phải subscribe (đăng ký) TỪNG MODEL
//    riêng trên dashboard của họ. Nếu key chưa subscribe model đang gọi,
//    API trả về: 403 "Please subscribe to model in the API Key: <model>"
//
//    → Cách xử lý:
//      (A) Vào dashboard vilao.ai bật model đó cho key, HOẶC
//      (B) Đổi model sang model mà key đã subscribe (thường gpt-4o-mini
//          là model rẻ/nhàn nhất, hay được bật sẵn).
//
//    Danh sách dưới đây liệt kê các model OpenAI-compatible phổ biến
//    mà vilao.ai thường cung cấp — admin có thể chọn khi tạo key.
//    Nếu vilao.ai đổi tên model, cập nhật lại danh sách này.
// ============================================================

const VILAO_BASE_URL = "https://api.vilao.ai";

// Danh sách model vilao.ai (OpenAI-compatible).
// Thứ tự: rẻ/nhẹ → mạnh/đắt. Model nào key chưa subscribe sẽ trả 403
// "Please subscribe to model in the API Key: <model>" khi gọi.
const VILAO_MODELS = [
    // === OpenAI (thường có sẵn, khuyến nghị dùng để tránh 403) ===
    "gpt-4o-mini",       // ← MẶC ĐỊNH MỚI (thường được bật sẵn, rẻ)
    "gpt-4o",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4-turbo",
    "gpt-3.5-turbo",

    // === Anthropic (nếu vilao.ai hỗ trợ) ===
    "occ/claude-opus-5",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-opus",

    // === Google (nếu vilao.ai route qua) ===
    "gemini-1.5-pro",
    "gemini-1.5-flash",

    // === Meta (nếu vilao.ai hỗ trợ) ===
    "llama-3.1-70b",
    "llama-3.1-8b",

    // === DeepSeek (nếu vilao.ai hỗ trợ) ===
    "chib/deepseek-v4.1-flash"
];

// ⚠️ Đổi từ "gpt-4o" → "gpt-4o-mini" để tránh lỗi 403 subscribe.
//    Nếu key của bạn ĐÃ subscribe "gpt-4o", đổi lại thành "gpt-4o" cũng được.
//    Hoặc tốt hơn: admin chọn model riêng cho từng key, lưu ở field `AIKey.model` trên MongoDB (xem resolveModelForKey bên dưới).
const VILAO_DEFAULT_MODEL = "gpt-4o-mini";

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
// ★ PHÁT HIỆN LỖI 403 "SUBSCRIBE MODEL" CỦA VILAO.AI
// ------------------------------------------------------------
// vilao.ai trả về chuỗi kiểu:
//   403 "Please subscribe to model in the API Key: gpt-4o"
//   403 "Please subscribe to model in the API Key: <tên-model>"
//
// Hàm này giúp aiService.js phân biệt:
//   - Lỗi subscribe model (key thiếu quyền model) → có thể:
//       * đổi sang key vilao.ai khác, HOẶC
//       * đổi model sang model khác mà key đã subscribe,
//     nhưng TUYỆT ĐỐI KHÔNG tự nhảy sang Gemini (đúng nguyên tắc README).
//   - Lỗi 403/401/429/5xx khác → xử lý theo logic riêng.
// ============================================================

function isVilaoSubscribeError(statusCode, errorMessage) {
    // Chỉ áp dụng cho vilao.ai
    if (Number(statusCode) !== 403) return false;
    if (typeof errorMessage !== "string") return false;
    // Khớp không phân biệt hoa/thường để chịu được vilao.ai đổi wording
    return /subscribe\s+to\s+model/i.test(errorMessage);
}

// Trích tên model bị thiếu subscribe từ message lỗi (nếu có).
// VD: "Please subscribe to model in the API Key: gpt-4o" → "gpt-4o"
// Trả về null nếu không tìm thấy.
function extractVilaoMissingModel(errorMessage) {
    if (typeof errorMessage !== "string") return null;
    const m = errorMessage.match(/API\s*Key\s*:\s*([A-Za-z0-9._\-:]+)/i);
    return m ? m[1] : null;
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

// ============================================================
// ★ CHỌN MODEL THEO PROVIDER (THÊM MỚI)
// ------------------------------------------------------------
// Nguyên tắc:
//   - Provider 'gemini' (hoặc 'google', hoặc thiếu) → GIỮ NGUYÊN hành vi cũ:
//     getSafeModel() + DEFAULT_MODEL. Không đổi gì ở nhánh Gemini.
//   - Provider 'vilao' → model lấy từ MONGODB (field `model` của AIKey,
//     mỗi key subscribe model khác nhau), không hardcode cứng.
//
// File này KHÔNG truy cập DB. Nơi gọi (aiService.js) đã load AIKey từ
// MongoDB rồi truyền cả document vào đây → config vẫn thuần, dễ test.
//
// ⚠️ Query .lean() không áp default của Mongoose → luôn đi qua
//    normalizeProvider(), đừng đọc key.provider trực tiếp.
// ============================================================

// Tên model vilao.ai: cho phép tên tuỳ ý admin nhập (vì model nào được bật
// phụ thuộc từng key trên dashboard vilao.ai), nhưng chặn ký tự lạ/injection.
const MODEL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9._\-:\/]{0,99}$/;

function isValidModelName(model) {
    return typeof model === "string" && MODEL_NAME_REGEX.test(model.trim());
}

// Model mặc định theo provider
function getDefaultModelByProvider(provider) {
    return normalizeProvider(provider) === "vilao" ? VILAO_DEFAULT_MODEL : DEFAULT_MODEL;
}

// Làm sạch 1 tên model theo provider (không đụng DB).
//   gemini → y hệt getSafeModel (chỉ nhận model trong SUPPORTED_MODELS)
//   vilao  → nhận tên hợp lệ bất kỳ (không bắt buộc nằm trong VILAO_MODELS),
//            nếu là model Gemini (vd "gemini-flash-latest" lưu sẵn ở Submission)
//            hoặc rỗng/sai định dạng → VILAO_DEFAULT_MODEL
function getSafeModelByProvider(provider, model = null) {
    if (normalizeProvider(provider) !== "vilao") return getSafeModel(model);
    if (!isValidModelName(model)) return VILAO_DEFAULT_MODEL;
    const name = model.trim();
    if (isSupportedModel(name)) return VILAO_DEFAULT_MODEL; // tên Gemini gửi sang vilao sẽ lỗi
    return name;
}

// Chọn model cuối cùng từ document AIKey lấy từ MongoDB.
//   keyDoc          : document AIKey (có thể .lean(), có thể null)
//   requestedModel  : model được yêu cầu (Submission/Lesson/admin test), có thể null
//
// Thứ tự ưu tiên:
//   gemini : requestedModel → keyDoc.model → DEFAULT_MODEL   (giữ hành vi cũ)
//   vilao  : keyDoc.model   → requestedModel → VILAO_DEFAULT_MODEL
//            (key vilao.ai phải subscribe đúng model → model gắn trên key thắng,
//             tránh lỗi 403 "Please subscribe to model")
function resolveModelForKey(keyDoc, requestedModel = null) {
    const provider = normalizeProvider(keyDoc && keyDoc.provider);
    const keyModel = keyDoc && keyDoc.model;

    if (provider === "vilao") {
        if (isValidModelName(keyModel) && !isSupportedModel(keyModel.trim())) {
            return keyModel.trim();
        }
        return getSafeModelByProvider("vilao", requestedModel);
    }

    // Gemini: giữ nguyên — requestedModel hợp lệ thì dùng, không thì thử model trên key, cuối cùng DEFAULT_MODEL
    if (isSupportedModel(requestedModel)) return requestedModel;
    if (isSupportedModel(keyModel)) return keyModel;
    return DEFAULT_MODEL;
}

// Tiện cho aiService.js: một lần lấy đủ thông tin cần gọi + snapshot lưu Submission.
//   → { provider: 'gemini'|'vilao', model, keyName, label }
function resolveAiTarget(keyDoc, requestedModel = null) {
    const provider = normalizeProvider(keyDoc && keyDoc.provider);
    const keyName = keyDoc && typeof keyDoc.name === "string" ? keyDoc.name : "";
    return {
        provider,
        model: resolveModelForKey(keyDoc, requestedModel),
        keyName,
        label: formatAiLabel(provider, keyName)
    };
}

// Danh sách model để đổ vào dropdown, THEO KEY (key lấy từ MongoDB).
//   gemini → SUPPORTED_MODELS + DEFAULT_MODEL (y như cũ)
//   vilao  → key đã gắn `model` (đã subscribe) → CHỈ model đó (fixed: true);
//            chưa gắn → VILAO_MODELS (gợi ý) + VILAO_DEFAULT_MODEL.
//   Không có key → null.
function getModelOptionsForKey(keyDoc) {
    if (!keyDoc) return null;
    const provider = normalizeProvider(keyDoc.provider);

    if (provider === "vilao") {
        const km = typeof keyDoc.model === "string" ? keyDoc.model.trim() : "";
        if (isValidModelName(km) && !isSupportedModel(km)) {
            return { provider, models: [km], defaultModel: km, fixed: true };
        }
        return {
            provider,
            models: VILAO_MODELS.slice(),
            defaultModel: VILAO_DEFAULT_MODEL,
            fixed: false
        };
    }

    return {
        provider,
        models: SUPPORTED_MODELS.slice(),
        defaultModel: DEFAULT_MODEL,
        fixed: false
    };
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

    // Phát hiện lỗi subscribe model của vilao.ai
    isVilaoSubscribeError,
    extractVilaoMissingModel,

    // Provider + nhãn
    AI_PROVIDERS,
    isValidProvider,
    normalizeProvider,
    formatAiLabel,

    // Chọn model theo provider (model lấy từ AIKey trong MongoDB)
    isValidModelName,
    getDefaultModelByProvider,
    getSafeModelByProvider,
    resolveModelForKey,
    resolveAiTarget,
    getModelOptionsForKey
};