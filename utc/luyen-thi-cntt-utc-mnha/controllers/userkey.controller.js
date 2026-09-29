// controllers/userkey.controller.js
// ============================================================
// - Admin DEFAULT: tạo / đổi tên / bật-tắt tổ chức (user_key)
// - Student      : kết nối / ngắt kết nối thêm tổ chức bằng code
// Quyền luôn đọc lại từ DB qua getActor (không tin session).
// ============================================================
const mongoose = require('mongoose');

const User = require('../models/User');
const UserKey = require('../models/UserKey');
const {
    getActor,
    isDefaultAdmin,
    normalizeUserKeyCode,
    findActiveUserKeyByCode
} = require('../services/userKeyService');

const viewUser = (req) => req.user || req.session?.user || null;

const go = (res, base, type, msg) =>
    res.redirect(`${base}?${type}=${encodeURIComponent(msg)}`);

const renderError = (res, status, message) =>
    res.status(status).render('error', {
        title: status === 403 ? 'Không có quyền' : 'Lỗi',
        message,
        statusCode: status,
        stack: null
    });

// ------------------------------------------------------------
// Guard: chỉ admin default
// ------------------------------------------------------------
async function requireDefaultAdmin(req, res, next) {
    try {
        const actor = await getActor(req);
        if (!isDefaultAdmin(actor)) {
            return renderError(res, 403, 'Chỉ admin default mới quản lý được User Key.');
        }
        req.actor = actor;
        next();
    } catch (err) {
        next(err);
    }
}

// Guard: chỉ student đã được duyệt
async function requireApprovedStudent(req, res, next) {
    try {
        const actor = await getActor(req);
        if (!actor || actor.role !== 'student' || actor.status !== 'approved') {
            return renderError(res, 403, 'Chỉ sinh viên đã được duyệt mới kết nối được tổ chức.');
        }
        req.actor = actor;
        next();
    } catch (err) {
        next(err);
    }
}

// ============================================================
// ADMIN DEFAULT
// ============================================================
async function listUserKeys(req, res, next) {
    try {
        const keys = await UserKey.find().sort({ createdAt: -1 }).lean();
        const ids = keys.map((k) => k._id);

        // Thành viên theo tổ chức gốc (userKey) và theo kết nối thêm (connectedUserKeys)
        const [owned, connected] = await Promise.all([
            User.aggregate([
                { $match: { userKey: { $in: ids } } },
                { $group: { _id: { k: '$userKey', r: '$role' }, n: { $sum: 1 } } }
            ]),
            User.aggregate([
                { $match: { connectedUserKeys: { $in: ids } } },
                { $unwind: '$connectedUserKeys' },
                { $match: { connectedUserKeys: { $in: ids } } },
                { $group: { _id: '$connectedUserKeys', n: { $sum: 1 } } }
            ])
        ]);

        const stat = {};
        for (const k of ids) stat[String(k)] = { admins: 0, students: 0, clients: 0, connected: 0 };
        for (const o of owned) {
            const s = stat[String(o._id.k)];
            if (!s) continue;
            if (o._id.r === 'admin') s.admins += o.n;
            else if (o._id.r === 'student') s.students += o.n;
            else s.clients += o.n;
        }
        for (const c of connected) {
            if (stat[String(c._id)]) stat[String(c._id)].connected = c.n;
        }

        res.render('admin/userkeys', {
            title: 'Quản lý User Key',
            user: viewUser(req),
            isDefaultAdmin: true,
            userKeys: keys.map((k) => ({ ...k, stats: stat[String(k._id)] })),
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        next(err);
    }
}

async function createUserKey(req, res) {
    const base = '/admin/user-keys';
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return go(res, base, 'error', 'Vui lòng nhập tên tổ chức.');
        if (name.length > 200) return go(res, base, 'error', 'Tên tổ chức tối đa 200 ký tự.');

        let code = normalizeUserKeyCode(req.body.code);
        if (code) {
            if (!/^[A-Z0-9_-]{4,32}$/.test(code)) {
                return go(res, base, 'error', 'Mã chỉ gồm chữ/số/-/_ và dài 4–32 ký tự.');
            }
            if (await UserKey.exists({ code })) {
                return go(res, base, 'error', 'Mã này đã tồn tại.');
            }
        } else {
            for (let i = 0; i < 10 && !code; i++) {
                const c = UserKey.generateCode();
                if (!(await UserKey.exists({ code: c }))) code = c;
            }
            if (!code) return go(res, base, 'error', 'Không sinh được mã, thử lại.');
        }

        await UserKey.create({ name, code, active: true, createdBy: (req.actor || req.user)._id });
        return go(res, base, 'success', `Đã tạo tổ chức "${name}" (mã ${code}).`);
    } catch (err) {
        if (err && err.code === 11000) return go(res, base, 'error', 'Mã này đã tồn tại.');
        console.error('createUserKey error:', err);
        return go(res, base, 'error', 'Không thể tạo tổ chức.');
    }
}

async function updateUserKey(req, res) {
    const base = '/admin/user-keys';
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return go(res, base, 'error', 'ID không hợp lệ.');
        }
        const name = String(req.body.name || '').trim();
        if (!name || name.length > 200) {
            return go(res, base, 'error', 'Tên tổ chức không hợp lệ.');
        }
        const r = await UserKey.updateOne({ _id: req.params.id }, { $set: { name } });
        if (!r.matchedCount) return go(res, base, 'error', 'Không tìm thấy tổ chức.');
        return go(res, base, 'success', 'Đã đổi tên tổ chức.');
    } catch (err) {
        console.error('updateUserKey error:', err);
        return go(res, base, 'error', 'Không thể cập nhật.');
    }
}

async function toggleUserKey(req, res) {
    const base = '/admin/user-keys';
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return go(res, base, 'error', 'ID không hợp lệ.');
        }
        const key = await UserKey.findById(req.params.id);
        if (!key) return go(res, base, 'error', 'Không tìm thấy tổ chức.');
        key.active = !key.active;
        await key.save();
        return go(res, base, 'success', key.active ? 'Đã bật tổ chức.' : 'Đã tắt tổ chức (dữ liệu bị ẩn với student).');
    } catch (err) {
        console.error('toggleUserKey error:', err);
        return go(res, base, 'error', 'Không thể đổi trạng thái.');
    }
}

// ============================================================
// STUDENT — kết nối nhiều tổ chức
// ============================================================
async function showConnect(req, res, next) {
    try {
        const me = await User.findById(req.actor._id)
            .select('userKey connectedUserKeys')
            .populate('userKey', 'name code active')
            .populate('connectedUserKeys', 'name code active')
            .lean();

        res.render('student/connect', {
            title: 'Kết nối tổ chức',
            user: viewUser(req),
            ownKey: me?.userKey || null,
            connected: me?.connectedUserKeys || [],
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        next(err);
    }
}

async function connectUserKey(req, res) {
    const base = '/student/connect';
    try {
        const code = normalizeUserKeyCode(req.body.code);
        if (!code) return go(res, base, 'error', 'Vui lòng nhập mã tổ chức.');

        const org = await findActiveUserKeyByCode(code);
        if (!org) return go(res, base, 'error', 'Mã tổ chức không hợp lệ hoặc đã bị tắt.');

        if (String(req.actor.userKey || '') === String(org._id)) {
            return go(res, base, 'error', 'Đây đã là tổ chức gốc của bạn.');
        }

        // $addToSet: không trùng, kết nối nhiều tổ chức được
        await User.updateOne(
            { _id: req.actor._id },
            { $addToSet: { connectedUserKeys: org._id } }
        );
        return go(res, base, 'success', `Đã kết nối "${org.name}".`);
    } catch (err) {
        console.error('connectUserKey error:', err);
        return go(res, base, 'error', 'Không thể kết nối.');
    }
}

async function disconnectUserKey(req, res) {
    const base = '/student/connect';
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return go(res, base, 'error', 'ID không hợp lệ.');
        }
        await User.updateOne(
            { _id: req.actor._id },
            { $pull: { connectedUserKeys: req.params.id } }
        );
        return go(res, base, 'success', 'Đã ngắt kết nối.');
    } catch (err) {
        console.error('disconnectUserKey error:', err);
        return go(res, base, 'error', 'Không thể ngắt kết nối.');
    }
}

module.exports = {
    requireDefaultAdmin,
    requireApprovedStudent,
    listUserKeys,
    createUserKey,
    updateUserKey,
    toggleUserKey,
    showConnect,
    connectUserKey,
    disconnectUserKey
};
