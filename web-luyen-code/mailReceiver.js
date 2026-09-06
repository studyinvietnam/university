
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// ======================================================
// CẤU HÌNH
// ======================================================

const MAIL_USER = process.env.SMTP_PRIMARY_USER;
const MAIL_PASSWORD = process.env.SMTP_PRIMARY_PASSWORD;

// Gmail SMTP dùng để GỬI mail.
// Gmail IMAP dùng để ĐỌC mail.
const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;

// Thư mục lưu mail local
const MAIL_STORAGE = path.join(
    __dirname,
    'mail-storage'
);

// ======================================================
// KIỂM TRA ENV
// ======================================================

if (!MAIL_USER) {
    console.error('❌ Thiếu SMTP_PRIMARY_USER trong file .env');
    process.exit(1);
}

if (!MAIL_PASSWORD) {
    console.error('❌ Thiếu SMTP_PRIMARY_PASSWORD trong file .env');
    process.exit(1);
}

// ======================================================
// TẠO THƯ MỤC LƯU MAIL
// ======================================================

if (!fs.existsSync(MAIL_STORAGE)) {
    fs.mkdirSync(MAIL_STORAGE, {
        recursive: true
    });
}

// ======================================================
// IMAP CLIENT
// ======================================================

const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,

    auth: {
        user: MAIL_USER,
        pass: MAIL_PASSWORD
    },

    // Bật log để xem Gmail trả lỗi gì
    logger: {
        debug: console.log,
        info: console.log,
        warn: console.warn,
        error: console.error
    }
});

// ======================================================
// TÊN FILE AN TOÀN
// ======================================================

function safeFileName(name) {
    return String(name || 'No_Subject')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

// ======================================================
// LƯU EMAIL
// ======================================================

async function saveEmail(source) {
    const mail = await simpleParser(source);

    const date = mail.date || new Date();

    const timestamp = date
        .toISOString()
        .replace(/[:.]/g, '-');

    const subject = safeFileName(
        mail.subject || 'No_Subject'
    );

    const fileName = `${timestamp}_${subject}.txt`;

    const filePath = path.join(
        MAIL_STORAGE,
        fileName
    );

    const content = `
==================================================
EMAIL RECEIVED
==================================================

From:
${mail.from?.text || ''}

To:
${mail.to?.text || ''}

Cc:
${mail.cc?.text || ''}

Subject:
${mail.subject || ''}

Date:
${date.toLocaleString('vi-VN')}

Message-ID:
${mail.messageId || ''}

==================================================
TEXT CONTENT
==================================================

${mail.text || ''}

==================================================
HTML CONTENT
==================================================

${mail.html || ''}

==================================================
`;

    fs.writeFileSync(
        filePath,
        content,
        'utf8'
    );

    console.log('');
    console.log('📨 EMAIL MỚI!');
    console.log('------------------------------------------');
    console.log('From:', mail.from?.text || '');
    console.log('Subject:', mail.subject || '');
    console.log('Date:', date.toLocaleString('vi-VN'));
    console.log('💾 Đã lưu:', filePath);
    console.log('------------------------------------------');
}

// ======================================================
// ĐỌC EMAIL CHƯA ĐỌC
// ======================================================

async function processNewEmails() {
    const lock = await client.getMailboxLock('INBOX');

    try {
        const messages = client.fetch(
            {
                seen: false
            },
            {
                source: true,
                uid: true
            }
        );

        for await (const message of messages) {
            try {
                await saveEmail(message.source);

                // Đánh dấu email đã đọc
                await client.messageFlagsAdd(
                    message.uid,
                    ['\\Seen']
                );

            } catch (error) {
                console.error('');
                console.error('❌ Lỗi xử lý email');
                console.error(error);
            }
        }

    } finally {
        lock.release();
    }
}

// ======================================================
// KHỞI ĐỘNG
// ======================================================

async function start() {

    console.log('');
    console.log('==========================================');
    console.log('📧 MAIL RECEIVER');
    console.log('==========================================');
    console.log('📧 Account:', MAIL_USER);
    console.log('📡 IMAP:', `${IMAP_HOST}:${IMAP_PORT}`);
    console.log('💾 Storage:', MAIL_STORAGE);
    console.log('');

    try {

        // ------------------------------------------------
        // KẾT NỐI GMAIL
        // ------------------------------------------------

        console.log('🔌 Đang kết nối Gmail IMAP...');

        await client.connect();

        console.log('✅ Đã kết nối Gmail IMAP');

        // ------------------------------------------------
        // MỞ INBOX
        // ------------------------------------------------

        await client.mailboxOpen('INBOX');

        console.log('📥 Đã mở INBOX');

        console.log('👂 Đang chờ email mới...');
        console.log('');

        // ------------------------------------------------
        // ĐỌC EMAIL CHƯA ĐỌC HIỆN TẠI
        // ------------------------------------------------

        await processNewEmails();

        // ------------------------------------------------
        // THEO DÕI EMAIL MỚI
        // ------------------------------------------------

        client.on('exists', async () => {

            console.log('');
            console.log('🔔 Gmail có email mới!');

            try {

                await processNewEmails();

            } catch (error) {

                console.error(
                    '❌ Lỗi đọc email:',
                    error.message
                );

            }

        });

        // ------------------------------------------------
        // GIỮ KẾT NỐI IMAP
        // ------------------------------------------------

        while (true) {

            try {

                await client.idle();

            } catch (error) {

                console.error('');
                console.error('⚠️ IMAP mất kết nối');
                console.error('message:', error.message);
                console.error('code:', error.code);
                console.error('response:', error.response);
                console.error(
                    'responseCode:',
                    error.responseCode
                );

                break;
            }
        }

    } catch (error) {

        console.error('');
        console.error('❌ KHÔNG THỂ KẾT NỐI GMAIL');
        console.error('------------------------------------------');
        console.error('name:', error.name);
        console.error('message:', error.message);
        console.error('code:', error.code);
        console.error('response:', error.response);
        console.error(
            'responseCode:',
            error.responseCode
        );
        console.error('stack:', error.stack);
        console.error('------------------------------------------');

    }
}

// ======================================================
// CTRL + C
// ======================================================

process.on('SIGINT', async () => {

    console.log('');
    console.log('🛑 Đang dừng Mail Receiver...');

    try {
        await client.logout();
    } catch (error) {
        // Bỏ qua lỗi logout
    }

    process.exit(0);
});

// ======================================================
// CHẠY
// ======================================================

start();

