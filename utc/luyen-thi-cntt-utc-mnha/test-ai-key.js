// test-ai-key.js
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const AIKey = require('./models/AIKey');

const MODELS_TO_TEST = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash'
];

function decryptKey(doc) {
    const key = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(doc.iv, 'hex'));
    d.setAuthTag(Buffer.from(doc.authTag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(doc.encryptedKey, 'hex')), d.final()]).toString('utf8');
}

async function testViaSDK(apiKey, model) {
    try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
            model,
            contents: 'Say OK'
        });
        const text = res?.text || res?.response?.text?.() || '';
        return { ok: true, via: 'SDK', text: text.trim().slice(0, 30) };
    } catch (e) {
        return { ok: false, via: 'SDK', msg: e.message };
    }
}

async function testViaFetch(apiKey, model) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] })
        });
        const data = await res.json();
        if (res.ok) {
            return { ok: true, via: 'fetch', text: (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim() };
        }
        return { ok: false, via: 'fetch', code: data.error?.code, msg: data.error?.message };
    } catch (e) {
        return { ok: false, via: 'fetch', msg: e.message };
    }
}

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected\n');

        const keyDoc = await AIKey.findOne({ isActive: true, isRevoked: false })
            .select('+encryptedKey +iv +authTag').lean();
        if (!keyDoc) { console.log('❌ Không có key active'); process.exit(1); }

        console.log(`🔑 Key: ${keyDoc.name}`);
        const apiKey = decryptKey(keyDoc);
        console.log(`   Format: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (len=${apiKey.length})\n`);

        for (const model of MODELS_TO_TEST) {
            console.log('─'.repeat(60));
            console.log(`📡 Model: ${model}`);

            const sdk = await testViaSDK(apiKey, model);
            if (sdk.ok) {
                console.log(`   ✅ [SDK]   ${sdk.text}`);
            } else {
                console.log(`   ❌ [SDK]   ${sdk.msg?.slice(0, 100)}`);
            }

            const fet = await testViaFetch(apiKey, model);
            if (fet.ok) {
                console.log(`   ✅ [fetch] ${fet.text}`);
            } else {
                console.log(`   ❌ [fetch] ${fet.code || ''} — ${fet.msg?.slice(0, 100)}`);
            }

            await new Promise(r => setTimeout(r, 300));
        }

        process.exit(0);
    } catch (e) {
        console.error('❌', e.message);
        process.exit(1);
    }
})();