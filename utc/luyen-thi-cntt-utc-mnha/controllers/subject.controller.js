const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');

const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({
            isPublished: true
        }).sort({
            createdAt: -1
        }).lean();

        for (const subject of subjects) {
            subject.lessonCount = await Lesson.countDocuments({
                subject: subject._id,
                isPublished: true
            });
        }

        return res.render('student/subjects', {
            title: 'Môn học',
            subjects
        });
    } catch (error) {
        console.error('Get subjects error:', error);

        return res.status(500).render('student/subjects', {
            title: 'Môn học',
            subjects: [],
            error: 'Không thể tải danh sách môn học.'
        });
    }
};

const getSubject = async (req, res) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            isPublished: true
        }).lean();

        if (!subject) {
            return res.status(404).render('pages', {
                title: 'Không tìm thấy',
                error: 'Không tìm thấy môn học.'
            });
        }

        const lessons = await Lesson.find({
            subject: subject._id,
            isPublished: true
        }).sort({
            order: 1,
            createdAt: 1
        }).lean();

        return res.render('student/subject', {
            title: subject.name,
            subject,
            lessons
        });
    } catch (error) {
        console.error('Get subject error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể tải môn học.'
        });
    }
};

module.exports = {
    getSubjects,
    getSubject
};