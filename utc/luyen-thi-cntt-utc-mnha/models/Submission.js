const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },

        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
            index: true
        },

        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        assignmentTitle: {
            type: String,
            default: ''
        },

        content: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                'pending',
                'queued',
                'grading',
                'graded',
                'failed',
                'rejected'
            ],
            default: 'pending',
            index: true
        },

        score: {
            type: Number,
            min: 0,
            default: null
        },

        maxScore: {
            type: Number,
            default: 10,
            min: 0
        },

        feedback: {
            type: String,
            default: ''
        },

        aiResult: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        /*
         * Prompt đầy đủ được sử dụng tại thời điểm chấm.
         * Không phụ thuộc vào prompt hiện tại.
         */
        promptSnapshot: {
            type: String,
            default: ''
        },

        promptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GradingPrompt',
            default: null
        },

        aiProvider: {
            type: String,
            default: 'gemini'
        },

        aiModel: {
            type: String,
            default: ''
        },

        aiKeyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIKey',
            default: null
        },

        submittedAt: {
            type: Date,
            default: Date.now
        },

        gradedAt: {
            type: Date,
            default: null
        },

        gradingStartedAt: {
            type: Date,
            default: null
        },

        gradingError: {
            type: String,
            default: ''
        },

        retryCount: {
            type: Number,
            default: 0,
            min: 0
        },

        githubPath: {
            type: String,
            default: ''
        },

        githubSha: {
            type: String,
            default: ''
        },

        githubStatus: {
            type: String,
            enum: [
                'pending',
                'queued',
                'committed',
                'failed'
            ],
            default: 'pending'
        },

        disputeStatus: {
            type: String,
            enum: [
                'none',
                'pending',
                'reviewing',
                'resolved',
                'rejected'
            ],
            default: 'none'
        },

        manualOverride: {
            type: Boolean,
            default: false
        },

        manualScore: {
            type: Number,
            default: null
        },

        manualFeedback: {
            type: String,
            default: ''
        },

        manuallyGradedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        manuallyGradedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

submissionSchema.index({
    student: 1,
    createdAt: -1
});

submissionSchema.index({
    status: 1,
    createdAt: 1
});

submissionSchema.index({
    githubStatus: 1,
    createdAt: 1
});

submissionSchema.index({
    disputeStatus: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    'Submission',
    submissionSchema
);