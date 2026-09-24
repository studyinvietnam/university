// check-models.js
// Chạy: node check-models.js
// Gọi ListModels để biết model nào THỰC SỰ available với key trong MongoDB

require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');

const AIKey = require('./models/AIKey');

const TEST_KEY_NAME = process.env.TEST_KEY_NAME || null;
const TIMEOUT_MS = 20000;

// ============================================================
// GIẢI MÃ AES-256-GCM
// ============================================================
function getMasterKey() {
    const hex = process.env.ENCRYPTION_MASTER_KEY;
    if (!hex) throw new Error('ENCRYPTION_MASTER_KEY chưa cấu hình trong .env');
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== 32) throw new Error('ENCRYPTION_MASTER_KEY phải là 32 byte');
    return buf;
}

function decryptKey(doc) {
    const masterKey = getMasterKey();
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        masterKey,
        Buffer.from(doc.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(doc.authTag, 'hex'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(doc.encryptedKey, 'hex')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
}

function maskKey(key) {
    if (!key || key.length < 12) return '****';
    return key.slice(0, 8) + '...' + key.slice(-4);
}

// ============================================================
// GỌI API
// ============================================================
async function listModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        return { status: res.status, ok: res.ok, data };
    } catch (err) {
        return { status: 0, ok: false, data: { error: { message: err.message } } };
    } finally {
        clearTimeout(tid);
    }
}

async function testModel(apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say OK' }] }]
            }),
            signal: controller.signal
        });
        const data = await res.json();
        return { status: res.status, ok: res.ok, data };
    } catch (err) {
        return { status: 0, ok: false, data: { error: { message: err.message } } };
    } finally {
        clearTimeout(tid);
    }
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  KIỂM TRA MODEL THỰC SỰ AVAILABLE VỚI KEY TRONG MONGODB');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI chưa cấu hình');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
        console.log('');

        const query = { isActive: true, isRevoked: { $ne: true } };
        if (TEST_KEY_NAME) query.name = { $regex: TEST_KEY_NAME, $options: 'i' };

        const keys = await AIKey.find(query)
            .select('+encryptedKey +iv +authTag')
            .sort({ createdAt: -1 })
            .lean();

        if (keys.length === 0) {
            console.log('❌ Không có key active trong DB');
            process.exit(1);
        }

        for (const doc of keys) {
            console.log('═'.repeat(60));
            console.log(`🔑 ${doc.name || '(không tên)'}`);
            console.log(`   ID: ${doc._id}`);
            console.log('═'.repeat(60));
            console.log('');

            let apiKey;
            try {
                apiKey = decryptKey(doc);
                console.log(`🔓 Giải mã OK: ${maskKey(apiKey)}`);
            } catch (e) {
                console.log(`❌ Giải mã thất bại: ${e.message}`);
                continue;
            }
            console.log('');

            // ============================================
            // 1) ListModels
            // ============================================
            console.log('📡 Gọi ListModels...');
            const listResult = await listModels(apiKey);

            if (!listResult.ok) {
                console.log(`❌ ListModels FAIL (status ${listResult.status})`);
                console.log(`   Error: ${JSON.stringify(listResult.data?.error || listResult.data, null, 2)}`);
                console.log('');
                console.log('⚠️  NẾU 403 "denied access":');
                console.log('   → Project Google Cloud bị chặn → phải tạo project MỚI');
                console.log('   → https://console.cloud.google.com/projectcreate');
                console.log('');
                continue;
            }

            const allModels = listResult.data?.models || [];
            console.log(`✅ ListModels OK — Tổng ${allModels.length} model available`);
            console.log('');

            // Lọc model hỗ trợ generateContent
            const generateModels = allModels.filter((m) =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            console.log(`📋 Model hỗ trợ generateContent: ${generateModels.length}`);
            console.log('');

            // In danh sách dạng bảng
            console.log('┌───────────────────────────────────────────────────────────┐');
            console.log('│  #  │ Model Name                              │ test  │');
            console.log('├───────────────────────────────────────────────────────────┤');

            const working = [];
            const failed = [];

            let idx = 0;
            for (const m of generateModels) {
                idx++;
                // Tên model có dạng "models/gemini-xxx"
                const fullName = m.name || '';
                const shortName = fullName.replace(/^models\//, '');
                const numStr = String(idx).padStart(2, ' ');
                const nameStr = shortName.padEnd(40, ' ');

                process.stdout.write(`│ ${numStr}  │ ${nameStr} │ `);

                // Test từng model
                const testResult = await testModel(apiKey, shortName);

                if (testResult.ok) {
                    console.log(`  ✅   │`);
                    working.push(shortName);
                } else {
                    const code = testResult.data?.error?.code || testResult.status;
                    const short = String(code).padStart(3, ' ');
                    console.log(`${short}  │`);
                    failed.push({ model: shortName, code: testResult.status });
                }

                // Delay nhẹ
                await new Promise((r) => setTimeout(r, 200));
            }

            console.log('└───────────────────────────────────────────────────────────┘');
            console.log('');

            // ============================================
            // 2) Tổng kết
            // ============================================
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  📌 KẾT QUẢ');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');

            if (working.length === 0) {
                console.log('❌ KHÔNG có model nào hoạt động được với key này.');
                console.log('');
                console.log('🔴 Nguyên nhân có thể:');
                console.log('   1. Project Google Cloud chưa bật Generative Language API');
                console.log('   2. Project chưa bật Billing');
                console.log('   3. Project bị Google chặn (403 denied access)');
                console.log('   4. Key bị giới hạn restriction (IP / HTTP referrer)');
                console.log('');
                console.log('🔧 Fix — BẮT BUỘC làm:');
                console.log('');
                console.log('   Bước 1: Verify SĐT Google');
                console.log('     https://myaccount.google.com/phone');
                console.log('');
                console.log('   Bước 2: Tạo project Google Cloud MỚI');
                console.log('     https://console.cloud.google.com/projectcreate');
                console.log('');
                console.log('   Bước 3: Bật Generative Language API cho project mới');
                console.log('     https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
                console.log('');
                console.log('   Bước 4: Bật Billing cho project mới');
                console.log('     https://console.cloud.google.com/billing');
                console.log('');
                console.log('   Bước 5: Tạo API key MỚI trong project mới');
                console.log('     https://console.cloud.google.com/apis/credentials');
                console.log('     → Application restrictions: None');
                console.log('     → API restrictions: Don\'t restrict key');
                console.log('');
                console.log('   Bước 6: Thay key trong web');
                console.log('     http://localhost:3000/admin/ai-keys');
                console.log('');
                console.log('   Bước 7: Chạy lại script này để xác nhận');
                console.log('     node check-models.js');
                console.log('');
            } else {
                console.log(`✅ CÓ ${working.length} model HOẠT ĐỘNG:`);
                console.log('');
                working.forEach((m) => console.log(`   ✅ ${m}`));
                console.log('');
                console.log('═══════════════════════════════════════════════════════════');
                console.log('  📝 COPY DANH SÁCH DƯỚI VÀO config/aiModels.js');
                console.log('═══════════════════════════════════════════════════════════');
                console.log('');
                console.log('const SUPPORTED_MODELS = [');
                working.forEach((m) => console.log(`    "${m}",`));
                console.log('];');
                console.log('');
                console.log(`const DEFAULT_MODEL = "${working[0]}";`);
                console.log('');
            }

            console.log('');
        }

        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ LỖI:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();