const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/mailService');

// ============================================================
// HẰNG SỐ
// ============================================================
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const IS_DEV = process.env.NODE_ENV !== 'production';

// ============================================================
// HELPERS
// ============================================================
function genOTP() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function normalizeEmail(e) {
    return String(e || '').trim().toLowerCase();
}

function normalizeCode(input) {
    return String(input || '').replace(/\D/g, '').slice(0, 6);
}

/**
 * Tạo object session user — ĐỒNG BỘ với server.js refresh middleware.
 * Dùng `_id` (không phải `id`) để middleware refresh tìm được User.
 * Cũng giữ `id` để tương thích với code cũ.
 */
function buildSessionUser(user) {
    const idStr = String(user._id);
    return {
        _id: idStr,       // ← BẮT BUỘC — server.js dùng để refresh từ DB
        id: idStr,        // giữ để tương thích code cũ
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
    };
}

// ============================================================
// ĐĂNG NHẬP
// ============================================================
const showLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }

    return res.render('auth/login', {
        title: 'Đăng nhập',
        registered: req.query.registered === '1',
        email: req.query.email || '',
        error: null
    });
};

const login = async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        if (!email || !password) {
            return res.status(400).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Vui lòng nhập email và mật khẩu.',
                email
            });
        }

        const user = await User.findOne({
            email: normalizeEmail(email)
        }).select('+password');

        if (!user) {
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Email hoặc mật khẩu không chính xác.',
                email
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Email hoặc mật khẩu không chính xác.',
                email
            });
        }

        if (user.status === 'rejected' || user.status === 'disabled') {
            return res.status(403).render('auth/login', {
                title: 'Đăng nhập',
                error:
                    user.status === 'rejected'
                        ? 'Tài khoản của bạn đã bị từ chối.'
                        : 'Tài khoản của bạn đã bị vô hiệu hoá.',
                email
            });
        }

        // ✅ Lưu session qua helper — đồng bộ với server.js refresh middleware
        req.session.user = buildSessionUser(user);

        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }

        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        // Phân nhánh điều hướng theo role + status
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        if (user.role === 'client' || user.status === 'pending') {
            return res.redirect('/pages');
        }
        return res.redirect('/subjects');
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).render('auth/login', {
            title: 'Đăng nhập',
            error: 'Đã xảy ra lỗi khi đăng nhập.',
            email: req.body.email
        });
    }
};

// ============================================================
// ĐĂNG KÝ — GIAI ĐOẠN 1: nhập thông tin, gửi OTP
// ============================================================
const showRegister = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }

    return res.render('auth/register', {
        title: 'Đăng ký'
    });
};

const register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).render('auth/register', {
                title: 'Đăng ký',
                error: 'Vui lòng nhập đầy đủ thông tin.',
                name,
                email
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('auth/register', {
                title: 'Đăng ký',
                error: 'Mật khẩu xác nhận không khớp.',
                name,
                email
            });
        }

        if (password.length < 8) {
            return res.status(400).render('auth/register', {
                title: 'Đăng ký',
                error: 'Mật khẩu phải có ít nhất 8 ký tự.',
                name,
                email
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).render('auth/register', {
                title: 'Đăng ký',
                error: 'Email này đã được sử dụng.',
                name,
                email
            });
        }

        const existingOTP = await OTP.findOne({
            email: normalizedEmail,
            type: 'register'
        });

        if (
            existingOTP &&
            Date.now() - existingOTP.updatedAt.getTime() <
                OTP_RESEND_COOLDOWN_MS
        ) {
            return res.status(429).render('auth/verify-otp', {
                title: 'Xác minh OTP',
                email: normalizedEmail,
                error: 'Vui lòng chờ một phút trước khi yêu cầu mã mới.',
                success: null,
                debugOtp: IS_DEV ? existingOTP.code : null
            });
        }

        await OTP.deleteMany({ email: normalizedEmail, type: 'register' });

        const code = genOTP();
        const passwordHash = await bcrypt.hash(password, 12);

        await OTP.create({
            email: normalizedEmail,
            code,
            type: 'register',
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
            payload: {
                name: name.trim(),
                email: normalizedEmail,
                passwordHash
            }
        });

        await sendOTP(normalizedEmail, code, 'register');

        req.session.pendingEmail = normalizedEmail;

        console.log(`[register] Đã tạo OTP cho ${normalizedEmail}: ${code}`);

        return res.redirect('/auth/verify-otp');
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).render('auth/register', {
            title: 'Đăng ký',
            error: 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.',
            name: req.body.name,
            email: req.body.email
        });
    }
};

// ============================================================
// ĐĂNG KÝ — GIAI ĐOẠN 2: trang nhập OTP
// ============================================================
const showVerifyOtp = async (req, res) => {
    try {
        const email = req.session?.pendingEmail || req.query.email || '';

        if (!email) {
            return res.redirect('/auth/register');
        }

        let debugOtp = null;
        if (IS_DEV) {
            const otpDoc = await OTP.findOne({ email, type: 'register' });
            if (otpDoc && otpDoc.expiresAt > new Date()) {
                debugOtp = otpDoc.code;
            }
        }

        return res.render('auth/verify-otp', {
            title: 'Xác minh OTP',
            email,
            error: null,
            success: null,
            debugOtp
        });
    } catch (err) {
        console.error('[showVerifyOtp]', err);
        return res.redirect('/auth/register');
    }
};

// ============================================================
// ĐĂNG KÝ — GIAI ĐOẠN 3: kiểm tra OTP, tạo User
// ✅ FIX: role: 'client' thay vì 'student'
// ============================================================
const verifyOtp = async (req, res) => {
    try {
        const email = normalizeEmail(
            req.session?.pendingEmail || req.body.email
        );

        const rawInput = req.body.code || '';
        const code = normalizeCode(rawInput);

        console.log('');
        console.log('============================================================');
        console.log('[verifyOtp] REQUEST');
        console.log('  email   :', email);
        console.log('  rawInput:', JSON.stringify(rawInput));
        console.log('  cleaned :', JSON.stringify(code));
        console.log('============================================================');

        if (!email || !code) {
            let debugOtp = null;
            if (IS_DEV) {
                const doc = await OTP.findOne({ email, type: 'register' });
                if (doc) debugOtp = doc.code;
            }
            return res.status(400).render('auth/verify-otp', {
                title: 'Xác minh OTP',
                email,
                error: 'Vui lòng nhập đủ 6 chữ số OTP.',
                success: null,
                debugOtp
            });
        }

        const otpDoc = await OTP.findOne({ email, type: 'register' });

        console.log('[verifyOtp] DB DOC');
        console.log(
            '  doc:',
            otpDoc
                ? {
                      _id: otpDoc._id.toString(),
                      code: otpDoc.code,
                      attempts: otpDoc.attempts,
                      expiresAt: otpDoc.expiresAt.toISOString(),
                      payloadKeys: Object.keys(otpDoc.payload || {})
                  }
                : null
        );
        console.log('============================================================');
        console.log('');

        const renderErr = async (msg, status = 400, useOtpDoc = otpDoc) => {
            let debugOtp = null;
            if (IS_DEV && useOtpDoc) {
                debugOtp = useOtpDoc.code;
            }
            return res.status(status).render('auth/verify-otp', {
                title: 'Xác minh OTP',
                email,
                error: msg,
                success: null,
                debugOtp
            });
        };

        if (!otpDoc) {
            return renderErr(
                'Mã đã hết hạn hoặc không tồn tại. Vui lòng đăng ký lại.',
                400,
                null
            );
        }

        if (otpDoc.expiresAt < new Date()) {
            const snapshotCode = otpDoc.code;
            await OTP.deleteOne({ _id: otpDoc._id });
            return renderErr(
                'Mã đã hết hạn. Vui lòng đăng ký lại.',
                400,
                { code: snapshotCode }
            );
        }

        if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
            const snapshotCode = otpDoc.code;
            await OTP.deleteOne({ _id: otpDoc._id });
            return renderErr(
                'Bạn đã nhập sai quá nhiều lần. Vui lòng đăng ký lại.',
                429,
                { code: snapshotCode }
            );
        }

        const dbCode = normalizeCode(otpDoc.code);

        if (dbCode !== code) {
            otpDoc.attempts += 1;
            await otpDoc.save();

            console.log(
                `[verifyOtp] MISMATCH — dbCode="${dbCode}" inputCode="${code}" attempts=${otpDoc.attempts}`
            );

            return renderErr(
                `Mã không đúng. Còn ${
                    OTP_MAX_ATTEMPTS - otpDoc.attempts
                } lần thử.`
            );
        }

        // ============ OTP ĐÚNG → TẠO USER ============
        const { name, passwordHash } = otpDoc.payload || {};

        if (!name || !passwordHash) {
            await OTP.deleteOne({ _id: otpDoc._id });
            return renderErr(
                'Dữ liệu đăng ký bị hỏng. Vui lòng đăng ký lại.',
                500,
                null
            );
        }

        const dup = await User.findOne({ email });
        if (dup) {
            await OTP.deleteOne({ _id: otpDoc._id });
            if (req.session) delete req.session.pendingEmail;
            return res.redirect(
                `/auth/login?registered=1&email=${encodeURIComponent(email)}`
            );
        }

        // ✅ FIX CHÍNH: role='client', status='pending'
        await User.create({
            name,
            email,
            password: passwordHash,
            role: 'client',         // ← user mới là CLIENT
            status: 'pending'       // ← chờ admin duyệt
        });

        await OTP.deleteOne({ _id: otpDoc._id });

        if (req.session) {
            delete req.session.pendingEmail;
        }

        console.log(`[verifyOtp] ✅ Tạo user thành công: ${email} (role=client, status=pending)`);

        return res.redirect(
            `/auth/login?registered=1&email=${encodeURIComponent(email)}`
        );
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).render('auth/verify-otp', {
            title: 'Xác minh OTP',
            email: req.session?.pendingEmail || '',
            error: 'Đã xảy ra lỗi. Vui lòng thử lại.',
            success: null,
            debugOtp: null
        });
    }
};

// ============================================================
// GỬI LẠI OTP
// ============================================================
const resendOtp = async (req, res) => {
    try {
        const email = normalizeEmail(
            req.session?.pendingEmail || req.body.email
        );

        if (!email) {
            return res.redirect('/auth/register');
        }

        const existing = await OTP.findOne({ email, type: 'register' });

        if (!existing || !existing.payload) {
            return res.redirect('/auth/register');
        }

        if (
            Date.now() - existing.updatedAt.getTime() <
            OTP_RESEND_COOLDOWN_MS
        ) {
            return res.status(429).render('auth/verify-otp', {
                title: 'Xác minh OTP',
                email,
                error: 'Vui lòng chờ một phút trước khi gửi lại.',
                success: null,
                debugOtp: IS_DEV ? existing.code : null
            });
        }

        const code = genOTP();
        existing.code = code;
        existing.attempts = 0;
        existing.expiresAt = new Date(Date.now() + OTP_TTL_MS);
        await existing.save();

        await sendOTP(email, code, 'register');

        console.log(`[resendOtp] Đã gửi lại OTP cho ${email}: ${code}`);

        return res.render('auth/verify-otp', {
            title: 'Xác minh OTP',
            email,
            error: null,
            success: 'Đã gửi lại mã mới. Vui lòng kiểm tra email (hoặc console).',
            debugOtp: IS_DEV ? code : null
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).render('auth/verify-otp', {
            title: 'Xác minh OTP',
            email: req.session?.pendingEmail || '',
            error: 'Không gửi lại được. Vui lòng thử lại sau.',
            success: null,
            debugOtp: null
        });
    }
};

// ============================================================
// QUÊN MẬT KHẨU
// ============================================================
const showForgot = (req, res) => {
    return res.render('auth/forgot', {
        title: 'Quên mật khẩu'
    });
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).render('auth/forgot', {
                title: 'Quên mật khẩu',
                error: 'Vui lòng nhập email.'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        const genericMsg =
            'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn.';

        if (!user) {
            return res.render('auth/forgot', {
                title: 'Quên mật khẩu',
                success: genericMsg
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        // TODO: gửi mail chứa resetToken

        return res.render('auth/forgot', {
            title: 'Quên mật khẩu',
            success: genericMsg
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).render('auth/forgot', {
            title: 'Quên mật khẩu',
            error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
        });
    }
};

// ============================================================
// ĐĂNG XUẤT
// ============================================================
const logout = (req, res) => {
    if (!req.session) {
        return res.redirect('/auth/login');
    }

    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);
        }
        res.clearCookie('connect.sid');
        res.clearCookie('token');
        return res.redirect('/auth/login');
    });
};

module.exports = {
    showLogin,
    login,
    showRegister,
    register,
    showVerifyOtp,
    verifyOtp,
    resendOtp,
    showForgot,
    forgotPassword,
    logout
};