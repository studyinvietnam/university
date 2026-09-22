const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
    {
        submission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Submission',
            required: true,
            index: true
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },

        status: {
            type: String,
            enum: [
                'pending',
                'reviewing',
                'resolved',
                'rejected'
            ],
            default: 'pending',
            index: true
        },

        adminNote: {
            type: String,
            default: '',
            maxlength: 5000
        },

        resolution: {
            type: String,
            default: ''
        },

        newScore: {
            type: Number,
            default: null
        },

        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        resolvedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

disputeSchema.index({
    student: 1,
    createdAt: -1
});

disputeSchema.index({
    status: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    'Dispute',
    disputeSchema
);