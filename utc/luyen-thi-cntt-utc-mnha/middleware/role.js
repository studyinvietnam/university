// middleware/role.js
const RENDER_FORBIDDEN = 'pages'; // views/pages.pug — trang "chờ duyệt"

/**
 * Chặn truy cập nếu user không có role nằm trong danh sách cho phép.
 * Dùng được cho cả route HTML và API.
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Chưa đăng nhập → về login
    if (!req.user) {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }
      return res.redirect('/auth/login');
    }

    // client → luôn chặn, chỉ cho xem pages.pug
    if (req.user.role === 'client') {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(403).json({ error: 'Tài khoản chưa được duyệt' });
      }
      return res.status(403).render(RENDER_FORBIDDEN, {
        title: 'Chờ duyệt',
        user: req.user,
        unreadCount: 0
      });
    }

    // Role không nằm trong danh sách → 403
    if (!allowedRoles.includes(req.user.role)) {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }
      return res.status(403).render('error', {
        title: 'Không có quyền',
        message: 'Bạn không có quyền truy cập trang này.',
        user: req.user
      });
    }

    next();
  };
}

// Shortcut
const adminOnly = requireRole(['admin']);
const studentOnly = requireRole(['student']);
const studentOrAdmin = requireRole(['admin', 'student']);

module.exports = { requireRole, adminOnly, studentOnly, studentOrAdmin };