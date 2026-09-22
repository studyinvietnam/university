const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');

const getLessons = async (req, res) => {
    try {
        const filter = {
            isPublished: true
        };

        if (req.params.subjectId) {
            filter.subject = req.params.subjectId;
        }

        const lessons = await Lesson.find(filter)
            .populate('subject', 'name code')
            .sort({
                order: 1,
                createdAt: 1
            })
            .lean();

        return res.render('student/lessons', {
            title: 'Bài học',
            lessons
        });
    } catch (error) {
        console.error('Get lessons error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể tải danh sách bài học.'
        });
    }
};

const getLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findOne({
            _id: req.params.id,
            isPublished: true
        })
            .populate('subject', 'name code')
            .lean();

        if (!lesson) {
            return res.status(404).render('pages', {
                title: 'Không tìm thấy',
                error: 'Không tìm thấy bài học.'
            });
        }

        const assignments = lesson.assignments || [];

        return res.render('student/lesson', {
            title: lesson.name,
            lesson,
            subject: lesson.subject,
            assignments
        });
    } catch (error) {
        console.error('Get lesson error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể tải bài học.'
        });
    }
};

const createLesson = async (req, res) => {
    try {
        const {
            subject,
            name,
            code,
            description,
            content,
            order
        } = req.body;

        if (!subject || !name) {
            return res.status(400).redirect('/admin/lessons');
        }

        await Lesson.create({
            subject,
            name: name.trim(),
            code: code?.trim(),
            description: description?.trim(),
            content,
            order: Number(order) || 0,
            isPublished: false
        });

        return res.redirect('/admin/lessons');
    } catch (error) {
        console.error('Create lesson error:', error);

        return res.status(500).redirect('/admin/lessons');
    }
};

const updateLesson = async (req, res) => {
    try {
        const {
            subject,
            name,
            code,
            description,
            content,
            order,
            isPublished
        } = req.body;

        const lesson = await Lesson.findById(req.params.id);

        if (!lesson) {
            return res.status(404).redirect('/admin/lessons');
        }

        lesson.subject = subject || lesson.subject;
        lesson.name = name?.trim() || lesson.name;
        lesson.code = code?.trim();
        lesson.description = description?.trim();
        lesson.content = content;
        lesson.order = Number(order) || 0;
        lesson.isPublished = isPublished === 'true' || isPublished === 'on';

        await lesson.save();

        return res.redirect('/admin/lessons');
    } catch (error) {
        console.error('Update lesson error:', error);

        return res.status(500).redirect('/admin/lessons');
    }
};

const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);

        if (!lesson) {
            return res.status(404).redirect('/admin/lessons');
        }

        await Lesson.findByIdAndDelete(req.params.id);

        return res.redirect('/admin/lessons');
    } catch (error) {
        console.error('Delete lesson error:', error);

        return res.status(500).redirect('/admin/lessons');
    }
};

module.exports = {
    getLessons,
    getLesson,
    createLesson,
    updateLesson,
    deleteLesson
};