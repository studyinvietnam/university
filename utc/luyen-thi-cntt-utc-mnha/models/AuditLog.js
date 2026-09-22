const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },

        action: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        entity: {
            type: String,
            required: true,
            trim: true
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        description: {
            type: String,
            default: ''
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        ipAddress: {
            type: String,
            default: ''
        },

        userAgent: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({
    createdAt: -1
});

auditLogSchema.index({
    actor: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    'AuditLog',
    auditLogSchema
);