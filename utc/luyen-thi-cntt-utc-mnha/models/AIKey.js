const mongoose = require('mongoose');

const aiKeySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        // ★ Nhà cung cấp AI: 'gemini' (mặc định) | 'vilao' (vilao.ai).
        //   'google' là giá trị cũ → GIỮ trong enum để doc cũ không lỗi
        //   validate khi .save() (markKeyUsed/markKeyQuotaError gọi save()).
        //   Doc cũ thiếu provider ⇒ coi là 'gemini'. Query .lean() không áp
        //   default → nơi đọc phải viết `key.provider || 'gemini'`.
        provider: {
            type: String,
            enum: ['gemini', 'google', 'vilao'],
            default: 'gemini'
        },

        // Model ưu tiên cho key (chỉ là nhãn gợi ý)
        //   provider gemini → thuộc SUPPORTED_MODELS
        //   provider vilao  → thuộc VILAO_MODELS
        model: {
            type: String,
            default: null
        },

        // AES-256-GCM encrypted API key
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

        // 4 ký tự cuối để hiển thị
        lastFour: {
            type: String,
            default: null
        },

        // ★ Admin bật/tắt THỦ CÔNG
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },

        // ★ Revoke VĨNH VIỄN
        isRevoked: {
            type: Boolean,
            default: false,
            index: true
        },

        // ★ TỰ ĐỘNG disable TẠM THỜI khi hết quota
        //   Key tự bật lại khi disabledUntil < now
        disabledUntil: {
            type: Date,
            default: null,
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
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Index cho query tìm key active
aiKeySchema.index({ isActive: 1, isRevoked: 1, disabledUntil: 1 });

// Virtual: providerLabel ("Gemini" / "vilao.ai")
aiKeySchema.virtual('providerLabel').get(function () {
    return this.provider === 'vilao' ? 'vilao.ai' : 'Gemini';
});

// Virtual: maskedKey
aiKeySchema.virtual('maskedKey').get(function () {
    if (!this.lastFour) return '••••••••••••••••';
    return '••••••••••••' + this.lastFour;
});

aiKeySchema.set('toObject', { virtuals: true });
aiKeySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AIKey', aiKeySchema);