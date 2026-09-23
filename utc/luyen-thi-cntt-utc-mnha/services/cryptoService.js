const crypto = require('crypto');

const MASTER_KEY_HEX = process.env.ENCRYPTION_MASTER_KEY;

if (!MASTER_KEY_HEX || MASTER_KEY_HEX.length !== 64) {
    console.warn(
        '[cryptoService] ENCRYPTION_MASTER_KEY không hợp lệ (cần 64 ký tự hex = 32 byte).'
    );
}

const MASTER_KEY = MASTER_KEY_HEX
    ? Buffer.from(MASTER_KEY_HEX, 'hex')
    : null;

/**
 * Mã hoá plaintext bằng AES-256-GCM.
 * Trả về { iv, content, authTag } (hex strings) — đúng schema AIKey.encryptedKey.
 */
function encrypt(plainText) {
    if (!MASTER_KEY) {
        throw new Error('ENCRYPTION_MASTER_KEY chưa cấu hình.');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);

    const encrypted = Buffer.concat([
        cipher.update(String(plainText), 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

/**
 * Giải mã { iv, content, authTag } → plaintext.
 * Chỉ gọi trong RAM, không log.
 */
function decrypt({ iv, content, authTag }) {
    if (!MASTER_KEY) {
        throw new Error('ENCRYPTION_MASTER_KEY chưa cấu hình.');
    }

    if (!iv || !content || !authTag) {
        throw new Error('Dữ liệu mã hoá thiếu trường.');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        MASTER_KEY,
        Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(content, 'hex')),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

/**
 * Lấy 4 ký tự cuối của key để hiển thị (không lộ key).
 */
function maskKey(plainKey) {
    if (!plainKey || plainKey.length < 4) return '****';
    return '...' + plainKey.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };