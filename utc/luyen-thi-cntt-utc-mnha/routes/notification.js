const express = require("express");

const notificationController = require("../controllers/notification.controller");

const router = express.Router();


// ============================================================
// NOTIFICATIONS
// ============================================================

router.get(
    "/",
    notificationController.getNotifications
);

router.get(
    "/unread-count",
    notificationController.getUnreadCount
);

router.put(
    "/read-all",
    notificationController.markAllAsRead
);

router.put(
    "/:id/read",
    notificationController.markAsRead
);


module.exports = router;