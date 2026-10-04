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

// ============================================================
// ★ TRẮC NGHIỆM
// ============================================================

// sanitize-html (package.json: "sanitize-html"). Nếu thiếu package → FAIL CLOSED:
// escape toàn bộ HTML thay vì để HTML thô lọt qua.
let sanitizeHtmlLib = null;
try {
    sanitizeHtmlLib = require('sanitize-html');
} catch (_) {
    console.warn('⚠️ [sanitizeService] Chưa cài sanitize-html — giải thích sẽ bị escape toàn bộ. Chạy: npm i sanitize-html');
}

const EXPLANATION_ALLOWED_TAGS = [
    'b', 'i', 'u', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li',
    'code', 'pre', 'sub', 'sup', 'span', 'a'
];

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Làm sạch HTML giải thích (`++)`) của câu trắc nghiệm.
 * Gọi 2 lớp: khi LƯU đề và khi HIỂN THỊ. Chỉ sau hàm này mới được render bằng `!=`.
 */
function sanitizeExplanationHtml(raw, opts = {}) {
    if (raw == null || raw === '') return '';
    const maxLength = opts.maxLength || 3000;
    const input = String(raw).slice(0, maxLength);

    if (!sanitizeHtmlLib) return escapeHtml(input);

    return sanitizeHtmlLib(input, {
        allowedTags: EXPLANATION_ALLOWED_TAGS,
        allowedAttributes: {
            a: ['href', 'rel', 'target'],
            span: [] // không cho style/class/on*
        },
        allowedSchemes: ['https'],
        allowedSchemesAppliedToAttributes: ['href'],
        allowProtocolRelative: false,
        disallowedTagsMode: 'discard',
        transformTags: {
            a: (tagName, attribs) => ({
                tagName: 'a',
                attribs: { href: attribs.href || '', rel: 'noopener noreferrer', target: '_blank' }
            })
        }
    }).trim();
}

/**
 * Dữ liệu bài làm trắc nghiệm gửi cho AI. Đáp án gõ tự do (ô `fill`) là nơi
 * sinh viên có thể chèn lệnh → sanitize từng giá trị rồi bọc delimiter,
 * giống {bài_làm} của tự luận.
 *
 * @param {Array<{id:string, part:string, studentAnswer:any, correct:boolean}>} items
 */
function wrapQuizAnswers(items = []) {
    const lines = items.map((it) => {
        const ans = Array.isArray(it.studentAnswer)
            ? it.studentAnswer.join(', ')
            : (it.studentAnswer === null || it.studentAnswer === undefined || it.studentAnswer === ''
                ? '(bỏ trống)'
                : String(it.studentAnswer));
        const clean = sanitizeForAI(ans, { maxLength: 500 }) || '(bỏ trống)';
        return `${it.id} [${it.correct ? 'ĐÚNG' : 'SAI'}]: ${clean}`;
    });
    return [
        '<<<BEGIN_QUIZ_ANSWERS>>>',
        lines.join('\n'),
        '<<<END_QUIZ_ANSWERS>>>'
    ].join('\n');
}

module.exports = {
    sanitizeForAI,
    wrapUserContent,
    escapeDelimiters,
    // trắc nghiệm
    sanitizeExplanationHtml,
    wrapQuizAnswers,
    escapeHtml
};