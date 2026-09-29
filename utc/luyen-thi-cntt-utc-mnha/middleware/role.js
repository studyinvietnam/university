// middleware/role.js
const { isDefaultAdmin, wantsJson } = require('./auth');

const RENDER_FORBIDDEN = 'pages'; // views/pages.pug — trang "chờ duyệt"

function forbidden(req, res, message) {
  if (wantsJson(req)) {
    // có cả `error` (route /api) lẫn `message` (route admin dạng {success:false,message})
    return res.status(403).json({ success: false, error: message, message });
  }
  return res.status(403).render('error', {
    title: 'Không có quyền',
    message,
    statusCode: 403,
    stack: null,
    user: req.user
  });
}

/**
 * Chặn truy cập nếu user không có role nằm trong danh sách cho phép.
 * Dùng được cho cả route HTML và API. Đọc req.user (đã nạp từ DB bởi attachUser).
 *
 * Chấp nhận cả requireRole('admin') lẫn requireRole(['admin', 'student']).
 */
function requireRole(allowedRoles = []) {
  const allowed = [].concat(allowedRoles);

  return (req, res, next) => {
    const user = req.user;

    // Chưa đăng nhập → về login
    if (!user) {
      if (wantsJson(req)) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }
      return res.redirect('/auth/login');
    }

    // client, hoặc tài khoản (không phải admin) còn pending → chỉ cho xem pages.pug
    const isPending = user.role !== 'admin' && user.status === 'pending';
    if (user.role === 'client' || isPending) {
      if (wantsJson(req)) {
        return res.status(403).json({ error: 'Tài khoản chưa được duyệt' });
      }
      return res.status(403).render(RENDER_FORBIDDEN, {
        title: 'Chờ duyệt',
        user,
        unreadCount: 0
      });
    }

    // Role không nằm trong danh sách → 403
    if (!allowed.includes(user.role)) {
      return forbidden(req, res, 'Bạn không có quyền truy cập trang này.');
    }

    next();
  };
}

// Shortcut
const adminOnly = requireRole(['admin']);
const studentOnly = requireRole(['student']);
const studentOrAdmin = requireRole(['admin', 'student']);

/**
 * ★ Chỉ ADMIN DEFAULT (role admin + userKey null).
 * Admin user_key bị chặn hoàn toàn ở tầng route (không chỉ ẩn menu).
 * Gắn cho: AI Key, User Key, Vai trò, Audit log, đặt prompt mặc định...
 */
function requireDefaultAdmin(req, res, next) {
  adminOnly(req, res, (err) => {
    if (err) return next(err);
    if (!isDefaultAdmin(req.user)) {
      return forbidden(
        req,
        res,
        'Chức năng này chỉ dành cho quản trị viên hệ thống (admin default).'
      );
    }
    next();
  });
}

/**
 * ★ Actor có được sửa/xoá tài nguyên do `ownerId` tạo (createdBy) không?
 *   - admin default  : mọi tài nguyên
 *   - admin user_key : chỉ tài nguyên có createdBy = chính mình
 *   - role khác      : không
 * `ownerId` có thể là ObjectId, string hoặc object đã populate ({ _id }).
 */
function canManageOwned(actor, ownerId) {
  if (!actor || actor.role !== 'admin') return false;
  if (isDefaultAdmin(actor)) return true;
  if (!ownerId) return false;
  return String(ownerId._id || ownerId) === String(actor._id);
}

/**
 * ★ Filter Mongo giới hạn Subject/Lesson theo người tạo.
 *   - admin default  → {} (thấy hết)
 *   - admin user_key → { createdBy: actor._id }
 * Nếu schema của Model chưa có `createdBy` thì NÉM LỖI, vì Mongoose (strictQuery)
 * có thể lặng lẽ bỏ điều kiện lạ → trả về toàn bộ dữ liệu, lộ chéo tổ chức.
 */
function ownContentFilter(actor, Model) {
  if (!actor) return { _id: null }; // không khớp bản ghi nào
  if (isDefaultAdmin(actor)) return {};
  if (!Model.schema.path('createdBy')) {
    throw new Error(
      `Model ${Model.modelName} chưa có field createdBy — không thể lọc dữ liệu theo admin user_key.`
    );
  }
  return { createdBy: actor._id };
}

module.exports = {
  requireRole,
  adminOnly,
  studentOnly,
  studentOrAdmin,
  requireDefaultAdmin,
  canManageOwned,
  ownContentFilter
};
