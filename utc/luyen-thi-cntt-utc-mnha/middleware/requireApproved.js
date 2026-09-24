// middleware/requireApproved.js
const User = require('../models/User');

/**
 * Middleware dùng chung cho mọi route "đã login + đã được duyệt".
 *
 * Logic:
 *   - Chưa login                → /auth/login
 *   - Admin                     → LUÔN qua (bất kể status)
 *   - Student + status approved → qua
 *   - Client / status pending   → /pages
 *
 * Điểm quan trọng:
 *   - Đọc lại user từ DB để tránh session cũ giữ `status: 'pending'`
 *     dù admin đã duyệt. Middleware này tự cập nhật lại session.
 *   - Hỗ trợ cả 2 kiểu session: `user.id` và `user._id`
 */
module.exports = async function requireApproved(req, res, next) {
    try {
        const sessionUser = req.session?.user || req.user;

        // 1. Chưa login
        if (!sessionUser) {
            return res.redirect('/auth/login');
        }

        // 2. Lấy userId linh hoạt (id hoặc _id)
        const userId = sessionUser.id || sessionUser._id;

        let user = sessionUser;

        // 3. Đọc lại từ DB để có status/role mới nhất
        if (userId) {
            try {
                const fresh = await User.findById(userId)
                    .select('name email role status')
                    .lean();

                if (fresh) {
                    user = {
                        id: fresh._id.toString(),
                        _id: fresh._id.toString(),
                        name: fresh.name,
                        email: fresh.email,
                        role: fresh.role,
                        status: fresh.status
                    };

                    // Cập nhật lại session cho các request sau
                    if (req.session) {
                        req.session.user = user;
                    }
                    req.user = user;
                } else {
                    // User bị xoá khỏi DB → clear session
                    if (req.session) {
                        req.session.destroy(() => {});
                    }
                    return res.redirect('/auth/login');
                }
            } catch (err) {
                console.warn('[requireApproved] refresh user error:', err.message);
                // Lỗi mạng → vẫn dùng session cũ
            }
        }

        // 4. Admin luôn qua
        if (user.role === 'admin') {
            return next();
        }

        // 5. Student đã duyệt → qua
        if (user.role === 'student' && user.status !== 'pending') {
            return next();
        }

        // 6. Client chờ duyệt (role=client HOẶC status=pending) → /pages
        if (user.role === 'client' || user.status === 'pending') {
            return res.redirect('/pages');
        }

        // 7. Fallback: mọi role khác đã login → qua
        next();
    } catch (err) {
        console.error('[requireApproved] error:', err);
        return res.redirect('/auth/login');
    }
};