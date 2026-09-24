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

        for (const subject of subjects) {
            subject.lessonCount = await Lesson.countDocuments({
                subject: subject._id,
                isPublished: true,
                deletedAt: null,
                deletedForever: { $ne: true },
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
exports.getSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            isPublished: true,
            deletedAt: null,
            deletedForever: { $ne: true },
        }).lean();

        if (!subject) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy',
                message: 'Không tìm thấy môn học.',
                statusCode: 404,
                stack: null,
            });
        }

        const lessons = await Lesson.find({
            subject: subject._id,
            isPublished: true,
            deletedAt: null,
            deletedForever: { $ne: true },
        })
            .sort({ order: 1, createdAt: 1 })
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

        const filter = { deletedForever: { $ne: true } };
        if (showDeleted) {
            filter.deletedAt = { $ne: null };
        } else {
            filter.deletedAt = null;
        }

        const subjects = await Subject.find(filter)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ order: 1, createdAt: -1 })
            .lean();

        for (const subject of subjects) {
            subject.lessonCount = await Lesson.countDocuments({
                subject: subject._id,
                deletedForever: { $ne: true },
            });
        }

        return res.render('admin/subjects', {
            title: 'Quản lý môn học',
            user: req.user,
            subjects,
            showDeleted,
            success: req.query.success || null,
            error: req.query.error || null,
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

        const lessonCount = await Lesson.countDocuments({
            subject: subject._id,
            deletedForever: { $ne: true },
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