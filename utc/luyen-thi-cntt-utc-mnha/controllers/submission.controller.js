const Submission = require('../models/Submission');
const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');

const submissionService = require('../services/submissionService');
const notificationService = require('../services/notificationService');
const githubService = require('../services/githubService');

// ============================================================
// HELPER
// ============================================================
function wantsJson(req) {
    return (
        req.xhr ||
        req.path.startsWith('/api') ||
        req.headers.accept?.includes('json')
    );
}

// ============================================================
// CREATE — student + admin đều nộp được
// ============================================================
const createSubmission = async (req, res) => {
    try {
        const user = req.session?.user;

        if (!user) {
            if (wantsJson(req)) {
                return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
            }
            return res.redirect('/auth/login');
        }

        const userId = user.id || user._id;

        const { lessonId, answerHtml, model, aiKeyId } = req.body;

        if (!lessonId) {
            if (wantsJson(req)) {
                return res.status(400).json({ success: false, message: 'Thiếu lessonId.' });
            }
            return res.redirect('back');
        }

        if (!answerHtml || !String(answerHtml).trim()) {
            if (wantsJson(req)) {
                return res.status(400).json({ success: false, message: 'Bài làm không được để trống.' });
            }
            return res.redirect(`/lessons/${lessonId}?error=${encodeURIComponent('Bài làm không được để trống.')}`);
        }

        const lesson = await Lesson.findOne({
            _id: lessonId,
            deletedAt: null,
            deletedForever: { $ne: true }
        }).lean();

        if (!lesson) {
            if (wantsJson(req)) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bài học.' });
            }
            return res.redirect(`/lessons/${lessonId}?error=${encodeURIComponent('Không tìm thấy bài học.')}`);
        }

        const result = await submissionService.gradeAndSave({
            userId,
            lessonId: String(lesson._id),
            answerHtml: String(answerHtml).trim(),
            model: model || null,
            aiKeyId: aiKeyId || null
        });

        if (result.status === 'graded') {
            // === THÀNH CÔNG ===
            if (wantsJson(req)) {
                return res.json({
                    success: true,
                    submissionId: result._id,
                    score: result.score,
                    status: 'graded',
                    redirect: `/submissions/${result._id}`
                });
            }
            return res.redirect(
                `/submissions/${result._id}?success=${encodeURIComponent('Đã nộp và chấm thành công.')}`
            );
        } else {
            // === AI CHẤM THẤT BẠI — submission VẪN LƯU ===
            let friendlyMsg = result.errorMessage || 'Chấm bài thất bại.';
            const msg = String(friendlyMsg).toLowerCase();

            if (msg.includes('high demand') || msg.includes('503') || msg.includes('try again')) {
                friendlyMsg = 'Model AI đang quá tải. Vui lòng thử nộp lại sau 30 giây.';
            } else if (msg.includes('denied access') || msg.includes('403')) {
                friendlyMsg = 'API Key chưa được Google cấp quyền. Liên hệ admin.';
            } else if (msg.includes('quota') || msg.includes('429')) {
                friendlyMsg = 'Đã hết quota trong phút này. Vui lòng thử lại sau 1 phút.';
            } else if (msg.includes('no longer available')) {
                friendlyMsg = 'Model AI đã bị Google khai tử. Liên hệ admin đổi model.';
            }

            if (wantsJson(req)) {
                return res.status(200).json({
                    success: false,
                    submissionId: result._id,
                    status: 'failed',
                    message: friendlyMsg,
                    detailUrl: `/submissions/${result._id}`
                });
            }

            return res.redirect(
                `/submissions/${result._id}?error=${encodeURIComponent(friendlyMsg)}`
            );
        }
    } catch (error) {
        console.error('createSubmission FATAL error:', error);
        if (wantsJson(req)) {
            return res.status(500).json({
                success: false,
                message: 'Không thể lưu bài nộp. Vui lòng thử lại sau.'
            });
        }
        return res.redirect('/');
    }
};

// ============================================================
// DETAIL — xem chi tiết 1 bài nộp
// ------------------------------------------------------------
// ★ MongoDB chỉ có metadata (ID, score, status, ...)
// ★ Đọc TẤT CẢ data nặng từ GitHub:
//     - answerHtml
//     - feedback, breakdown, grammar, sampleComparison
//     - promptSnapshot
//     - lessonContentHtml, lessonSampleSolution
// ============================================================
const getSubmission = async (req, res) => {
    try {
        const user = req.session?.user;
        const { id } = req.params;

        // 1. Lấy metadata từ MongoDB
        const submission = await Submission.findById(id)
            .populate('lessonId', 'title description contentHtml sampleSolution subject slug duration')
            .populate('subjectId', 'name code slug')
            .populate('userId', 'name email')
            .lean();

        if (!submission) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy',
                message: 'Không tìm thấy bài nộp.',
                statusCode: 404,
                stack: null
            });
        }

        const userId = user.id || user._id;
        const isOwner = String(submission.userId?._id || submission.userId) === String(userId);
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).render('error', {
                title: 'Không có quyền',
                message: 'Bạn không có quyền xem bài nộp này.',
                statusCode: 403,
                stack: null
            });
        }

        // ============================================================
        // ★ ĐỌC TẤT CẢ DATA TỪ GITHUB
        // ============================================================
        if (
            submission.syncStatus === 'committed' &&
            submission.githubFile &&
            githubService.isConfigured
        ) {
            try {
                const githubData = await githubService.readJsonFile(submission.githubFile);

                if (githubData && typeof githubData === 'object') {
                    // ★ Bài làm
                    if (githubData.answerHtml) {
                        submission.answerHtml = githubData.answerHtml;
                    }

                    // ★ Feedback + breakdown + grammar + sampleComparison
                    if (!submission.feedback && githubData.feedback) {
                        submission.feedback = githubData.feedback;
                    }
                    if (
                        (!submission.breakdown || submission.breakdown.length === 0) &&
                        Array.isArray(githubData.breakdown)
                    ) {
                        submission.breakdown = githubData.breakdown;
                    }
                    if (!submission.grammar && githubData.grammar) {
                        submission.grammar = githubData.grammar;
                    }
                    if (!submission.sampleComparison && githubData.sampleComparison) {
                        submission.sampleComparison = githubData.sampleComparison;
                    }

                    // ★ Prompt snapshot
                    if (!submission.promptSnapshot && githubData.promptSnapshot) {
                        submission.promptSnapshot = githubData.promptSnapshot;
                    }

                    // ★ Đề bài + lời giải mẫu (nếu MongoDB rỗng)
                    if (submission.lessonId) {
                        if (!submission.lessonId.contentHtml && githubData.lessonContentHtml) {
                            submission.lessonId.contentHtml = githubData.lessonContentHtml;
                        }
                        if (!submission.lessonId.sampleSolution && githubData.lessonSampleSolution) {
                            submission.lessonId.sampleSolution = githubData.lessonSampleSolution;
                        }
                    }

                    // ★ Score (nếu MongoDB thiếu)
                    if (
                        (submission.score === null || submission.score === undefined) &&
                        githubData.score !== undefined
                    ) {
                        submission.score = githubData.score;
                    }

                    // ★ Error message (nếu GitHub có)
                    if (!submission.errorMessage && githubData.errorMessage) {
                        submission.errorMessage = githubData.errorMessage;
                    }

                    console.log(`📥 [getSubmission] Đã đọc từ GitHub: ${submission.githubFile}`);
                }
            } catch (e) {
                console.warn(`[getSubmission] Không đọc được GitHub: ${e.message}`);
                // Không lỗi → vẫn render với data MongoDB (có thể thiếu)
            }
        }

        // Flash
        const error = req.query.error || null;
        const success = req.query.success || null;

        return res.render('student/submission-detail', {
            title: 'Chi tiết bài nộp',
            submission,
            isAdmin,
            error,
            success
        });
    } catch (error) {
        console.error('getSubmission error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải bài nộp.',
            statusCode: 500,
            stack: null
        });
    }
};

// ============================================================
// HISTORY — danh sách bài nộp của user
// ------------------------------------------------------------
// Chỉ cần metadata nhẹ (score, status, lesson, time)
// Không cần đọc GitHub → list nhanh
// ============================================================
const getMySubmissions = async (req, res) => {
    try {
        const user = req.session?.user;
        const userId = user.id || user._id;

        const submissions = await Submission.find({ userId })
            .populate('lessonId', 'title subject slug')
            .populate('subjectId', 'name code')
            .sort({ createdAt: -1 })
            .lean();

        return res.render('student/history', {
            title: 'Lịch sử nộp bài',
            submissions
        });
    } catch (error) {
        console.error('getMySubmissions error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải lịch sử.',
            statusCode: 500,
            stack: null
        });
    }
};

// ============================================================
// ADMIN — list toàn bộ
// ============================================================
const getAdminSubmissions = async (req, res) => {
    try {
        const { search, status, subject } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (subject) filter.subjectId = subject;

        let submissions = await Submission.find(filter)
            .populate('userId', 'name email')
            .populate('lessonId', 'title')
            .populate('subjectId', 'name code')
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            submissions = submissions.filter((s) => {
                const name = (s.userId?.name || '').toLowerCase();
                const email = (s.userId?.email || '').toLowerCase();
                return name.includes(q) || email.includes(q);
            });
        }

        const subjects = await Subject.find({
            deletedAt: null,
            deletedForever: { $ne: true }
        })
            .select('name code')
            .sort({ name: 1 })
            .lean();

        return res.render('admin/submissions', {
            title: 'Quản lý bài nộp',
            submissions,
            subjects,
            filters: {
                search: search || '',
                status: status || '',
                subject: subject || ''
            }
        });
    } catch (error) {
        console.error('getAdminSubmissions error:', error);
        return res.status(500).render('admin/submissions', {
            title: 'Quản lý bài nộp',
            submissions: [],
            subjects: [],
            filters: { search: '', status: '', subject: '' },
            error: error.message
        });
    }
};

module.exports = {
    createSubmission,
    getSubmission,
    getMySubmissions,
    getAdminSubmissions
};