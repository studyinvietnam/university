// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
// HELPERS PHÂN QUYỀN THEO userKey
// ------------------------------------------------------------
//   admin default  = role 'admin' + userKey null
//   admin user_key = role 'admin' + userKey có giá trị
// Luôn tính từ document user vừa đọc từ DB (req.user), KHÔNG tin session.
// ============================================================

// Nếu schema User chưa có field userKey thì mọi admin sẽ bị coi là KHÔNG phải
// admin default (fail-closed) thay vì vô tình được mở toàn quyền.
const USER_KEY_SCHEMA_READY = !!(User.schema && User.schema.path('userKey'));
if (!USER_KEY_SCHEMA_READY) {
  console.error('[auth] ⚠️ models/User.js chưa có field `userKey` — không admin nào được coi là admin default.');
}

function getUserKeyId(user) {
  const k = user && user.userKey;
  if (!k) return null;
  return String(k._id || k);
}

function isAdmin(user) {
  return !!user && user.role === 'admin';
}

function isDefaultAdmin(user) {
  return USER_KEY_SCHEMA_READY && isAdmin(user) && !getUserKeyId(user);
}

function isUserKeyAdmin(user) {
  return isAdmin(user) && !!getUserKeyId(user);
}

/**
 * Request này có mong đợi JSON không?
 * Dùng req.originalUrl vì trong router con (mount ở /api/...) thì req.path
 * đã bị cắt tiền tố, `req.path.startsWith('/api')` sẽ luôn sai.
 */
function wantsJson(req) {
  const url = req.originalUrl || req.url || '';
  return !!(
    req.xhr ||
    url.startsWith('/api') ||
    (req.headers.accept || '').includes('json')
  );
}

/** Gắn cờ cho view (layout.pug, dashboard.pug, ...) để ẩn/hiện menu. */
function setAdminFlags(res, user) {
  const def = isDefaultAdmin(user);
  res.locals.isDefaultAdmin = def;
  res.locals.isUserKeyAdmin = isUserKeyAdmin(user);
  res.locals.canManageAIKeys = def;   // menu "API Key"
  res.locals.canManageUserKeys = def; // menu "Quản lý User Key"
}

/**
 * Middleware gắn `req.user` nếu request có session/JWT hợp lệ.
 * KHÔNG chặn — khách vẫn đi qua bình thường (để vào /auth/login, /auth/register).
 *
 * Ưu tiên đọc user từ:
 *   1. session (express-session): session.userId hoặc session.user._id
 *   2. JWT trong cookie `token` hoặc header `Authorization: Bearer ...`
 *
 * User luôn được đọc lại từ DB → role/userKey không bao giờ bị "cũ" như session.
 * Nếu user đã bị xoá (deletedForever) hoặc không tồn tại → coi như Guest.
 *
 * Có thể gắn nhiều lần (global + trong từng router) — chỉ query DB 1 lần / request.
 */
async function attachUser(req, res, next) {
  if (req._userAttached) return next();
  req._userAttached = true;

  try {
    let userId = null;

    // 1) Session
    if (req.session) {
      userId = req.session.userId || (req.session.user && req.session.user._id) || null;
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
  } catch (err) {
    // không chặn toàn bộ request chỉ vì lỗi decode / lỗi DB thoáng qua
    console.error('[attachUser] Lỗi:', err.message);
  }

  setAdminFlags(res, req.user);
  next();
}

/**
 * Bắt buộc đã đăng nhập — nếu chưa thì chuyển về /auth/login.
 * Dùng cho các route cần user chắc chắn.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    // Nếu là request API → trả JSON thay vì redirect
    if (wantsJson(req)) {
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
    if (wantsJson(req)) {
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
  clearAuth,
  // ★ userKey
  getUserKeyId,
  isAdmin,
  isDefaultAdmin,
  isUserKeyAdmin,
  setAdminFlags,
  wantsJson
};
