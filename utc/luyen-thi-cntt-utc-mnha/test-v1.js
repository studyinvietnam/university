// test-v1.js
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const AIKey = require('./models/AIKey');

function decryptKey(doc) {
    const key = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(doc.iv, 'hex'));
    d.setAuthTag(Buffer.from(doc.authTag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(doc.encryptedKey, 'hex')), d.final()]).toString('utf8');
}

async function test(apiKey, apiVer, model) {
    const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`;
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
    await mongoose.connect(process.env.MONGODB_URI);
    const key = await AIKey.findOne({ isActive: true }).select('+encryptedKey +iv +authTag').lean();
    const apiKey = decryptKey(key);

    console.log(`Key: ${key.name}`);
    console.log('');

    const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    const versions = ['v1beta', 'v1', 'v1alpha'];

    for (const model of models) {
        for (const ver of versions) {
            process.stdout.write(`  ${model.padEnd(24)} [${ver.padEnd(8)}] → `);
            const r = await test(apiKey, ver, model);
            console.log(r.ok ? `✅ OK` : `❌ ${r.status} — ${r.msg.slice(0, 80)}`);
            await new Promise(x => setTimeout(x, 200));
        }
    }

    process.exit(0);
})();