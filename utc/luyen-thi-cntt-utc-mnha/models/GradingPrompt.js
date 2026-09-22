const mongoose = require('mongoose');

const gradingPromptSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        content: {
            type: String,
            required: true
        },

        /*
         * lesson > subject > global
         */
        scope: {
            type: String,
            enum: [
                'global',
                'subject',
                'lesson'
            ],
            required: true,
            default: 'global',
            index: true
        },

        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            default: null,
            index: true
        },

        lesson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            default: null,
            index: true
        },

        priority: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        version: {
            type: Number,
            default: 1
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true
    }
);

gradingPromptSchema.index({
    scope: 1,
    isActive: 1,
    priority: -1
});

module.exports = mongoose.model(
    'GradingPrompt',
    gradingPromptSchema
);