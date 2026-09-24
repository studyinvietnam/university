require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const AIKey = require('./models/AIKey');

// Hàm giải mã key
function decryptKey(doc) {
    const key = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(doc.iv, 'hex'));
    d.setAuthTag(Buffer.from(doc.authTag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(doc.encryptedKey, 'hex')), d.final()]).toString('utf8');
}

// Hàm kiểm tra một model cụ thể
async function testModel(apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] })
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, msg: data?.error?.message || 'OK' };
    } catch (e) {
        return { ok: false, status: 0, msg: e.message };
    }
}

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB');

        const keyDoc = await AIKey.findOne({ isActive: true }).select('+encryptedKey +iv +authTag').lean();
        if (!keyDoc) {
            console.log('❌ Không tìm thấy key active nào trong DB');
            process.exit(1);
        }
        
        console.log(`🔑 Đang kiểm tra key: ${keyDoc.name}`);
        const apiKey = decryptKey(keyDoc);

        // 1. Gọi ListModels để lấy danh sách model khả dụng
        console.log('\n📡 Đang gọi ListModels để lấy danh sách model...');
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();

        if (!listRes.ok) {
            console.log(`❌ Lỗi khi gọi ListModels: ${listData.error?.message}`);
            process.exit(1);
        }

        const modelsToTest = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        console.log(`✅ Tìm thấy ${modelsToTest.length} model hỗ trợ "generateContent". Bắt đầu kiểm tra từng model...\n`);
        console.log('─'.repeat(70));

        // 2. Duyệt qua từng model và kiểm tra
        for (const model of modelsToTest) {
            process.stdout.write(`🧪 ${model.padEnd(40)} → `);
            const result = await testModel(apiKey, model);
            if (result.ok) {
                console.log(`✅ OK`);
            } else {
                console.log(`❌ ${result.status} — ${result.msg.slice(0, 80)}`);
            }
            // Nghỉ 200ms để tránh rate limit
            await new Promise(r => setTimeout(r, 200));
        }

        console.log('─'.repeat(70));
        console.log('\n📌 KẾT LUẬN:');
        console.log('Nếu tất cả các model đều báo lỗi 403 "denied access", project của bạn đã bị Google gắn cờ. Hãy làm theo hướng dẫn khắc phục bên dưới.');
        console.log('Nếu có model báo ✅ OK, bạn có thể sử dụng model đó trong file config/aiModels.js.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
})();