/**
 * Làm sạch nội dung do user nhập trước khi đưa vào prompt cho AI.
 *
 * Mục tiêu:
 *  - Loại bỏ các mẫu "ignore previous instructions", "you are now...", v.v.
 *  - Cắt bớt nếu quá dài (tránh tốn token / lỗi context).
 *  - Escape các delimiter đặc biệt (```, <|...|>, ###).
 *  - Bọc nội dung trong delimiter rõ ràng để AI phân biệt.
 */

const MAX_ANSWER_LENGTH = 20000; // 20k ký tự

// Các pattern prompt injection phổ biến
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /you\s+are\s+now\s+(a|an)?\s*\w+/gi,
    /new\s+instructions?:/gi,
    /system\s*prompt/gi,
    /<\|.*?\|>/g,                // <|im_start|> ... <|im_end|>
    /###\s*(instruction|system|assistant|user)/gi,
    /give\s+me\s+(a\s+)?(full|max|perfect)\s+(score|mark|point)/gi,
    /give\s+me\s+10\s*(score|point|mark)?/gi,
    /award\s+(full|max|perfect)\s+(score|mark|point)/gi
];

/**
 * Escape các delimiter có thể bị lợi dụng để "đóng" prompt.
 */
function escapeDelimiters(text) {
    return text
        .replace(/```/g, '` ` `')          // phá code fence
        .replace(/"""+/g, '"" ""')         // phá triple quote
        .replace(/<<<|>>>/g, '')           // bỏ <<< >>>
        .replace(/={4,}/g, '===')          // bỏ dấu = dài
        .replace(/-{4,}/g, '---');         // bỏ dấu - dài
}

/**
 * @param {string} raw - nội dung gốc
 * @param {object} opts
 * @param {number} [opts.maxLength] - độ dài tối đa (mặc định 20000)
 * @returns {string} nội dung đã làm sạch
 */
function sanitizeForAI(raw, opts = {}) {
    const maxLength = opts.maxLength || MAX_ANSWER_LENGTH;

    if (raw == null) return '';

    let text = String(raw);

    // Loại HTML tags nếu cần (nếu muốn giữ code thì bỏ dòng này)
    // text = text.replace(/<[^>]+>/g, ' ');

    // Chuẩn hoá Unicode để tránh homograph attack
    text = text.normalize('NFC');

    // Escape delimiter
    text = escapeDelimiters(text);

    // Loại bỏ các mẫu injection
    for (const pattern of INJECTION_PATTERNS) {
        text = text.replace(pattern, '[đã lọc]');
    }

    // Cắt độ dài
    if (text.length > maxLength) {
        text =
            text.slice(0, maxLength) +
            `\n\n[...đã cắt bớt ${text.length - maxLength} ký tự...]`;
    }

    return text.trim();
}

/**
 * Bọc nội dung user trong delimiter rõ ràng để AI phân biệt
 * giữa "hướng dẫn hệ thống" và "nội dung do user nhập".
 */
function wrapUserContent(label, content) {
    const clean = sanitizeForAI(content);
    return [
        `<<<BEGIN_${label}>>>`,
        clean,
        `<<<END_${label}>>>`
    ].join('\n');
}

module.exports = {
    sanitizeForAI,
    wrapUserContent,
    escapeDelimiters
};