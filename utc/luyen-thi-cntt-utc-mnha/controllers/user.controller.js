// controllers/user.controller.js
const mongoose = require("mongoose");
const User = require("../models/User");

// Optional models
let AuditLog = null;
let Notification = null;
try { AuditLog = require("../models/AuditLog"); } catch (_) {}
try { Notification = require("../models/Notification"); } catch (_) {}

// ============================================================
// CONSTANTS
// ============================================================

const ALLOWED_ROLES = ["client", "student", "admin"];
const ALLOWED_STATUS = ["pending", "approved", "rejected", "disabled"];

// ============================================================
// HELPERS
// ============================================================

function wantsJson(req) {
    return (
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json") ||
        req.is("application/json")
    );
}

function safeStr(v) { return typeof v === "string" ? v : ""; }

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;
}

/**
 * Xoá tất cả session của user — force logout khỏi mọi thiết bị
 * Dùng khi đổi role/status để session cũ không còn hiệu lực.
 */
async function clearUserSessions(userId) {
    try {
        const sessions = mongoose.connection.collection("sessions");
        const idStr = String(userId);
        const result = await sessions.deleteMany({
            $or: [
                { "session.user._id": idStr },
                { "session.user.id": idStr },
                { "session.user._id": new mongoose.Types.ObjectId(idStr) },
            ],
        });
        return result.deletedCount || 0;
    } catch (e) {
        console.warn("[clearUserSessions]", e.message);
        return 0;
    }
}

async function writeAudit(adminId, action, targetId, detail = {}) {
    if (!AuditLog) return;
    try {
        await AuditLog.create({
            adminId,
            action,
            targetType: "User",
            targetId,
            detail,
        });
    } catch (_) {}
}

async function pushNotification(userId, type, title, message, link = null) {
    if (!Notification) return;
    try {
        await Notification.create({
            userId,
            type,
            title,
            message,
            link,
            isRead: false,
        });
    } catch (_) {}
}

// ============================================================
// 1. LIST USERS — GET /admin/users
// Query: ?q=search&role=all|client|student|admin&status=all|pending|approved|rejected|disabled&page=1
// ============================================================

exports.getUsers = async (req, res, next) => {
    try {
        const currentAdmin = req.session?.user || req.user;

        const q = safeStr(req.query.q).trim();
        const roleFilter = safeStr(req.query.role).trim() || "all";
        const statusFilter = safeStr(req.query.status).trim() || "all";
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = 20;

        // Build query
        const query = {};

        if (q) {
            const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            query.$or = [{ name: rx }, { email: rx }];
        }
        if (roleFilter !== "all" && ALLOWED_ROLES.includes(roleFilter)) {
            query.role = roleFilter;
        }
        if (statusFilter !== "all" && ALLOWED_STATUS.includes(statusFilter)) {
            query.status = statusFilter;
        }

        // Đếm + lấy data song song
        const [total, users, statsRaw] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .select("-password")
                .populate("approvedBy", "name email")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Promise.all([
                User.countDocuments({}),
                User.countDocuments({ status: "pending" }),
                User.countDocuments({ role: "student" }),
                User.countDocuments({ role: "admin" }),
                User.countDocuments({ role: "client" }),
            ]),
        ]);

        const [totalAll, pendingCount, studentCount, adminCount, clientCount] = statsRaw;

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.render("admin/users", {
            title: "Quản lý tài khoản",
            user: currentAdmin,
            users,
            filters: { q, role: roleFilter, status: statusFilter },
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
            stats: {
                total: totalAll,
                pending: pendingCount,
                student: studentCount,
                admin: adminCount,
                client: clientCount,
            },
            allowedRoles: ALLOWED_ROLES,
            allowedStatus: ALLOWED_STATUS,
        });
    } catch (err) {
        console.error("❌ getUsers:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 2. GET USER (AJAX — dùng cho modal)
// GET /admin/users/:id.json
// ============================================================

exports.getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id).select("-password").lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        return res.json({ success: true, user });
    } catch (err) {
        console.error("❌ getUser:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ============================================================
// 3. UPDATE USER (role + status) — POST /admin/users/:id/update
// body: { role, status, name? }
// ============================================================

exports.updateUser = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // Bảo vệ: admin không tự hạ role mình
        const isSelf = String(user._id) === String(adminId);
        const { role, status, name } = req.body || {};

        const newRole = role ? String(role).trim() : user.role;
        const newStatus = status ? String(status).trim() : user.status;
        const newName = name !== undefined ? String(name).trim() : user.name;

        if (!ALLOWED_ROLES.includes(newRole)) {
            return res.status(400).json({ success: false, message: `Role không hợp lệ: ${newRole}` });
        }
        if (!ALLOWED_STATUS.includes(newStatus)) {
            return res.status(400).json({ success: false, message: `Status không hợp lệ: ${newStatus}` });
        }

        if (isSelf && newRole !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Không thể tự hạ quyền admin của chính mình.",
            });
        }

        const oldRole = user.role;
        const oldStatus = user.status;

        // Cập nhật
        user.role = newRole;
        user.status = newStatus;
        if (newName) user.name = newName;

        // Đánh dấu người duyệt khi chuyển sang approved lần đầu
        if (newStatus === "approved" && oldStatus !== "approved") {
            user.approvedAt = new Date();
            user.approvedBy = adminId;
        }

        await user.save();

        // Nếu role/status đổi → clear session cũ
        const roleChanged = oldRole !== newRole;
        const statusChanged = oldStatus !== newStatus;
        if (roleChanged || statusChanged) {
            await clearUserSessions(user._id);
        }

        // Sinh thông báo khi được duyệt
        if (newStatus === "approved" && oldStatus === "pending") {
            await pushNotification(
                user._id,
                "account_approved",
                "Tài khoản đã được duyệt",
                "Tài khoản của bạn đã được Admin phê duyệt. Bạn có thể bắt đầu học.",
                "/subjects"
            );
        } else if (newStatus === "rejected" && oldStatus !== "rejected") {
            await pushNotification(
                user._id,
                "system",
                "Tài khoản bị từ chối",
                "Tài khoản của bạn đã bị từ chối bởi Admin.",
                null
            );
        }

        // Audit log
        await writeAudit(adminId, "update_user", user._id, {
            oldRole, newRole,
            oldStatus, newStatus,
            nameChanged: newName !== user.name ? { from: user.name, to: newName } : null,
        });

        if (wantsJson(req)) {
            return res.json({
                success: true,
                message: "Đã cập nhật tài khoản.",
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            });
        }

        req.flash?.("success", `Đã cập nhật tài khoản ${user.email}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ updateUser:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 4. QUICK APPROVE — POST /admin/users/:id/approve
// ============================================================

exports.approveUser = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        // Đổi status + tự động chuyển role client → student
        const oldRole = user.role;
        user.status = "approved";
        if (user.role === "client") {
            user.role = "student";
        }
        user.approvedAt = new Date();
        user.approvedBy = adminId;
        await user.save();

        await clearUserSessions(user._id);

        await pushNotification(
            user._id,
            "account_approved",
            "Tài khoản đã được duyệt",
            "Tài khoản của bạn đã được Admin phê duyệt. Bạn có thể bắt đầu học.",
            "/subjects"
        );

        await writeAudit(adminId, "approve_user", user._id, {
            oldRole,
            newRole: user.role,
        });

        if (wantsJson(req)) {
            return res.json({
                success: true,
                message: `Đã duyệt ${user.email}`,
                user: { _id: user._id, role: user.role, status: user.status },
            });
        }

        req.flash?.("success", `Đã duyệt ${user.email}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ approveUser:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 5. REJECT — POST /admin/users/:id/reject
// ============================================================

exports.rejectUser = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        user.status = "rejected";
        await user.save();

        await clearUserSessions(user._id);
        await writeAudit(adminId, "reject_user", user._id, {});

        if (wantsJson(req)) {
            return res.json({ success: true, message: `Đã từ chối ${user.email}` });
        }

        req.flash?.("success", `Đã từ chối ${user.email}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ rejectUser:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 6. TOGGLE STATUS (disable / enable) — POST /admin/users/:id/toggle
// ============================================================

exports.toggleStatus = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const isSelf = String(user._id) === String(adminId);
        if (isSelf) {
            return res.status(403).json({
                success: false,
                message: "Không thể tự vô hiệu hoá tài khoản của mình.",
            });
        }

        const oldStatus = user.status;
        user.status = user.status === "disabled" ? "approved" : "disabled";
        await user.save();

        await clearUserSessions(user._id);
        await writeAudit(adminId, "toggle_user_status", user._id, {
            oldStatus,
            newStatus: user.status,
        });

        if (wantsJson(req)) {
            return res.json({ success: true, user: { status: user.status } });
        }

        req.flash?.("success", `Đã đổi trạng thái ${user.email} → ${user.status}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ toggleStatus:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 7. DELETE USER — POST /admin/users/:id/delete
// ============================================================

exports.deleteUser = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const isSelf = String(user._id) === String(adminId);
        if (isSelf) {
            return res.status(403).json({
                success: false,
                message: "Không thể tự xoá tài khoản của mình.",
            });
        }

        await clearUserSessions(user._id);
        await User.deleteOne({ _id: user._id });
        await writeAudit(adminId, "delete_user", user._id, {
            email: user.email,
            role: user.role,
        });

        if (wantsJson(req)) {
            return res.json({ success: true, message: `Đã xoá ${user.email}` });
        }

        req.flash?.("success", `Đã xoá ${user.email}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ deleteUser:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};

// ============================================================
// 8. CHANGE ROLE ONLY — POST /admin/users/:id/role
// body: { role }
// ============================================================

exports.changeRole = async (req, res, next) => {
    try {
        const admin = req.session?.user || req.user;
        const adminId = admin?._id || admin?.id;
        const { id } = req.params;
        const { role } = req.body || {};

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: "Role không hợp lệ" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const isSelf = String(user._id) === String(adminId);
        if (isSelf && role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Không thể tự hạ quyền admin của chính mình.",
            });
        }

        const oldRole = user.role;
        user.role = role;

        // Nếu đổi sang student thì đảm bảo status approved
        if (role === "student" && user.status === "pending") {
            user.status = "approved";
            user.approvedAt = new Date();
            user.approvedBy = adminId;
        }

        await user.save();
        await clearUserSessions(user._id);
        await writeAudit(adminId, "change_role", user._id, { oldRole, newRole: role });

        if (wantsJson(req)) {
            return res.json({
                success: true,
                user: { _id: user._id, role: user.role, status: user.status },
            });
        }

        req.flash?.("success", `Đã đổi vai trò ${user.email} → ${role}`);
        return res.redirect("/admin/users");
    } catch (err) {
        console.error("❌ changeRole:", err);
        if (wantsJson(req)) return res.status(500).json({ success: false, message: err.message });
        next(err);
    }
};