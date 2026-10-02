// utils/aiLabel.js
// Nhãn hiển thị nhà cung cấp AI. Dữ liệu cũ không có provider => coi là Gemini.
//   gemini + "Key A" -> "Gemini: Key A"      (không có tên -> "Gemini")
//   vilao  + "Key B" -> "vilao.ai: Key B"    (không có tên -> "vilao.ai")

const PROVIDER_NAMES = {
    gemini: 'Gemini',
    vilao: 'vilao.ai'
};

function normalizeProvider(provider) {
    return provider === 'vilao' ? 'vilao' : 'gemini';
}

function providerName(provider) {
    return PROVIDER_NAMES[normalizeProvider(provider)];
}

function formatAiLabel(provider, keyName) {
    const base = providerName(provider);
    const name = keyName == null ? '' : String(keyName).trim();
    return name ? `${base}: ${name}` : base;
}

module.exports = { formatAiLabel, providerName, normalizeProvider, PROVIDER_NAMES };
