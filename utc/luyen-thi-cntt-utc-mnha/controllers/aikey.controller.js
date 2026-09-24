const crypto = require('crypto');

const AIKey = require('../models/AIKey');
const {
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel
} = require('../config/aiModels');

// ============================================================
// HELPERS
// ============================================================
function getUserId(req) {
    return req.session?.user?._id || req.user?._id || null;
}

function getMasterKey() {
    const hex = process.env.ENCRYPTION_MASTER_KEY;
    if (!hex) throw new Error('ENCRYPTION_MASTER_KEY chưa cấu hình.');
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== 32) throw new Error('ENCRYPTION_MASTER_KEY phải là 32 byte (64 hex).');
    return buf;
}

// ============================================================
// GET /admin/ai-keys
// ============================================================
const getAIKeys = async (req, res) => {
    try {
        const aiKeys = await AIKey.find({})
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean({ virtuals: true });

        // Đảm bảo maskedKey luôn có
        aiKeys.forEach((k) => {
            if (!k.maskedKey) {
                k.maskedKey = k.lastFour
                    ? '••••••••••••' + k.lastFour
                    : '••••••••••••••••';
            }
        });

        return res.render('admin/aikeys', {
            title: 'AI API Keys',
            user: req.user,
            aiKeys,
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Get AI keys error:', error);
        return res.status(500).render('admin/aikeys', {
            title: 'AI API Keys',
            user: req.user,
            aiKeys: [],
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL,
            error: 'Không thể tải danh sách AI key.'
        });
    }
};

// ============================================================
// POST /admin/ai-keys
// ============================================================
const createAIKey = async (req, res) => {
    try {
        const { name, provider, apiKey, model } = req.body;

        if (!name || !name.trim()) {
            return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Tên không được để trống.'));
        }
        if (!apiKey || !apiKey.trim()) {
            return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('API Key không được để trống.'));
        }

        // ★ "Model" chỉ là nhãn gợi ý (model ưu tiên khi hiển thị/thống kê).
        // KHÔNG khoá key vào model này — key vẫn dùng được cho mọi model trong
        // SUPPORTED_MODELS lúc chấm bài (model thực tế do prompt/lesson quyết định).
        // Nếu người dùng không chọn hoặc chọn giá trị không hợp lệ → để trống (null),
        // không tự ép về DEFAULT_MODEL để tránh hiểu nhầm là bị giới hạn.
        const trimmedModel = typeof model === 'string' ? model.trim() : '';
        const preferredModel = trimmedModel && isSupportedModel(trimmedModel) ? trimmedModel : null;

        // Mã hoá AES-256-GCM
        let masterKey;
        try {
            masterKey = getMasterKey();
        } catch (err) {
            return res.redirect('/admin/ai-keys?error=' + encodeURIComponent(err.message));
        }

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(apiKey.trim(), 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();

        // 4 ký tự cuối
        const lastFour = apiKey.trim().slice(-4);

        await AIKey.create({
            name: name.trim(),
            provider: provider || 'gemini',
            model: preferredModel,                // ★ Nhãn ưu tiên (có thể null = mọi model)
            encryptedKey: encrypted.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            lastFour,                            // ★ LƯU 4 KÝ TỰ CUỐI
            isActive: true,
            isRevoked: false,
            createdBy: getUserId(req)
        });

        return res.redirect('/admin/ai-keys?success=' + encodeURIComponent('Đã thêm API Key.'));
    } catch (error) {
        console.error('Create AI key error:', error);
        return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không thể thêm key: ' + error.message));
    }
};

// ============================================================
// POST /admin/ai-keys/:id/toggle
// ============================================================
const toggleAIKey = async (req, res) => {
    try {
        const aiKey = await AIKey.findById(req.params.id);
        if (!aiKey) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy AI key.' });
        }

        aiKey.isActive = !aiKey.isActive;
        await aiKey.save();

        return res.redirect('/admin/ai-keys?success=' + encodeURIComponent('Đã cập nhật trạng thái.'));
    } catch (error) {
        console.error('Toggle AI key error:', error);
        return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không thể đổi trạng thái.'));
    }
};

// ============================================================
// POST /admin/ai-keys/:id/delete
// ============================================================
const deleteAIKey = async (req, res) => {
    try {
        const aiKey = await AIKey.findById(req.params.id);
        if (!aiKey) {
            return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không tìm thấy key.'));
        }

        await AIKey.findByIdAndDelete(req.params.id);

        return res.redirect('/admin/ai-keys?success=' + encodeURIComponent('Đã xoá API Key.'));
    } catch (error) {
        console.error('Delete AI key error:', error);
        return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không thể xoá.'));
    }
};

// ============================================================
// DECRYPT — dùng nội bộ (giữ lại để tương thích chỗ khác có thể đang import)
// Lưu ý: services/aiService.js có bản decrypt riêng để tránh phụ thuộc vòng
// (aiService không require controller). Nếu tách cryptoService.js sau này,
// nên hợp nhất 2 chỗ này lại làm một.
// ============================================================
const decryptAIKey = (aiKey) => {
    const masterKey = getMasterKey();
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        masterKey,
        Buffer.from(aiKey.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(aiKey.authTag, 'hex'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(aiKey.encryptedKey, 'hex')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
};

module.exports = {
    getAIKeys,
    createAIKey,
    deleteAIKey,
    toggleAIKey,
    decryptAIKey
};
