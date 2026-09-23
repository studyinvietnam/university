// config/mailer.js
const nodemailer = require('nodemailer');

const {
  MAIL_USER,
  MAIL_PASS,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
  MAIL_FROM
} = process.env;

/**
 * Tạo transporter dùng SMTP.
 * Mặc định dùng Gmail (app password).
 * Có thể override bằng MAIL_HOST / MAIL_PORT nếu dùng dịch vụ khác (SendGrid, Mailgun...).
 */
const transporter = nodemailer.createTransport({
  host: MAIL_HOST || 'smtp.gmail.com',
  port: Number(MAIL_PORT) || 465,
  secure: MAIL_SECURE !== 'false', // mặc định true cho port 465
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS
  },
  // Tránh treo vô hạn khi SMTP chết
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

/**
 * Verify kết nối SMTP (gọi 1 lần khi server khởi động)
 * Không throw để server vẫn boot được nếu mail tạm lỗi.
 */
async function verifyMailer() {
  if (!MAIL_USER || !MAIL_PASS) {
    console.warn('⚠️  MAIL_USER hoặc MAIL_PASS chưa cấu hình — chức năng gửi mail sẽ không hoạt động.');
    return false;
  }
  try {
    await transporter.verify();
    console.log('✅ SMTP mailer ready');
    return true;
  } catch (err) {
    console.error('❌ SMTP verify thất bại:', err.message);
    return false;
  }
}

const DEFAULT_FROM = MAIL_FROM || `"Luyện thi CNTT UTC" <${MAIL_USER || 'no-reply@localhost'}>`;

/**
 * Helper gửi mail tiện dụng
 */
async function sendMail({ to, subject, html, text }) {
  if (!MAIL_USER || !MAIL_PASS) {
    throw new Error('Mailer chưa được cấu hình (thiếu MAIL_USER / MAIL_PASS).');
  }
  return transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    text: text || undefined,
    html: html || undefined
  });
}

module.exports = {
  transporter,
  verifyMailer,
  sendMail,
  DEFAULT_FROM
};