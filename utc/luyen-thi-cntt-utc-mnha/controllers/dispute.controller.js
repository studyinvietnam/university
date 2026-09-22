const Dispute = require('../models/Dispute');
const Submission = require('../models/Submission');

const showDispute = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const submission = await Submission.findOne({
            _id: req.params.id,
            student: userId
        })
            .populate('subject', 'name code')
            .populate('lesson', 'name code')
            .populate('assignment', 'title maxScore')
            .lean();

        if (!submission) {
            return res.status(404).render('pages', {
                title: 'Không tìm thấy',
                error: 'Không tìm thấy bài nộp.'
            });
        }

        const dispute = await Dispute.findOne({
            submission: submission._id,
            student: userId
        }).lean();

        return res.render('student/dispute', {
            title: 'Khiếu nại kết quả',
            submission,
            dispute,
            submissionId: submission._id
        });
    } catch (error) {
        console.error('Show dispute error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể tải trang khiếu nại.'
        });
    }
};

const createDispute = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).render('student/dispute', {
                title: 'Khiếu nại kết quả',
                error: 'Nội dung khiếu nại phải có ít nhất 10 ký tự.'
            });
        }

        const submission = await Submission.findOne({
            _id: req.params.id,
            student: userId
        });

        if (!submission) {
            return res.status(404).render('pages', {
                title: 'Không tìm thấy',
                error: 'Không tìm thấy bài nộp.'
            });
        }

        const existingDispute = await Dispute.findOne({
            submission: submission._id,
            student: userId,
            status: {
                $in: ['pending', 'reviewing']
            }
        });

        if (existingDispute) {
            return res.redirect(
                `/student/submissions/${submission._id}/dispute`
            );
        }

        await Dispute.create({
            submission: submission._id,
            student: userId,
            reason: reason.trim(),
            status: 'pending'
        });

        submission.disputeStatus = 'pending';

        await submission.save();

        return res.redirect(
            `/student/submissions/${submission._id}/dispute`
        );
    } catch (error) {
        console.error('Create dispute error:', error);

        return res.status(500).render('pages', {
            title: 'Lỗi',
            error: 'Không thể gửi khiếu nại.'
        });
    }
};

const getDisputes = async (req, res) => {
    try {
        const disputes = await Dispute.find({})
            .populate('student', 'name email')
            .populate({
                path: 'submission',
                populate: [
                    {
                        path: 'subject',
                        select: 'name code'
                    },
                    {
                        path: 'assignment',
                        select: 'title maxScore'
                    }
                ]
            })
            .sort({
                createdAt: -1
            })
            .lean();

        return res.json({
            success: true,
            disputes
        });
    } catch (error) {
        console.error('Get disputes error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể tải danh sách khiếu nại.'
        });
    }
};

const updateDispute = async (req, res) => {
    try {
        const {
            status,
            adminNote
        } = req.body;

        const dispute = await Dispute.findById(
            req.params.id
        );

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khiếu nại.'
            });
        }

        dispute.status = status || dispute.status;
        dispute.adminNote = adminNote || '';

        if (
            status === 'resolved' ||
            status === 'rejected'
        ) {
            dispute.resolvedAt = new Date();
            dispute.resolvedBy = req.session.user.id;
        }

        await dispute.save();

        return res.json({
            success: true,
            message: 'Đã cập nhật khiếu nại.'
        });
    } catch (error) {
        console.error('Update dispute error:', error);

        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật khiếu nại.'
        });
    }
};

module.exports = {
    showDispute,
    createDispute,
    getDisputes,
    updateDispute
};