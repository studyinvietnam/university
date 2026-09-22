const crypto = require('crypto');

const AIKey = require('../models/AIKey');

const getAIKeys = async (req, res) => {
    try {
        const aiKeys = await AIKey.find({})
            .select('-encryptedKey -iv -authTag')
            .sort({
                createdAt: -1
            })
            .lean();

        return res.render('admin/aikeys', {
            title: 'AI API Keys',
            aiKeys
        });
    } catch (error) {
        console.error('Get AI keys error:', error);

        return res.status(500).render('admin/aikeys', {
            title: 'AI API Keys',
            aiKeys: [],
            error: 'Không thể tải danh sách AI key.'
        });
    }
};

const createAIKey = async (req, res) => {
    try {
        const {
            name,
            provider,
            apiKey
        } = req.body;

        if (!name || !apiKey) {
            return res.status(400).redirect('/admin/ai-keys');
        }

        /*
         * AES-256-GCM.
         *
         * ENCRYPTION_MASTER_KEY phải được lưu trong .env,
         * tuyệt đối không lưu trực tiếp trong database.
         */

        if (!process.env.ENCRYPTION_MASTER_KEY) {
            console.error(
                'ENCRYPTION_MASTER_KEY is not configured.'
            );

            return res.status(500).redirect('/admin/ai-keys');
        }

        const masterKey = Buffer.from(
            process.env.ENCRYPTION_MASTER_KEY,
            'hex'
        );

        if (masterKey.length !== 32) {
            console.error(
                'ENCRYPTION_MASTER_KEY must be 32 bytes.'
            );

            return res.status(500).redirect('/admin/ai-keys');
        }

        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            masterKey,
            iv
        );

        const encrypted = Buffer.concat([
            cipher.update(apiKey, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        await AIKey.create({
            name: name.trim(),
            provider: provider || 'gemini',

            encryptedKey: encrypted.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),

            isActive: true,
            createdBy: req.session.user.id
        });

        return res.redirect('/admin/ai-keys');
    } catch (error) {
        console.error('Create AI key error:', error);

        return res.status(500).redirect('/admin/ai-keys');
    }
};

const deleteAIKey = async (req, res) => {
    try {
        const aiKey = await AIKey.findById(
            req.params.id
        );

        if (!aiKey) {
            return res.status(404).redirect('/admin/ai-keys');
        }

        await AIKey.findByIdAndDelete(
            req.params.id
        );

        return res.redirect('/admin/ai-keys');
    } catch (error) {
        console.error('Delete AI key error:', error);

        return res.status(500).redirect('/admin/ai-keys');
    }
};

const toggleAIKey = async (req, res) => {
    try {
        const aiKey = await AIKey.findById(
            req.params.id
        );

        if (!aiKey) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy AI key.'
            });
        }

        aiKey.isActive = !aiKey.isActive;

        await aiKey.save();

        return res.json({
            success: true,
            isActive: aiKey.isActive
        });
    } catch (error) {
        console.error('Toggle AI key error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể thay đổi trạng thái AI key.'
        });
    }
};

const decryptAIKey = (aiKey) => {
    if (!process.env.ENCRYPTION_MASTER_KEY) {
        throw new Error(
            'ENCRYPTION_MASTER_KEY is not configured.'
        );
    }

    const masterKey = Buffer.from(
        process.env.ENCRYPTION_MASTER_KEY,
        'hex'
    );

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        masterKey,
        Buffer.from(aiKey.iv, 'hex')
    );

    decipher.setAuthTag(
        Buffer.from(aiKey.authTag, 'hex')
    );

    const decrypted = Buffer.concat([
        decipher.update(
            Buffer.from(aiKey.encryptedKey, 'hex')
        ),
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