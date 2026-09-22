const Submission = require('../models/Submission');
const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');

const getHistory = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const submissions = await Submission.find({
            student: userId
        })
            .populate('subject', 'name code')
            .populate('lesson', 'name code')
            .populate('assignment', 'title maxScore')
            .sort({
                createdAt: -1
            })
            .lean();

        const total = submissions.length;

        const graded = submissions.filter(
            item => item.status === 'graded' || item.status === 'completed'
        ).length;

        const pending = submissions.filter(
            item => item.status === 'pending' ||
                    item.status === 'grading'
        ).length;

        const scored = submissions.filter(
            item => typeof item.score === 'number'
        );

        const averageScore = scored.length
            ? (
                scored.reduce(
                    (sum, item) => sum + item.score,
                    0
                ) / scored.length
            ).toFixed(2)
            : null;

        return res.render('student/history', {
            title: 'Lịch sử bài làm',
            submissions,
            stats: {
                total,
                graded,
                pending,
                averageScore
            }
        });
    } catch (error) {
        console.error('Get submission history error:', error);

        return res.status(500).render('student/history', {
            title: 'Lịch sử bài làm',
            submissions: [],
            stats: {
                total: 0,
                graded: 0,
                pending: 0,
                averageScore: null
            },
            error: 'Không thể tải lịch sử bài làm.'
        });
    }
};

const getSubmission = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const submission = await Submission.findOne({
            _id: req.params.id,
            student: userId
        })
            .populate('subject')
            .populate('lesson')
            .populate('assignment')
            .lean();

        if (!submission) {
            return res.status(404).render('pages', {
                title: 'Không tìm thấy',
                error: 'Không tìm thấy bài nộp.'
            });
        }

        return res.render('student/submission', {
            title: 'Chi tiết bài nộp',
            submission
        });
    } catch (error) {
        console.error('Get submission error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể tải bài nộp.'
        });
    }
};

const createSubmission = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const {
            subject,
            lesson,
            assignment,
            content
        } = req.body;

        if (!lesson || !assignment || !content) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bài nộp.'
            });
        }

        const existingSubmission = await Submission.findOne({
            student: userId,
            assignment,
            status: {
                $in: ['pending', 'grading']
            }
        });

        if (existingSubmission) {
            return res.status(409).json({
                success: false,
                message: 'Bạn đã có một bài nộp đang được xử lý.'
            });
        }

        const submission = await Submission.create({
            student: userId,
            subject,
            lesson,
            assignment,
            content,
            status: 'pending',
            submittedAt: new Date()
        });

        /*
         * TODO:
         * Đẩy submission vào queue chấm AI.
         */

        return res.status(201).json({
            success: true,
            message: 'Nộp bài thành công.',
            submissionId: submission._id
        });
    } catch (error) {
        console.error('Create submission error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể nộp bài.'
        });
    }
};

const getAdminSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({})
            .populate('student', 'name email')
            .populate('subject', 'name code')
            .populate('lesson', 'name code')
            .populate('assignment', 'title maxScore')
            .sort({
                createdAt: -1
            })
            .lean();

        return res.render('admin/submissions', {
            title: 'Quản lý bài nộp',
            submissions
        });
    } catch (error) {
        console.error('Get admin submissions error:', error);

        return res.status(500).render('admin/submissions', {
            title: 'Quản lý bài nộp',
            submissions: [],
            error: 'Không thể tải danh sách bài nộp.'
        });
    }
};

const updateGrade = async (req, res) => {
    try {
        const {
            score,
            feedback
        } = req.body;

        const submission = await Submission.findById(
            req.params.id
        );

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài nộp.'
            });
        }

        submission.score = Number(score);
        submission.feedback = feedback || '';
        submission.status = 'graded';
        submission.gradedAt = new Date();

        await submission.save();

        return res.json({
            success: true,
            message: 'Đã cập nhật kết quả.'
        });
    } catch (error) {
        console.error('Update grade error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật điểm.'
        });
    }
};

module.exports = {
    getHistory,
    getSubmission,
    createSubmission,
    getAdminSubmissions,
    updateGrade
};