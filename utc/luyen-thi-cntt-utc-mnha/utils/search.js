// utils/search.js
// Tìm kiếm không phân biệt hoa/thường VÀ không phân biệt dấu tiếng Việt
// (gõ "toan" vẫn ra "Toán", gõ "dien tu" ra "Điện tử").

const VN_GROUPS = {
    a: 'aàáảãạăằắẳẵặâầấẩẫậ',
    e: 'eèéẻẽẹêềếểễệ',
    i: 'iìíỉĩị',
    o: 'oòóỏõọôồốổỗộơờớởỡợ',
    u: 'uùúủũụưừứửữự',
    y: 'yỳýỷỹỵ',
    d: 'dđ',
};

function stripAccents(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chuỗi người dùng nhập -> chuỗi regex khớp mọi biến thể dấu
function toAccentInsensitivePattern(input) {
    const base = stripAccents(String(input || '').trim().toLowerCase()).slice(0, 100);
    let out = '';
    for (const ch of base) {
        const group = VN_GROUPS[ch];
        out += group ? `[${group}${group.toUpperCase()}]` : escapeRegex(ch);
    }
    return out;
}

function getSearchTerm(req) {
    const q = req.query.q;
    return (typeof q === 'string' ? q : '').trim().slice(0, 100);
}

// Trả về mệnh đề Mongo ({ $or: [...] }) hoặc null nếu không có từ khoá
function buildSearchClause(term, fields) {
    if (!term) return null;
    const pattern = toAccentInsensitivePattern(term);
    if (!pattern) return null;
    const re = new RegExp(pattern, 'i');
    return { $or: fields.map((f) => ({ [f]: re })) };
}

// Gộp bằng $and để không đè $or/$and của bộ lọc userKey
function withSearch(baseQuery, clause) {
    return clause ? { $and: [baseQuery, clause] } : baseQuery;
}

module.exports = { getSearchTerm, buildSearchClause, withSearch };
