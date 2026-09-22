const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        message: {
            type: String,
            required: true,
            maxlength: 2000
        },

        type: {
            type: String,
            enum: [
                'info',
                'success',
                'warning',
                'error',
                'grade',
                'submission',
                'dispute',
                'system'
            ],
            default: 'info'
        },

        link: {
            type: String,
            default: null
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true
        },

        readAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({
    user: 1,
    isRead: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    'Notification',
    notificationSchema
);