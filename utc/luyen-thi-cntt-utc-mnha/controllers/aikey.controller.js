const crypto = require('crypto');

const AIKey = require('../models/AIKey');
const {
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    isSupportedModel,
    // vilao.ai
    VILAO_MODELS,
    VILAO_DEFAULT_MODEL,
    isSupportedVilaoModel,
    AI_PROVIDERS,
    isValidProvider,
    normalizeProvider
} = require('../config/aiModels');
const { isDefaultAdmin } = require('../middleware/auth');

// ============================================================
// HELPERS
// ============================================================
function getUserId(req) {
    // req.user do attachUser đọc lại từ DB → không tin session (có thể cũ)
    return req.user?._id || null;
}

// ★ CHẶN HOÀN TOÀN admin user_key (lớp bảo vệ thứ 2, ngoài requireDefaultAdmin ở route).
//   Trả true nếu đã chặn (handler phải return ngay).
function denyIfNotDefaultAdmin(req, res) {
    if (isDefaultAdmin(req.user)) return false;
    res.status(403).render('error', {
        title: 'Không có quyền truy cập',
        message: 'Chỉ quản trị viên hệ thống (admin default) mới được quản lý API Key.',
        statusCode: 403,
        stack: null,
        user: req.user
    });
    return true;
}

// ★ Dữ liệu model/provider truyền cho view aikeys.pug (dùng chung 3 chỗ render)
function getProviderViewData() {
    return {
        supportedModels: SUPPORTED_MODELS,   // Gemini (giữ nguyên tên biến cũ)
        defaultModel: DEFAULT_MODEL,
        vilaoModels: VILAO_MODELS,
        vilaoDefaultModel: VILAO_DEFAULT_MODEL,
        providers: [
            { value: 'gemini', label: 'Gemini' },
            { value: 'vilao', label: 'vilao.ai' }
        ]
    };
}

// ★ Cảnh báo MỀM theo tiền tố key — KHÔNG chặn lưu.
//   - vilao.ai thường bắt đầu "sk-"
//   - Gemini có nhiều dạng (AIza..., AQ....) nên KHÔNG cảnh báo theo "AIza";
//     chỉ cảnh báo khi chọn Gemini mà key trông như key vilao.ai ("sk-").
function getKeyPrefixWarning(provider, apiKey) {
    const looksLikeSk = apiKey.startsWith('sk-');
    if (provider === 'vilao' && !looksLikeSk) {
        return 'Lưu ý: key vilao.ai thường bắt đầu bằng "sk-". Hãy kiểm tra lại nhà cung cấp/ key.';
    }
    if (provider !== 'vilao' && looksLikeSk) {
        return 'Lưu ý: key bắt đầu bằng "sk-" thường là key vilao.ai, nhưng bạn đang chọn Gemini.';
    }
    return null;
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
    if (denyIfNotDefaultAdmin(req, res)) return;

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

            // ★ .lean() không áp default → key cũ thiếu provider coi là gemini
            k.provider = normalizeProvider(k.provider);
            k.providerLabel = k.provider === 'vilao' ? 'vilao.ai' : 'Gemini';
        });

        return res.render('admin/aikeys', {
            title: 'AI API Keys',
            user: req.user,
            aiKeys,
            ...getProviderViewData(),
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Get AI keys error:', error);
        return res.status(500).render('admin/aikeys', {
            title: 'AI API Keys',
            user: req.user,
            aiKeys: [],
            ...getProviderViewData(),
            error: 'Không thể tải danh sách AI key.'
        });
    }
};

// ============================================================
// POST /admin/ai-keys
// ============================================================
const createAIKey = async (req, res) => {
    if (denyIfNotDefaultAdmin(req, res)) return;

    try {
        const { name, provider, apiKey, model } = req.body;

        // ★ Nhà cung cấp: bỏ trống → 'gemini' (hành vi cũ). Giá trị lạ → báo lỗi
        //   thay vì để Mongoose ném lỗi enum khó hiểu.
        const rawProvider = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
        const providerValue = rawProvider || 'gemini';
        if (!isValidProvider(providerValue)) {
            return res.redirect(
                '/admin/ai-keys?error=' +
                encodeURIComponent(
                    'Nhà cung cấp không hợp lệ. Chọn một trong: ' + AI_PROVIDERS.join(', ') + '.'
                )
            );
        }
        const isVilao = normalizeProvider(providerValue) === 'vilao';

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
        //   ★ Kiểm tra nhãn model theo ĐÚNG danh sách của provider (Gemini ↔ SUPPORTED_MODELS,
        //     vilao.ai ↔ VILAO_MODELS); model của provider khác → null.
        const trimmedModel = typeof model === 'string' ? model.trim() : '';
        const modelIsValid = isVilao
            ? isSupportedVilaoModel(trimmedModel)
            : isSupportedModel(trimmedModel);
        const preferredModel = trimmedModel && modelIsValid ? trimmedModel : null;

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
            provider: providerValue,
            model: preferredModel,                // ★ Nhãn ưu tiên (có thể null = mọi model)
            encryptedKey: encrypted.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            lastFour,                            // ★ LƯU 4 KÝ TỰ CUỐI
            isActive: true,
            isRevoked: false,
            createdBy: getUserId(req)
        });

        // ★ Cảnh báo mềm theo tiền tố key (không chặn lưu)
        const warning = getKeyPrefixWarning(providerValue, apiKey.trim());
        const successMsg = warning ? 'Đã thêm API Key. ' + warning : 'Đã thêm API Key.';

        return res.redirect('/admin/ai-keys?success=' + encodeURIComponent(successMsg));
    } catch (error) {
        console.error('Create AI key error:', error);
        return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không thể thêm key: ' + error.message));
    }
};

// ============================================================
// POST /admin/ai-keys/:id/toggle
// ============================================================
const toggleAIKey = async (req, res) => {
    if (denyIfNotDefaultAdmin(req, res)) return;

    try {
        const aiKey = await AIKey.findById(req.params.id);
        if (!aiKey) {
            return res.redirect('/admin/ai-keys?error=' + encodeURIComponent('Không tìm thấy AI key.'));
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
    if (denyIfNotDefaultAdmin(req, res)) return;

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
