const nodemailer = require('nodemailer');

// ---- Primary Transporter ----
const primaryTransporter = nodemailer.createTransport({
    host: process.env.SMTP_PRIMARY_HOST,
    port: Number(process.env.SMTP_PRIMARY_PORT),
    secure: Number(process.env.SMTP_PRIMARY_PORT) === 465,
    auth: {
        user: process.env.SMTP_PRIMARY_USER,
        pass: process.env.SMTP_PRIMARY_PASSWORD,
    },
});

// ---- Fallback Transporter ----
const fallbackTransporter = nodemailer.createTransport({
    host: process.env.SMTP_FALLBACK_HOST,
    port: Number(process.env.SMTP_FALLBACK_PORT),
    secure: Number(process.env.SMTP_FALLBACK_PORT) === 465,
    auth: {
        user: process.env.SMTP_FALLBACK_USER,
        pass: process.env.SMTP_FALLBACK_PASSWORD,
    },
});

/**
 * Gửi email với cơ chế primary → fallback
 * @param {Object} mailOptions - { to, subject, text, html }
 * @returns {Object} { success, provider, messageId, error }
 */
async function sendMail(mailOptions) {
    try {
        const result = await primaryTransporter.sendMail({
            ...mailOptions,
            from: process.env.SMTP_PRIMARY_USER,
        });
        return {
            success: true,
            provider: 'primary',
            messageId: result.messageId,
        };
    } catch (primaryError) {
        console.error('❌ EMAIL PRIMARY ERROR:', primaryError);

        try {
            const result = await fallbackTransporter.sendMail({
                ...mailOptions,
                from: process.env.SMTP_FALLBACK_USER,
            });
            return {
                success: true,
                provider: 'fallback',
                messageId: result.messageId,
            };
        } catch (fallbackError) {
            console.error('❌ EMAIL FALLBACK ERROR:', fallbackError);
            return {
                success: false,
                provider: null,
                error: fallbackError,
            };
        }
    }
}

module.exports = { sendMail };