const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('../models/User');

const showLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }

    return res.render('auth/login', {
        title: 'Đăng nhập'
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
            email: email.trim().toLowerCase()
        }).select('+password');

        if (!user) {
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Email hoặc mật khẩu không chính xác.',
                email
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Email hoặc mật khẩu không chính xác.',
                email
            });
        }

        if (user.status === 'pending') {
            req.session.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            };

            return res.redirect('/pages');
        }

        if (user.status === 'rejected' || user.status === 'disabled') {
            return res.status(403).render('auth/login', {
                title: 'Đăng nhập',
                error: 'Tài khoản của bạn hiện không thể đăng nhập.',
                email
            });
        }

        req.session.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }

        return res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).render('auth/login', {
            title: 'Đăng nhập',
            error: 'Đã xảy ra lỗi khi đăng nhập.',
            email: req.body.email
        });
    }
};

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
        const {
            name,
            email,
            password,
            confirmPassword
        } = req.body;

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

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).render('auth/register', {
                title: 'Đăng ký',
                error: 'Email này đã được sử dụng.',
                name,
                email
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'student',
            status: 'pending'
        });

        return res.render('auth/register', {
            title: 'Đăng ký',
            success: 'Đăng ký thành công. Tài khoản đang chờ quản trị viên phê duyệt.'
        });
    } catch (error) {
        console.error('Register error:', error);

        return res.status(500).render('auth/register', {
            title: 'Đăng ký',
            error: 'Đã xảy ra lỗi khi đăng ký.',
            name: req.body.name,
            email: req.body.email
        });
    }
};

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

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        /*
         * Không tiết lộ email có tồn tại trong hệ thống hay không.
         */
        if (!user) {
            return res.render('auth/forgot', {
                title: 'Quên mật khẩu',
                success: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn.'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        /*
         * TODO:
         * Gửi resetToken qua Nodemailer.
         *
         * Không gửi token trực tiếp ra response trong production.
         */

        return res.render('auth/forgot', {
            title: 'Quên mật khẩu',
            success: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);

        return res.status(500).render('auth/forgot', {
            title: 'Quên mật khẩu',
            error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
        });
    }
};

const logout = (req, res) => {
    if (!req.session) {
        return res.redirect('/auth/login');
    }

    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);
        }

        res.clearCookie('connect.sid');

        return res.redirect('/auth/login');
    });
};

module.exports = {
    showLogin,
    login,
    showRegister,
    register,
    showForgot,
    forgotPassword,
    logout
};