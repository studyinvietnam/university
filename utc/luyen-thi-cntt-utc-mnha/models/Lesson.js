const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ''
        },

        content: {
            type: String,
            default: ''
        },

        instructions: {
            type: String,
            default: ''
        },

        maxScore: {
            type: Number,
            default: 10,
            min: 0
        },

        deadline: {
            type: Date,
            default: null
        },

        order: {
            type: Number,
            default: 0
        },

        isPublished: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true,
        timestamps: true
    }
);

const lessonSchema = new mongoose.Schema(
    {
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        code: {
            type: String,
            trim: true,
            default: ''
        },

        description: {
            type: String,
            default: ''
        },

        content: {
            type: String,
            default: ''
        },

        order: {
            type: Number,
            default: 0
        },

        assignments: {
            type: [assignmentSchema],
            default: []
        },

        isPublished: {
            type: Boolean,
            default: false,
            index: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
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

lessonSchema.index({
    subject: 1,
    order: 1
});

module.exports = mongoose.model('Lesson', lessonSchema);