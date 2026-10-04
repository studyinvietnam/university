// middleware/userKeyGuard.js
const { getActor, isDefaultAdmin, isOrgAdmin } = require('../services/userKeyService');
const User = require('../models/User');

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

// ------------------------------------------------------------
// Từ chối request: JSON cho API/AJAX, trang lỗi cho trình duyệt.
// Chưa đăng nhập → 401 (HTML thì chuyển về trang đăng nhập).
// ------------------------------------------------------------
function deny(req, res, status, message) {
    if (status === 401 && !wantsJson(req)) {
        return res.redirect('/auth/login');
    }
    if (wantsJson(req)) {
        return res.status(status).json({ error: message });
    }
    return res.status(status).render('error', {
        title: 'Không có quyền',
        message,
        user: req.user,
        statusCode: status,
        stack: null
    });
}

/**
 * Đọc LẠI admin từ DB theo req.user._id (không tin session).
 * Trả null nếu chưa đăng nhập / không còn tồn tại.
 */
async function loadFreshUser(req) {
    const id = req.user && (req.user._id || req.user.id);
    if (!id) return null;
    const fresh = await User.findById(id).select('role status userKey canEditLayout').lean();
    // Route mới mount trước adminRoutes nên không đi qua adminOnly → tự chặn tài khoản bị khoá
    if (fresh && ['disabled', 'rejected'].includes(fresh.status)) return null;
    return fresh;
}

/**
 * Chỉ admin THUỘC MỘT user_key (role=admin, userKey != null). Admin default → 403.
 * Dùng cho /admin/users/connect. Gắn req.actor = { _id, role, userKey, canEditLayout }.
 * Mọi truy vấn phía sau phải lọc theo req.actor.userKey — KHÔNG nhận userKey từ client.
 */
async function requireUserKeyAdmin(req, res, next) {
    try {
        const fresh = await loadFreshUser(req);
        if (!fresh) return deny(req, res, 401, 'Bạn cần đăng nhập.');

        if (fresh.role !== 'admin' || !fresh.userKey) {
            return deny(req, res, 403, 'Chức năng này chỉ dành cho quản trị viên của tổ chức (user_key).');
        }

        req.actor = fresh;
        return next();
    } catch (err) {
        return next(err);
    }
}

/**
 * Admin user_key ĐƯỢC CẤP canEditLayout. Quyền đọc lại từ DB ở MỖI request:
 * vừa bị thu hồi thì lần gọi kế tiếp bị chặn ngay. Gắn req.actor như trên.
 */
async function requireLayoutEditor(req, res, next) {
    try {
        const fresh = await loadFreshUser(req);
        if (!fresh) return deny(req, res, 401, 'Bạn cần đăng nhập.');

        if (fresh.role !== 'admin' || !fresh.userKey || fresh.canEditLayout !== true) {
            return deny(req, res, 403, 'Bạn chưa được cấp quyền sửa giao diện của tổ chức.');
        }

        req.actor = fresh;
        return next();
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    requireDefaultAdmin,
    requireUserKeyAdmin,
    requireLayoutEditor,
    attachAdminFlags
};
