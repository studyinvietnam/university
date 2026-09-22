const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const notifications = await Notification.find({
            user: userId
        })
            .sort({
                createdAt: -1
            })
            .limit(50)
            .lean();

        return res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể tải thông báo.'
        });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const count = await Notification.countDocuments({
            user: userId,
            isRead: false
        });

        return res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Get unread count error:', error);

        return res.status(500).json({
            success: false,
            count: 0
        });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                user: userId
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date()
                }
            },
            {
                new: true
            }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo.'
            });
        }

        return res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Mark notification read error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật thông báo.'
        });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.session.user.id;

        await Notification.updateMany(
            {
                user: userId,
                isRead: false
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date()
                }
            }
        );

        return res.json({
            success: true,
            message: 'Đã đánh dấu tất cả là đã đọc.'
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật thông báo.'
        });
    }
};

const createNotification = async ({
    user,
    title,
    message,
    type = 'info',
    link = null
}) => {
    return Notification.create({
        user,
        title,
        message,
        type,
        link,
        isRead: false,
        createdAt: new Date()
    });
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification
};