// controllers/userConnect.controller.js — Tài khoản kết nối (admin user_key)
const mongoose = require('mongoose');
const User = require('../models/User');
const UserKey = require('../models/UserKey');
const { audit } = require('../services/layoutService');
const { redirectWithFlash, takeFlash } = require('../utils/flash');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Giới hạn tần suất thử email (chống dò email đã đăng ký).
// In-memory theo từng instance: đủ chặn dò thủ công; muốn chặt hơn trên
// serverless thì chuyển sang đếm bằng MongoDB (cùng cơ chế chống dò `code`).
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW = 10 * 60 * 1000;
const attempts = new Map();

function tooManyAttempts(adminId) {
    const now = Date.now();
    const list = (attempts.get(adminId) || []).filter((t) => now - t < ATTEMPT_WINDOW);
    list.push(now);
    attempts.set(adminId, list);
    return list.length > ATTEMPT_LIMIT;
}

async function list(req, res, next) {
    try {
        // Lọc theo userKey của CHÍNH admin đang đăng nhập
        const students = await User.find({
            role: 'student',
            connectedUserKeys: req.actor.userKey
        })
            .select('name email userKey createdAt')
            .populate('userKey', 'name')
            .sort({ name: 1 })
            .lean();

        const uk = await UserKey.findById(req.actor.userKey).select('name active').lean();

        res.render('admin/users/connect', {
            title: 'Tài khoản kết nối',
            orgName: uk ? uk.name : '',
            orgActive: uk ? uk.active : false,
            students,
            flash: takeFlash(req)
        });
    } catch (err) {
        next(err);
    }
}

async function add(req, res, next) {
    const back = '/admin/users/connect';
    const fail = (msg) => redirectWithFlash(req, res, back, 'error', msg);

    try {
        if (tooManyAttempts(String(req.actor._id))) {
            return fail('Bạn thử quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.');
        }

        const email = String(req.body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) return fail('Email không đúng định dạng.');

        const uk = await UserKey.findById(req.actor.userKey).select('active').lean();
        if (!uk || !uk.active) return fail('Tổ chức của bạn đang bị tắt, không thể thêm kết nối.');

        const target = await User.findOne({ email }).select('role userKey connectedUserKeys').lean();
        if (!target) return fail('Không tìm thấy tài khoản với email này.');
        if (target.role !== 'student') return fail('Chỉ thêm được tài khoản student.');

        if (target.userKey && String(target.userKey) === String(req.actor.userKey)) {
            return fail('Tài khoản đã thuộc tổ chức của bạn.');
        }
        if ((target.connectedUserKeys || []).some((k) => String(k) === String(req.actor.userKey))) {
            return fail('Tài khoản đã được kết nối.');
        }

        await User.updateOne(
            { _id: target._id },
            { $addToSet: { connectedUserKeys: req.actor.userKey } }
        );
        await audit(req, 'connect_user', { targetUser: target._id });

        redirectWithFlash(req, res, back, 'success', 'Đã thêm tài khoản kết nối.');
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy', message: 'Tài khoản không hợp lệ.',
                user: req.user, statusCode: 404, stack: null
            });
        }

        // Chỉ $pull đúng userKey của admin này; không đụng userKey gốc hay kết nối khác
        const result = await User.updateOne(
            {
                _id: req.params.userId,
                role: 'student',
                connectedUserKeys: req.actor.userKey
            },
            { $pull: { connectedUserKeys: req.actor.userKey } }
        );

        if (!result.matchedCount) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy',
                message: 'Tài khoản này không kết nối với tổ chức của bạn.',
                user: req.user, statusCode: 404, stack: null
            });
        }

        await audit(req, 'disconnect_user', { targetUser: req.params.userId });
        redirectWithFlash(req, res, '/admin/users/connect', 'success', 'Đã xoá kết nối.');
    } catch (err) {
        next(err);
    }
}

module.exports = { list, add, remove };
