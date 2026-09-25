// controllers/subject.controller.js
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');

// ============================================================
// HELPERS
// ============================================================
function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 100);
}

async function generateUniqueSlug(name, excludeId = null) {
    let base = slugify(name) || 'mon-hoc';
    let slug = base;
    let i = 0;

    while (true) {
        const query = { slug };
        if (excludeId) query._id = { $ne: excludeId };

        const found = await Subject.findOne(query).lean();
        if (!found) return slug;

        i++;
        slug = `${base}-${i}`;
        if (i > 1000) return `${base}-${Date.now().toString(36)}`;
    }
}

function getUserId(req) {
    return req.session?.user?._id || req.user?._id || null;
}

// ★ THÊM (theo lesson.controller.js): cho phép tìm subject theo ObjectId
// HOẶC theo slug, thay vì chỉ theo _id như hiện tại — để URL có thể dùng
// slug đẹp (/subjects/toan-hoc) song song với id cũ (/subjects/64f...).
function isObjectId(str) {
    return mongoose.Types.ObjectId.isValid(str) && String(str).length === 24;
}

function findSubjectByParam(param, extraFilter = {}) {
    const baseFilter = isObjectId(param) ? { _id: param } : { slug: param };
    return Subject.findOne({
        ...baseFilter,
        ...extraFilter,
    }).lean();
}

// Lấy subject theo id/slug KHÔNG lọc trạng thái — dùng để phân biệt
// "không tồn tại" (404 thật) với "đã bị xoá mềm" (hiện trang đã xoá),
// giống findLessonByParamAny bên lesson.controller.js.
function findSubjectByParamAny(param) {
    const baseFilter = isObjectId(param) ? { _id: param } : { slug: param };
    return Subject.findOne(baseFilter).lean();
}

// ★ THÊM: đọc flash message an toàn (connect-flash trả về mảng) — dùng
// làm phương án dự phòng bên cạnh query string success/error hiện có.
function readFlash(req, key) {
    if (typeof req.flash !== 'function') return null;
    const arr = req.flash(key);
    return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// ============================================================
// STUDENT
// ============================================================

// GET /subjects
exports.getSubjects = async (req, res, next) => {
    try {
        const subjects = await Subject.find({
            isPublished: true,
            deletedAt: null,
            deletedForever: { $ne: true },
        })
            .sort({ order: 1, createdAt: -1 })
            .lean();

        // ★ FIX (đối chiếu lesson.controller.js): Lesson dùng field
        //   `subjectId` (không phải `subject`) và cờ xoá mềm là `isDeleted`
        //   (không có `deletedAt`/`deletedForever`/`isPublished` trên Lesson)
        //   — filter cũ luôn không khớp document nào nên lessonCount sai (=0).
        for (const subject of subjects) {
            subject.lessonCount = await Lesson.countDocuments({
                subjectId: subject._id,
                isDeleted: false,
            });
        }

        return res.render('student/subjects', {
            title: 'Môn học',
            user: req.user,
            subjects,
        });
    } catch (error) {
        console.error('getSubjects error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải danh sách môn học.',
            statusCode: 500,
            stack: null,
        });
    }
};

// GET /subjects/:id
// ★ THÊM: chấp nhận cả slug lẫn ObjectId (findSubjectByParam), giống
//   findLessonByParam bên lesson.controller.js, thay vì chỉ tìm theo _id.
exports.getSubject = async (req, res, next) => {
    try {
        const key = req.params.id || req.params.slug;

        // ★ THÊM: tra "any" trước để phân biệt 404 thật với "đã bị xoá mềm"
        //   — trước đây filter thẳng isPublished/deletedAt nên môn học đã xoá
        //   luôn rơi vào 404 chung chung, dễ gây hiểu lầm là chưa từng tồn tại.
        const subjectAny = await findSubjectByParamAny(key);

        if (!subjectAny || subjectAny.deletedForever) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy',
                message: 'Không tìm thấy môn học.',
                statusCode: 404,
                stack: null,
            });
        }

        if (subjectAny.deletedAt || !subjectAny.isPublished) {
            return res.status(410).render('error', {
                title: 'Môn học không khả dụng',
                message: 'Môn học này hiện không được công khai hoặc đã bị xoá.',
                statusCode: 410,
                stack: null,
            });
        }

        const subject = subjectAny;

        // ★ FIX: Lesson dùng `subjectId` + `isDeleted` (xem lesson.controller.js),
        //   không phải `subject` + `isPublished`/`deletedAt`/`deletedForever`.
        const lessons = await Lesson.find({
            subjectId: subject._id,
            isDeleted: false,
        })
            .sort({ createdAt: 1 })
            .lean();

        return res.render('student/subject', {
            title: subject.name,
            user: req.user,
            subject,
            lessons,
        });
    } catch (error) {
        console.error('getSubject error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải môn học.',
            statusCode: 500,
            stack: null,
        });
    }
};

// ============================================================
// ADMIN — LIST
// GET /admin/subjects
// ============================================================
exports.getAdminSubjects = async (req, res, next) => {
    try {
        const showDeleted = req.query.deleted === '1';
        // ★ THÊM (theo lesson.controller.js): tìm kiếm theo tên/mã môn học,
        //   giống ô search trong getAdminLessons.
        const search = (req.query.search || '').trim();

        const filter = { deletedForever: { $ne: true } };
        if (showDeleted) {
            filter.deletedAt = { $ne: null };
        } else {
            filter.deletedAt = null;
        }

        if (search) {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: safe, $options: 'i' } },
                { code: { $regex: safe, $options: 'i' } },
            ];
        }

        const subjects = await Subject.find(filter)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ order: 1, createdAt: -1 })
            .lean();

        // ★ FIX: Lesson dùng `subjectId` + `isDeleted` (xem lesson.controller.js).
        for (const subject of subjects) {
            subject.lessonCount = await Lesson.countDocuments({
                subjectId: subject._id,
                isDeleted: false,
            });
        }

        return res.render('admin/subjects', {
            title: 'Quản lý môn học',
            user: req.user,
            subjects,
            showDeleted,
            filters: { search },
            success: req.query.success || readFlash(req, 'success'),
            error: req.query.error || readFlash(req, 'error'),
        });
    } catch (error) {
        console.error('getAdminSubjects error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải danh sách môn học.',
            statusCode: 500,
            stack: null,
        });
    }
};

// ============================================================
// ADMIN — CREATE POST
// POST /admin/subjects
// ============================================================
exports.createSubject = async (req, res, next) => {
    try {
        const { name, code, description, order, isPublished } = req.body;

        if (!name || !name.trim()) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Tên môn học không được để trống.')
            );
        }

        const existed = await Subject.findOne({
            name: name.trim(),
            deletedForever: { $ne: true },
        });

        if (existed) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Tên môn học đã tồn tại.')
            );
        }

        const slug = await generateUniqueSlug(name);

        await Subject.create({
            name: name.trim(),
            code: (code || '').trim() || null,
            description: (description || '').trim(),
            slug,
            order: Number(order) || 0,
            isPublished: isPublished === 'on' || isPublished === true,
            createdBy: getUserId(req),
            updatedBy: getUserId(req),
        });

        // ★ THÊM: bắn thêm flash message (nếu app có connect-flash) song song
        //   với query string cũ, để tương lai view có thể chuyển sang đọc flash.
        req.flash?.('success', 'Đã tạo môn học thành công.');

        return res.redirect(
            '/admin/subjects?success=' +
                encodeURIComponent('Đã tạo môn học thành công.')
        );
    } catch (error) {
        console.error('createSubject error:', error);
        return res.redirect(
            '/admin/subjects?error=' +
                encodeURIComponent('Không thể tạo môn học: ' + error.message)
        );
    }
};

// ============================================================
// ADMIN — EDIT FORM
// GET /admin/subjects/:id/edit
// ============================================================
exports.showEditSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            deletedForever: { $ne: true },
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .lean();

        if (!subject) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Không tìm thấy môn học.')
            );
        }

        return res.render('admin/subject-edit', {
            title: 'Chỉnh sửa môn học',
            user: req.user,
            subject,
            success: req.query.success || null,
            error: req.query.error || null,
        });
    } catch (error) {
        console.error('showEditSubject error:', error);
        return res.redirect(
            '/admin/subjects?error=' +
                encodeURIComponent('Không thể tải môn học.')
        );
    }
};

// ============================================================
// ADMIN — UPDATE
// POST /admin/subjects/:id/edit
// ============================================================
exports.updateSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, description, order, isPublished } = req.body;

        const subject = await Subject.findOne({
            _id: id,
            deletedForever: { $ne: true },
        });

        if (!subject) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Không tìm thấy môn học.')
            );
        }

        if (name && name.trim() !== subject.name) {
            const dup = await Subject.findOne({
                _id: { $ne: id },
                name: name.trim(),
                deletedForever: { $ne: true },
            });

            if (dup) {
                return res.redirect(
                    `/admin/subjects/${id}/edit?error=` +
                        encodeURIComponent('Tên môn học đã tồn tại.')
                );
            }

            subject.name = name.trim();
            subject.slug = await generateUniqueSlug(name, id);
        }

        if (code !== undefined) subject.code = (code || '').trim() || null;
        if (description !== undefined)
            subject.description = (description || '').trim();
        if (order !== undefined) subject.order = Number(order) || 0;
        if (isPublished !== undefined)
            subject.isPublished =
                isPublished === 'on' || isPublished === true;

        subject.updatedBy = getUserId(req);

        await subject.save();

        req.flash?.('success', 'Đã cập nhật môn học.');

        return res.redirect(
            `/admin/subjects/${id}/edit?success=` +
                encodeURIComponent('Đã cập nhật môn học.')
        );
    } catch (error) {
        console.error('updateSubject error:', error);
        return res.redirect(
            `/admin/subjects/${req.params.id}/edit?error=` +
                encodeURIComponent('Không thể cập nhật: ' + error.message)
        );
    }
};

// ============================================================
// ADMIN — DELETE (soft)
// POST /admin/subjects/:id/delete
// ============================================================
exports.deleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            deletedForever: { $ne: true },
        });

        if (!subject) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Không tìm thấy môn học.')
            );
        }

        subject.deletedAt = new Date();
        subject.deletedBy = getUserId(req);
        subject.updatedBy = getUserId(req);
        await subject.save();

        req.flash?.('success', 'Đã xoá môn học (có thể khôi phục).');

        return res.redirect(
            '/admin/subjects?success=' +
                encodeURIComponent('Đã xoá môn học (có thể khôi phục).')
        );
    } catch (error) {
        console.error('deleteSubject error:', error);
        return res.redirect(
            '/admin/subjects?error=' +
                encodeURIComponent('Không thể xoá: ' + error.message)
        );
    }
};

// ============================================================
// ADMIN — RESTORE
// POST /admin/subjects/:id/restore
// ============================================================
exports.restoreSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            deletedForever: { $ne: true },
        });

        if (!subject) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Không tìm thấy môn học.')
            );
        }

        subject.deletedAt = null;
        subject.deletedBy = null;
        subject.updatedBy = getUserId(req);
        await subject.save();

        req.flash?.('success', 'Đã khôi phục môn học.');

        return res.redirect(
            '/admin/subjects?deleted=1&success=' +
                encodeURIComponent('Đã khôi phục môn học.')
        );
    } catch (error) {
        console.error('restoreSubject error:', error);
        return res.redirect(
            '/admin/subjects?error=' +
                encodeURIComponent('Không thể khôi phục.')
        );
    }
};

// ============================================================
// ADMIN — HARD DELETE
// POST /admin/subjects/:id/hard-delete
// ============================================================
exports.hardDeleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent('Không tìm thấy môn học.')
            );
        }

        // ★ THÊM (theo hardDeleteLesson bên lesson.controller.js): chỉ cho
        //   xoá vĩnh viễn môn ĐANG ở thùng rác — buộc đi qua bước xoá mềm
        //   trước, tránh bấm nhầm xoá thẳng một môn đang hoạt động.
        if (!subject.deletedAt) {
            return res.redirect(
                '/admin/subjects?error=' +
                    encodeURIComponent(
                        'Chỉ có thể xoá vĩnh viễn môn học đang ở trong thùng rác.'
                    )
            );
        }

        // ★ FIX: Lesson dùng `subjectId` + `isDeleted` (xem lesson.controller.js).
        const lessonCount = await Lesson.countDocuments({
            subjectId: subject._id,
            isDeleted: false,
        });

        if (lessonCount > 0) {
            return res.redirect(
                '/admin/subjects?deleted=1&error=' +
                    encodeURIComponent(
                        `Không thể xoá vĩnh viễn: còn ${lessonCount} bài học.`
                    )
            );
        }

        subject.deletedForever = true;
        subject.updatedBy = getUserId(req);
        await subject.save();

        req.flash?.('success', 'Đã xoá vĩnh viễn môn học.');

        return res.redirect(
            '/admin/subjects?deleted=1&success=' +
                encodeURIComponent('Đã xoá vĩnh viễn môn học.')
        );
    } catch (error) {
        console.error('hardDeleteSubject error:', error);
        return res.redirect(
            '/admin/subjects?error=' +
                encodeURIComponent('Không thể xoá vĩnh viễn.')
        );
    }
};