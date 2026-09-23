// middleware/attachUnreadCount.js
const Notification = require('../models/Notification');

/**
 * Đếm số notification chưa đọc của user và gán vào `res.locals.unreadCount`
 * để `layout.pug` render badge 🔔.
 *
 * - Chạy trước mọi render Pug.
 * - Nếu chưa login → 0.
 * - Không chặn request nếu query lỗi (chỉ log).
 */
module.exports = async function attachUnreadCount(req, res, next) {
  try {
    if (req.user && req.user._id) {
      res.locals.unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        isRead: false
      });
    } else {
      res.locals.unreadCount = 0;
    }
    next();
  } catch (err) {
    console.error('[attachUnreadCount] Lỗi:', err.message);
    res.locals.unreadCount = 0;
    next();
  }
};