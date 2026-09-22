const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },

        description: {
            type: String,
            default: ''
        },

        thumbnail: {
            type: String,
            default: null
        },

        order: {
            type: Number,
            default: 0
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

subjectSchema.index({
    isPublished: 1,
    order: 1
});

module.exports = mongoose.model('Subject', subjectSchema);