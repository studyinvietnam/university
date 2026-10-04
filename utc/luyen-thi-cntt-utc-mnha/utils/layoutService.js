// ============================================================
// services/layoutService.js
// Layout (logo / chữ dưới logo / chân trang) theo user_key.
//   - Validate + lưu layout (logo → GitHub trước, MongoDB sau)
//   - Tính res.locals.brand cho từng user
//   - Đọc logo từ GitHub (có cache bộ nhớ ngắn)
// ============================================================

const mongoose = require('mongoose');
const UserKey = require('../models/UserKey');
const github = require('./githubService');

const DEFAULT_BRAND = Object.freeze({
    logoUrl: '/images/logo.png',
    logoAlt: 'Luyện thi CNTT UTC',
    subText: 'UTC',
    footerText: null
});

const MAX_LOGO_BYTES = 512 * 1024;
const MAX_BRAND_SUB = 20;
const MAX_FOOTER = 100;

class LayoutError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'LayoutError';
        this.status = status;
    }
}

function defaultBrand() {
    return { ...DEFAULT_BRAND };
}

// ------------------------------------------------------------
// VALIDATE
// ------------------------------------------------------------

/** Nhận diện ảnh bằng MAGIC BYTES (không tin Content-Type / đuôi file). Không nhận SVG. */
function detectImage(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return { ext: 'png', mime: 'image/png' };

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { ext: 'jpg', mime: 'image/jpeg' };
    }

    // WebP: "RIFF" .... "WEBP"
    if (
        buf.toString('ascii', 0, 4) === 'RIFF' &&
        buf.toString('ascii', 8, 12) === 'WEBP'
    ) return { ext: 'webp', mime: 'image/webp' };

    return null;
}

function cleanText(value, max, label) {
    const text = String(value == null ? '' : value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')   // bỏ ký tự điều khiển / xuống dòng
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return null;                       // rỗng → null (về mặc định)
    if ([...text].length > max) {
        throw new LayoutError(`${label} tối đa ${max} ký tự.`);
    }
    return text;
}

function normalizeTexts({ brandSub, footerText }) {
    const sub = cleanText(brandSub, MAX_BRAND_SUB, 'Chữ dưới logo');
    return {
        brandSub: sub ? sub.toUpperCase() : null,   // luôn IN HOA
        footerText: cleanText(footerText, MAX_FOOTER, 'Chân trang')
    };
}

function assertObjectId(id) {
    if (!mongoose.isValidObjectId(id)) throw new LayoutError('Tổ chức không hợp lệ.');
}

// ------------------------------------------------------------
// LƯU / RESET
// ------------------------------------------------------------

/**
 * @param {string} userKeyId  lấy từ admin đang đăng nhập (req.actor.userKey), KHÔNG từ client
 * @param {{file?: {buffer:Buffer,size:number}, brandSub?:string, footerText?:string}} input
 */
async function saveLayout(userKeyId, input) {
    assertObjectId(userKeyId);

    // 1) Validate hết trước khi đụng GitHub
    const texts = normalizeTexts(input);
    const file = input.file && input.file.size > 0 ? input.file : null;

    let kind = null;
    if (file) {
        if (file.buffer.length > MAX_LOGO_BYTES) {
            throw new LayoutError('Logo tối đa 512KB.');
        }
        kind = detectImage(file.buffer);
        if (!kind) throw new LayoutError('Logo chỉ nhận PNG, JPEG hoặc WebP.');
    }

    const uk = await UserKey.findById(userKeyId).select('active layout.logoFile').lean();
    if (!uk) throw new LayoutError('Không tìm thấy tổ chức.', 404);

    const $set = {
        'layout.brandSub': texts.brandSub,
        'layout.footerText': texts.footerText
    };

    // 2) Ghi GitHub TRƯỚC; lỗi → ném ra, MongoDB giữ nguyên (logo cũ còn)
    let newPath = null;
    if (file) {
        newPath = `layouts/${userKeyId}/logo.${kind.ext}`;
        await github.writeBinaryFile(newPath, file.buffer, `Update logo ${userKeyId}`);
        $set['layout.logoFile'] = newPath;
        $set['layout.logoVersion'] = Date.now();
    }

    // 3) GitHub OK mới cập nhật MongoDB
    await UserKey.updateOne({ _id: userKeyId }, { $set });

    // 4) Đổi đuôi (png → webp...) thì dọn file cũ, lỗi cũng không sao
    const oldPath = uk.layout && uk.layout.logoFile;
    if (newPath && oldPath && oldPath !== newPath) {
        github.deleteFile(oldPath, `Remove old logo ${userKeyId}`).catch((e) => {
            console.warn('[layout] không xoá được logo cũ:', e.message);
        });
    }

    return { logoChanged: Boolean(file) };
}

/** "Về mặc định": đặt cả 4 field về null. Không xoá file trên GitHub. */
async function resetLayout(userKeyId) {
    assertObjectId(userKeyId);
    const res = await UserKey.updateOne(
        { _id: userKeyId },
        {
            $set: {
                'layout.logoFile': null,
                'layout.logoVersion': null,
                'layout.brandSub': null,
                'layout.footerText': null
            }
        }
    );
    if (!res.matchedCount) throw new LayoutError('Không tìm thấy tổ chức.', 404);
}

// ------------------------------------------------------------
// TÍNH BRAND CHO USER
// ------------------------------------------------------------

function hasLayout(uk) {
    const l = uk && uk.layout;
    return Boolean(l && (l.logoFile || l.brandSub || l.footerText));
}

function brandFromUserKey(uk) {
    const l = uk.layout || {};
    return {
        logoUrl: l.logoFile
            ? `/layout/logo/${uk._id}?v=${l.logoVersion || 0}`
            : DEFAULT_BRAND.logoUrl,
        logoAlt: l.logoFile ? (uk.name || DEFAULT_BRAND.logoAlt) : DEFAULT_BRAND.logoAlt,
        subText: l.brandSub ? String(l.brandSub).toUpperCase() : DEFAULT_BRAND.subText,
        footerText: l.footerText || null
    };
}

/**
 * Thứ tự:
 *  1. Admin default → mặc định
 *  2. Có userKey → layout của userKey đó (nếu active)
 *  3. userKey=null nhưng có connectedUserKeys → user_key ĐẦU TIÊN theo thứ tự
 *     kết nối có cấu hình layout (và đang active)
 *  4. Còn lại → mặc định
 * @param {object|null} user  bản user lean đọc từ DB
 */
async function resolveBrand(user) {
    if (!user) return defaultBrand();
    if (user.role === 'admin' && !user.userKey) return defaultBrand();

    if (user.userKey) {
        const uk = await UserKey.findOne({ _id: user.userKey, active: true })
            .select('name layout').lean();
        return uk && hasLayout(uk) ? brandFromUserKey(uk) : defaultBrand();
    }

    const connected = user.connectedUserKeys || [];
    if (!connected.length) return defaultBrand();

    const found = await UserKey.find({ _id: { $in: connected }, active: true })
        .select('name layout').lean();
    const byId = new Map(found.map((uk) => [String(uk._id), uk]));

    for (const id of connected) {                    // giữ đúng thứ tự kết nối
        const uk = byId.get(String(id));
        if (uk && hasLayout(uk)) return brandFromUserKey(uk);
    }
    return defaultBrand();
}

// ------------------------------------------------------------
// ĐỌC LOGO (route GET /layout/logo/:userKeyId)
// ------------------------------------------------------------

const logoCache = new Map();            // key `${id}:${version}` → { buffer, mime, at }
const LOGO_TTL = 10 * 60 * 1000;
const LOGO_CACHE_MAX = 50;

function mimeFromPath(p) {
    if (/\.png$/i.test(p)) return 'image/png';
    if (/\.webp$/i.test(p)) return 'image/webp';
    return 'image/jpeg';
}

/** @returns {Promise<{buffer:Buffer,mime:string}|null>} null → dùng logo mặc định */
async function getLogo(userKeyId) {
    if (!mongoose.isValidObjectId(userKeyId)) return null;

    const uk = await UserKey.findOne({ _id: userKeyId, active: true })
        .select('layout.logoFile layout.logoVersion').lean();
    const file = uk && uk.layout && uk.layout.logoFile;
    if (!file) return null;

    const key = `${userKeyId}:${uk.layout.logoVersion || 0}`;
    const hit = logoCache.get(key);
    if (hit && Date.now() - hit.at < LOGO_TTL) return hit;

    const buffer = await github.readBinaryFile(file);
    if (!buffer) return null;

    // Kiểm tra lại magic bytes lúc phục vụ → không bao giờ trả thứ không phải ảnh
    const kind = detectImage(buffer);
    if (!kind) return null;

    if (logoCache.size >= LOGO_CACHE_MAX) {
        logoCache.delete(logoCache.keys().next().value);
    }
    const entry = { buffer, mime: kind.mime || mimeFromPath(file), at: Date.now() };
    logoCache.set(key, entry);
    return entry;
}

// ------------------------------------------------------------
// AUDIT LOG — CHỈNH CHO KHỚP schema AuditLog của bạn (chưa được upload).
// Lỗi ghi log chỉ cảnh báo, không làm hỏng thao tác chính.
// ------------------------------------------------------------
async function audit(req, action, extra = {}) {
    try {
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            actor: req.actor ? req.actor._id : (req.user && (req.user._id || req.user.id)),
            action,
            userKey: req.actor ? req.actor.userKey : undefined,
            ...extra
        });
    } catch (e) {
        console.warn(`[audit] không ghi được "${action}":`, e.message);
    }
}

module.exports = {
    DEFAULT_BRAND,
    LayoutError,
    MAX_LOGO_BYTES,
    MAX_BRAND_SUB,
    MAX_FOOTER,
    defaultBrand,
    detectImage,
    normalizeTexts,
    saveLayout,
    resetLayout,
    resolveBrand,
    getLogo,
    audit
};
