// services/userKeyService.js
// ============================================================
// Gom MỌI quy tắc phân quyền theo user_key vào một chỗ để các
// controller (lesson, subject, submission, admin user...) dùng
// chung, không mỗi nơi tự viết một kiểu.
//
// Định nghĩa:
//   - Admin default : role = 'admin' và userKey = null
//   - Admin user_key: role = 'admin' và userKey != null
//   - Student       : role != 'admin' (userKey null = tổ chức default)
//
// LUÔN đọc user mới từ DB (getActor) thay vì tin req.user /
// session, vì connectedUserKeys và role có thể đã đổi sau khi
// session được tạo.
// ============================================================
const mongoose = require('mongoose');

const User = require('../models/User');
const UserKey = require('../models/UserKey');

const toId = (v) => (v ? String(v._id || v) : null);

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function normalizeUserKeyCode(input) {
    return String(input || '').trim().toUpperCase();
}

async function findActiveUserKeyByCode(code) {
    const c = normalizeUserKeyCode(code);
    if (!c) return null;
    return UserKey.findOne({ code: c, active: true }).lean();
}

async function getActor(req) {
    const id = req.user?._id || req.session?.user?._id;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return null;
    return User.findById(id)
        .select('role status userKey connectedUserKeys')
        .lean();
}

const isDefaultAdmin = (actor) =>
    !!actor && actor.role === 'admin' && !actor.userKey;

const isOrgAdmin = (actor) =>
    !!actor && actor.role === 'admin' && !!actor.userKey;

// ------------------------------------------------------------
// Nếu Subject/Lesson CHƯA có field userKey thì mọi document đều
// coi như thuộc tổ chức DEFAULT (không ném lỗi nữa). Khi đó KHÔNG
// được lọc theo userKey (Mongoose strictQuery sẽ lặng lẽ bỏ điều
// kiện đó), nên getContentScope trả scope "thuần default" bên dưới.
// ------------------------------------------------------------
let warnedMissingPath = false;

function missingUserKeyPath(...models) {
    const missing = models.filter((M) => !M.schema.path('userKey'));
    if (missing.length && !warnedMissingPath) {
        warnedMissingPath = true;
        console.warn(
            `[userKey] Model ${missing.map((m) => m.modelName).join(', ')} chưa có field "userKey" ` +
                `→ mọi nội dung được coi là tổ chức default. Thêm field vào schema để bật đa tổ chức.`
        );
    }
    return missing.length > 0;
}

/**
 * Phạm vi Subject/Lesson mà người đang đăng nhập được thấy/sửa.
 *
 * Trả về:
 *   filter    : Mongo filter, spread thẳng vào Subject.find / Lesson.find
 *   canAccess : (doc) => boolean, kiểm tra 1 document đã load
 *   isDefaultAdmin, isOrgAdmin, actor
 *
 * Quy tắc (theo README):
 *   - Admin default : thấy tất cả.
 *   - Admin user_key: chỉ userKey của mình VÀ createdBy = mình.
 *   - Student       : userKey ∈ [userKey gốc, ...connectedUserKeys],
 *                     chỉ tính các tổ chức đang active. Student
 *                     default (userKey null) chỉ thấy nội dung userKey null.
 *   - Khách chưa đăng nhập: chỉ thấy nội dung tổ chức default.
 *
 * Lưu ý: `{ userKey: { $in: [null] } }` khớp cả document CHƯA CÓ
 * field userKey → dữ liệu cũ tự thuộc tổ chức default.
 */
async function getContentScope(req) {
    const Subject = require('../models/Subject');
    const Lesson = require('../models/Lesson');
    const actor = await getActor(req);

    // Chưa có field userKey → toàn bộ nội dung = default
    if (missingUserKeyPath(Subject, Lesson)) {
        const seesDefault = isDefaultAdmin(actor) || !actor || (actor.role !== 'admin' && !actor.userKey);
        return {
            actor,
            isDefaultAdmin: isDefaultAdmin(actor),
            isOrgAdmin: isOrgAdmin(actor),
            filter: seesDefault ? {} : { _id: null },
            canAccess: (doc) => !!doc && seesDefault
        };
    }

    if (isDefaultAdmin(actor)) {
        return {
            actor,
            isDefaultAdmin: true,
            isOrgAdmin: false,
            filter: {},
            canAccess: () => true
        };
    }

    if (isOrgAdmin(actor)) {
        const myKey = toId(actor.userKey);
        const me = toId(actor._id);
        return {
            actor,
            isDefaultAdmin: false,
            isOrgAdmin: true,
            filter: { userKey: actor.userKey, createdBy: actor._id },
            canAccess: (doc) =>
                !!doc && toId(doc.userKey) === myKey && toId(doc.createdBy) === me
        };
    }

    // Student (hoặc khách)
    const wanted = actor
        ? [actor.userKey, ...(actor.connectedUserKeys || [])]
              .filter(Boolean)
              .map(String)
        : [];

    const activeDocs = wanted.length
        ? await UserKey.find({ _id: { $in: wanted }, active: true })
              .select('_id')
              .lean()
        : [];

    const activeIds = activeDocs.map((k) => k._id);
    const activeSet = new Set(activeIds.map(String));
    const allowNull = !actor || !actor.userKey;

    return {
        actor,
        isDefaultAdmin: false,
        isOrgAdmin: false,
        filter: {
            userKey: { $in: allowNull ? [null, ...activeIds] : activeIds }
        },
        canAccess: (doc) => {
            if (!doc) return false;
            const k = toId(doc.userKey);
            return k === null ? allowNull : activeSet.has(k);
        }
    };
}

/**
 * Filter danh sách user mà admin được nhìn thấy trong trang duyệt user.
 * Admin user_key: chỉ client/student cùng userKey. Admin default: tất cả.
 */
function buildUserListFilter(actor) {
    if (isDefaultAdmin(actor)) return {};
    if (isOrgAdmin(actor)) {
        return {
            userKey: actor.userKey,
            role: { $in: ['client', 'student'] }
        };
    }
    return { _id: null }; // không phải admin → không thấy ai
}

/**
 * Tính các field cần $set khi ADMIN DUYỆT một user.
 * Gọi hàm này trong controller duyệt user rồi User.updateOne / save.
 *
 *   - Admin user_key: chỉ duyệt user CÙNG userKey, chỉ thành 'student',
 *     userKey bị CỐ ĐỊNH theo admin — mọi userKey gửi lên bị bỏ qua.
 *   - Admin default : chọn role 'student' | 'admin'; được đổi userKey
 *     (input.userKey: '' hoặc null = tổ chức default).
 *
 * Ném lỗi có `.status` (403/400) nếu vi phạm.
 */
async function resolveApproval(actor, target, input = {}) {
    if (!actor || actor.role !== 'admin') {
        throw httpError(403, 'Bạn không có quyền duyệt user.');
    }
    if (!target) throw httpError(404, 'Không tìm thấy user.');

    const approvedFields = { status: 'approved', approvedAt: new Date(), approvedBy: actor._id };

    if (isOrgAdmin(actor)) {
        if (toId(target.userKey) !== toId(actor.userKey)) {
            throw httpError(403, 'Bạn chỉ được duyệt user thuộc tổ chức của mình.');
        }
        if (!['client', 'student'].includes(target.role)) {
            throw httpError(403, 'Bạn không được thay đổi tài khoản này.');
        }
        if (input.role && input.role !== 'student') {
            throw httpError(403, 'Admin tổ chức chỉ được duyệt user thành student.');
        }
        return { ...approvedFields, role: 'student', userKey: actor.userKey };
    }

    // Admin default
    const role = input.role || 'student';
    if (!['student', 'admin'].includes(role)) {
        throw httpError(400, 'Role không hợp lệ.');
    }

    let userKey = target.userKey || null;
    if (input.userKey !== undefined) {
        if (!input.userKey) {
            userKey = null;
        } else {
            if (!mongoose.Types.ObjectId.isValid(String(input.userKey))) {
                throw httpError(400, 'userKey không hợp lệ.');
            }
            const org = await UserKey.exists({ _id: input.userKey, active: true });
            if (!org) throw httpError(400, 'Tổ chức không tồn tại hoặc đã bị tắt.');
            userKey = input.userKey;
        }
    }

    return { ...approvedFields, role, userKey };
}

module.exports = {
    normalizeUserKeyCode,
    findActiveUserKeyByCode,
    getActor,
    isDefaultAdmin,
    isOrgAdmin,
    getContentScope,
    buildUserListFilter,
    resolveApproval
};
