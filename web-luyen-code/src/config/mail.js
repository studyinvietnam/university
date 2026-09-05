module.exports = {
    primary: {
        host: process.env.SMTP_PRIMARY_HOST,
        port: Number(process.env.SMTP_PRIMARY_PORT),
        secure: Number(process.env.SMTP_PRIMARY_PORT) === 465,
        user: process.env.SMTP_PRIMARY_USER,
        pass: process.env.SMTP_PRIMARY_PASSWORD,
    },
    fallback: {
        host: process.env.SMTP_FALLBACK_HOST,
        port: Number(process.env.SMTP_FALLBACK_PORT),
        secure: Number(process.env.SMTP_FALLBACK_PORT) === 465,
        user: process.env.SMTP_FALLBACK_USER,
        pass: process.env.SMTP_FALLBACK_PASSWORD,
    },
};