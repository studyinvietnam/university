// middleware/errorHandler.js

/**
 * Middleware 404 — đặt SAU tất cả các route.
 * Nếu request là API → trả JSON. Nếu là page → render view 404.
 */
function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
    return res.status(404).json({
      error: 'Không tìm thấy tài nguyên',
      path: req.originalUrl
    });
  }

  // Cố render view errors/404 nếu tồn tại, fallback HTML đơn giản
  res.status(404).render('errors/404', {
    title: '404 — Không tìm thấy trang',
    url: req.originalUrl,
    user: req.user || null
  }, (err, html) => {
    if (err) {
      return res.status(404).send(`
        <h1>404 — Không tìm thấy trang</h1>
        <p>URL: ${req.originalUrl}</p>
        <a href="/">Về trang chủ</a>
      `);
    }
    res.send(html);
  });
}

/**
 * Middleware error handler — đặt CUỐI CÙNG trong chuỗi middleware.
 * Express nhận biết đây là error handler vì có 4 tham số.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;

  // Log chi tiết (đã redact các field nhạy cảm)
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user ? req.user.email : 'Guest',
    userId: req.user ? req.user._id : null
  };

  console.error('='.repeat(60));
  console.error(`[${new Date().toISOString()}] EXPRESS SERVER ERROR`);
  console.error('='.repeat(60));
  console.error('Context:', logContext);
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  console.error('Code:', err.code || '(none)');

  // Ẩn stack trace ở production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:');
    console.error(err.stack);
  } else {
    console.error('Stack (top 5 lines):');
    console.error((err.stack || '').split('\n').slice(0, 5).join('\n'));
  }
  console.error('='.repeat(60));

  // Nếu headers đã gửi → không thể set status mới
  if (res.headersSent) {
    return _next(err);
  }

  // API → trả JSON
  if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('json')) {
    return res.status(status).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Đã xảy ra lỗi hệ thống'
        : err.message,
      code: err.code || 'INTERNAL_ERROR'
    });
  }

  // Page → render view errors/500 nếu có, fallback HTML
  res.status(status).render('errors/500', {
    title: 'Đã xảy ra lỗi',
    message: process.env.NODE_ENV === 'production'
      ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
      : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    user: req.user || null
  }, (renderErr, html) => {
    if (renderErr) {
      return res.status(status).send(`
        <h1>Đã xảy ra lỗi</h1>
        <p>${process.env.NODE_ENV === 'production'
          ? 'Vui lòng thử lại sau.'
          : err.message}</p>
      `);
    }
    res.send(html);
  });
}

/**
 * Bọc async handler để tự catch lỗi và chuyển cho errorHandler.
 * Dùng: router.get('/x', asyncHandler(async (req, res) => {...}));
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper tạo lỗi có status code (tiện throw trong controller).
 *
 * Cách dùng:
 *   throw createError(404, 'Không tìm thấy bài học');
 */
function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  createError
};