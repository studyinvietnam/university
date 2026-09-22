const mongoose = require('mongoose');

const aiKeySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        provider: {
            type: String,
            enum: [
                'gemini',
                'google'
            ],
            default: 'gemini'
        },

        /*
         * AES-256-GCM encrypted API key.
         */
        encryptedKey: {
            type: String,
            required: true,
            select: false
        },

        iv: {
            type: String,
            required: true,
            select: false
        },

        authTag: {
            type: String,
            required: true,
            select: false
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        isRevoked: {
            type: Boolean,
            default: false,
            index: true
        },

        usageCount: {
            type: Number,
            default: 0,
            min: 0
        },

        lastUsedAt: {
            type: Date,
            default: null
        },

        quotaErrorCount: {
            type: Number,
            default: 0,
            min: 0
        },

        revokedAt: {
            type: Date,
            default: null
        },

        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

aiKeySchema.index({
    isActive: 1,
    isRevoked: 1
});

module.exports = mongoose.model(
    'AIKey',
    aiKeySchema
);