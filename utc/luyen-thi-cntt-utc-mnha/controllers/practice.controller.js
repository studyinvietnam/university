// controllers/practice.controller.js
const Subject = require('../models/Subject');
const Lesson = require('../models/Lesson');
const Submission = require('../models/Submission');

// ============================================================
// LIST PRACTICE — cả admin + student đều vào
// GET /practice
// ============================================================
exports.listPractice = async (req, res, next) => {
    try {
        const user = req.user;
        const subjectFilter = req.query.subject || null;

        const subjectQuery = {
            deletedAt: null,
            deletedForever: { $ne: true }
        };

        const lessonQuery = {
            deletedAt: null,
            deletedForever: { $ne: true }
        };

        // Student chỉ thấy bài đã publish; admin thấy hết
        if (user?.role !== 'admin') {
            subjectQuery.isPublished = true;
            lessonQuery.isPublished = true;
        }

        if (subjectFilter) {
            lessonQuery.subjectId = subjectFilter;
        }

        const [subjects, lessons] = await Promise.all([
            Subject.find(subjectQuery).sort({ order: 1, name: 1 }).lean(),
            Lesson.find(lessonQuery).sort({ order: 1, createdAt: -1 }).lean()
        ]);

        // Gắn subject cho từng lesson
        const subjectMap = Object.fromEntries(
            subjects.map((s) => [String(s._id), s])
        );

        const lessonsWithSubject = lessons.map((l) => ({
            ...l,
            subject: subjectMap[String(l.subjectId || l.subject)] || null
        }));

        // Lịch sử nộp bài của user (kể cả admin)
        const submittedMap = {};
        if (user) {
            const subs = await Submission.find({
                userId: user._id,
                lessonId: { $in: lessons.map((l) => l._id) }
            })
                .sort({ submittedAt: -1 })
                .lean();

            subs.forEach((s) => {
                const key = String(s.lessonId);
                if (!submittedMap[key]) {
                    submittedMap[key] = {
                        score: s.score,
                        maxScore: (s.promptSnapshot && s.promptSnapshot.maxScore) || 10,
                        submittedAt: s.submittedAt,
                        submissionId: s._id
                    };
                }
            });
        }

        return res.render('practice', {
            title: 'Luyện tập',
            user,
            subjects,
            lessons: lessonsWithSubject,
            submittedMap,
            filters: { subject: subjectFilter || '' }
        });
    } catch (error) {
        console.error('listPractice error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải trang luyện tập.',
            statusCode: 500,
            stack: null
        });
    }
};