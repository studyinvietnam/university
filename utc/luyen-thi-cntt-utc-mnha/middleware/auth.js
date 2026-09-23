// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware gắn `req.user` nếu request có session/JWT hợp lệ.
 * KHÔNG chặn — khách vẫn đi qua bình thường (để vào /auth/login, /auth/register).
 *
 * Ưu tiên đọc user từ:
 *   1. session (express-session)
 *   2. JWT trong cookie `token` hoặc header `Authorization: Bearer ...`
 *
 * Nếu user đã bị xoá (deletedForever) hoặc không tồn tại → coi như Guest.
 */
async function attachUser(req, res, next) {
  try {
    let userId = null;

    // 1) Session
    if (req.session && req.session.userId) {
      userId = req.session.userId;
    }

    // 2) JWT từ cookie
    if (!userId && req.cookies && req.cookies.token) {
      try {
        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = payload.sub || payload.userId || payload.id;
      } catch (_) {
        // token hỏng/hết hạn → bỏ qua
      }
    }

    // 3) JWT từ header Authorization
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
          userId = payload.sub || payload.userId || payload.id;
        } catch (_) { /* ignore */ }
      }
    }

    if (userId) {
      const user = await User.findById(userId).select('-passwordHash');
      if (user && !user.deletedForever) {
        req.user = user;
        // Cho view dùng trực tiếp
        res.locals.user = user;
      }
    }

    next();
  } catch (err) {
    console.error('[attachUser] Lỗi:', err.message);
    next(); // không chặn toàn bộ request chỉ vì lỗi decode
  }
}

/**
 * Bắt buộc đã đăng nhập — nếu chưa thì chuyển về /auth/login.
 * Dùng cho các route cần user chắc chắn.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    // Nếu là request API → trả JSON thay vì redirect
    if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    // Lưu URL đang truy cập để redirect lại sau khi login
    if (req.session) req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
}

/**
 * Bắt buộc đã xác thực email (verified = true).
 * Nếu chưa → chuyển về trang nhập OTP.
 */
function requireVerified(req, res, next) {
  if (!req.user) return requireAuth(req, res, next);
  if (!req.user.verified) {
    if (req.path.startsWith('/api') || req.xhr) {
      return res.status(403).json({ error: 'Tài khoản chưa xác thực email' });
    }
    return res.redirect('/auth/verify-otp');
  }
  next();
}

/**
 * Sinh JWT cho user (dùng khi login).
 */
function signToken(user, expiresIn = '7d') {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Xoá session & cookie — dùng khi logout / revoke JWT.
 */
function clearAuth(req, res) {
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.clearCookie('token');
  res.clearCookie('connect.sid');
}

module.exports = {
  attachUser,
  requireAuth,
  requireVerified,
  signToken,
  clearAuth
};