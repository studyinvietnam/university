const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ['admin', 'student'],
            default: 'student',
            index: true
        },

        status: {
            type: String,
            enum: [
                'pending',
                'approved',
                'rejected',
                'disabled'
            ],
            default: 'pending',
            index: true
        },

        avatar: {
            type: String,
            default: null
        },

        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        },

        lastLoginAt: {
            type: Date,
            default: null
        },

        approvedAt: {
            type: Date,
            default: null
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);