const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

function requireAuth(req, res, next) {
    const user = req.user || req.session?.user;
    if (!user) {
        if (req.xhr || req.headers.accept?.includes("json"))
            return res.status(401).json({ error: "Chưa đăng nhập" });
        return res.redirect("/auth/login");
    }
    next();
}

router.use(requireAuth);

// Đếm chưa đọc (đặt trước /:id để không bị nhầm)
router.get("/unread-count", notificationController.getUnreadCount);

// Đánh dấu tất cả đã đọc (đặt trước /:id/read)
router.post("/read-all", notificationController.markAllAsRead);

// Danh sách
router.get("/", notificationController.getNotifications);

// Tạo thủ công (dùng nội bộ hoặc admin)
router.post("/", notificationController.createNotification);

// Đánh dấu 1 cái đã đọc
router.post("/:id/read", notificationController.markAsRead);

module.exports = router;