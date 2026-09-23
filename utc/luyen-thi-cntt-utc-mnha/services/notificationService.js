const Notification = require('../models/Notification');

/**
 * Tạo notification cho user.
 */
async function createNotification({
    userId,
    type,
    title,
    message,
    link = null
}) {
    try {
        return await Notification.create({
            userId,
            type,
            title,
            message,
            link
        });
    } catch (err) {
        console.error('[notificationService] createNotification:', err.message);
        return null;
    }
}

/**
 * Sinh hàng loạt notification cho nhiều user (vd: khi admin tạo bài mới).
 */
async function createManyNotifications(userIds, payload) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const docs = userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link || null
    }));

    try {
        return await Notification.insertMany(docs);
    } catch (err) {
        console.error('[notificationService] createManyNotifications:', err.message);
        return [];
    }
}

/**
 * Đếm notification chưa đọc.
 */
async function countUnread(userId) {
    if (!userId) return 0;
    return Notification.countDocuments({ userId, isRead: false });
}

/**
 * Danh sách notification (mặc định 20 mới nhất).
 */
async function listNotifications(userId, { onlyUnread = false, limit = 20, skip = 0 } = {}) {
    const filter = { userId };
    if (onlyUnread) filter.isRead = false;

    return Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
}

/**
 * Đánh dấu 1 notification đã đọc.
 */
async function markAsRead(userId, notifId) {
    return Notification.updateOne(
        { _id: notifId, userId },
        { $set: { isRead: true, readAt: new Date() } }
    );
}

/**
 * Đánh dấu tất cả đã đọc.
 */
async function markAllAsRead(userId) {
    return Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
}

/**
 * Xoá notification cũ hơn N ngày (dọn dẹp định kỳ).
 */
async function cleanupOldNotifications(daysOld = 90) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const res = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
    console.log(`[notificationService] Đã xoá ${res.deletedCount} notification cũ.`);
    return res.deletedCount;
}

module.exports = {
    createNotification,
    createManyNotifications,
    countUnread,
    listNotifications,
    markAsRead,
    markAllAsRead,
    cleanupOldNotifications
};