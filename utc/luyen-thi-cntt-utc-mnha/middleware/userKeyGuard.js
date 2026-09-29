// middleware/userKeyGuard.js
const { getActor, isDefaultAdmin, isOrgAdmin } = require('../services/userKeyService');

function wantsJson(req) {
    return (
        req.xhr ||
        req.originalUrl.startsWith('/api/') ||
        req.accepts(['html', 'json']) === 'json'
    );
}

/**
 * CHẶN Ở TẦNG ROUTE: chỉ admin default (role=admin, userKey=null) đi qua.
 * Gắn vào MỌI route liên quan AI Key (trang, form, /api/...), ví dụ:
 *
 *   router.use('/admin/aikeys', requireDefaultAdmin, aikeyRoutes);
 *
 * Cũng dùng cho các route "Quản lý User Key".
 * Ẩn menu trong view KHÔNG đủ — gọi thẳng URL vẫn phải bị 403.
 */
async function requireDefaultAdmin(req, res, next) {
    try {
        const actor = await getActor(req);
        if (isDefaultAdmin(actor)) return next();

        const message = 'Chức năng này chỉ dành cho quản trị viên hệ thống.';
        if (wantsJson(req)) {
            return res.status(403).json({ error: message });
        }
        return res.status(403).render('error', {
            title: 'Không có quyền',
            message,
            user: req.user,
            statusCode: 403,
            stack: null
        });
    } catch (err) {
        return next(err);
    }
}

/**
 * Gắn res.locals.isDefaultAdmin / isOrgAdmin để layout/dashboard.pug
 * ẩn menu "API Key" và "Quản lý User Key" với admin user_key.
 * Mount sau middleware auth, trước khi render view admin.
 */
async function attachAdminFlags(req, res, next) {
    try {
        const actor = await getActor(req);
        res.locals.isDefaultAdmin = isDefaultAdmin(actor);
        res.locals.isOrgAdmin = isOrgAdmin(actor);
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = { requireDefaultAdmin, attachAdminFlags };
