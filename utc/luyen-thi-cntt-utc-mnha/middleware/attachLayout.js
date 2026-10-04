// middleware/attachLayout.js
// Gắn cho MỌI view: res.locals.brand + cờ menu (isDefaultAdmin / isOrgAdmin / canEditLayout).
// Mount SAU middleware nạp user trong server.js (dùng req.freshUser).
// Lỗi ở đây không bao giờ được làm hỏng trang → rơi về layout mặc định.

const { defaultBrand, resolveBrand } = require('../services/layoutService');

module.exports = async function attachLayout(req, res, next) {
    res.locals.brand = defaultBrand();
    res.locals.isDefaultAdmin = false;
    res.locals.isOrgAdmin = false;
    res.locals.canEditLayout = false;

    const u = req.freshUser;
    if (!u) return next();

    try {
        const isAdmin = u.role === 'admin';
        res.locals.isDefaultAdmin = isAdmin && !u.userKey;
        res.locals.isOrgAdmin = isAdmin && Boolean(u.userKey);
        // Chỉ để hiện/ẩn menu. Quyền thật do requireLayoutEditor kiểm tra ở route.
        res.locals.canEditLayout = res.locals.isOrgAdmin && u.canEditLayout === true;

        res.locals.brand = await resolveBrand(u);
    } catch (err) {
        console.warn('[attachLayout]', err.message);
    }
    next();
};
