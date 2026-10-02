const Submission = require('../models/Submission');
const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');

const submissionService = require('../services/submissionService');
const notificationService = require('../services/notificationService');
const githubService = require('../services/githubService');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const { paginate } = require('./pagination.controller');
const { formatAiLabel } = require('../utils/aiLabel');
const AIKey = require('../models/AIKey');

// ★ Nhãn AI của 1 bài nộp: "Gemini: tên" / "vilao.ai: tên".
//   - Bài mới: dùng snapshot submission.aiProvider.
//   - Bài cũ (chưa có aiProvider, .lean() không áp default): tra provider thật
//     của key qua aiKeyId, tránh hiện nhầm "Gemini" cho key vilao.ai.
async function resolveAiLabel(submission) {
    let provider = submission.aiProvider || null;
    let keyName = submission.aiKeyName || null;

    if (!provider && submission.aiKeyId) {
        try {
            const k = await AIKey.findById(submission.aiKeyId).select('name provider').lean();
            if (k) {
                provider = k.provider;
                if (!keyName) keyName = k.name || null;
            }
        } catch (_) { /* bỏ qua, rơi về Gemini */ }
    }
    return formatAiLabel(provider || 'gemini', keyName);
}

const {
    getActor,
    getContentScope,
    isDefaultAdmin,
    isOrgAdmin
} = require('../services/userKeyService');

const MAX_COMMENT_LENGTH = 5000;

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


// Lấy dữ liệu nặng từ GitHub và gộp vào submission (chỉ điền chỗ Mongo còn thiếu).
// Dùng chung cho trang chi tiết (student) và trang review (admin).
async function hydrateFromGithub(submission, tag = 'hydrateFromGithub') {
    if (
        submission.syncStatus !== 'committed' ||
        !submission.githubFile ||
        !githubService.isConfigured
    ) {
        return submission;
    }

    try {
        const githubData = await githubService.readJsonFile(submission.githubFile);

        if (githubData && typeof githubData === 'object') {
            if (githubData.answerHtml) {
                submission.answerHtml = githubData.answerHtml;
            }
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
            if (!submission.promptSnapshot && githubData.promptSnapshot) {
                submission.promptSnapshot = githubData.promptSnapshot;
            }
            if (submission.lessonId) {
                if (!submission.lessonId.contentHtml && githubData.lessonContentHtml) {
                    submission.lessonId.contentHtml = githubData.lessonContentHtml;
                }
                if (!submission.lessonId.sampleSolution && githubData.lessonSampleSolution) {
                    submission.lessonId.sampleSolution = githubData.lessonSampleSolution;
                }
            }
            if (
                (submission.score === null || submission.score === undefined) &&
                githubData.score !== undefined
            ) {
                submission.score = githubData.score;
            }
            if (!submission.errorMessage && githubData.errorMessage) {
                submission.errorMessage = githubData.errorMessage;
            }

            // ★ Nhận xét giảng viên (nếu Mongo chưa có, ví dụ sau khi khôi phục DB)
            if (!submission.teacherComment && githubData.teacherComment) {
                submission.teacherComment = githubData.teacherComment;
            }
            if (
                (!submission.teacherCommentHistory || submission.teacherCommentHistory.length === 0) &&
                Array.isArray(githubData.teacherCommentHistory)
            ) {
                submission.teacherCommentHistory = githubData.teacherCommentHistory;
            }

            console.log(`📥 [${tag}] Đã đọc từ GitHub: ${submission.githubFile}`);
        }
    } catch (e) {
        console.warn(`[${tag}] Không đọc được GitHub: ${e.message}`);
        // Không throw → vẫn render với data MongoDB (có thể thiếu)
    }

    return submission;
}

// ★ USER KEY: admin default thấy hết; admin user_key chỉ thấy bài nộp của
//   bài học thuộc tổ chức mình. Không đủ quyền → caller trả 404 (không lộ tồn tại).
async function adminCanSeeSubmission(req, submission) {
    const actor = await getActor(req);
    if (isDefaultAdmin(actor)) return true;
    if (isOrgAdmin(actor)) {
        const lessonKey = submission?.lessonId?.userKey ?? null;
        return !!lessonKey && String(lessonKey) === String(actor.userKey);
    }
    return false;
}

function renderSubmissionNotFound(res) {
    return res.status(404).render('error', {
        title: 'Không tìm thấy',
        message: 'Không tìm thấy bài nộp.',
        statusCode: 404,
        stack: null
    });
}

function loadSubmissionFull(id) {
    return Submission.findById(id)
        .populate('lessonId', 'title description contentHtml sampleSolution subject slug duration userKey')
        .populate('subjectId', 'name code slug')
        .populate('userId', 'name email')
        .lean();
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
            isDeleted: false
        }).lean();

        // ★ USER KEY: chỉ nộp được bài học trong phạm vi tổ chức của mình
        const scope = await getContentScope(req);

        if (!lesson || !scope.canAccess(lesson)) {
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
                    // ★ vilao.ai: nhãn thật của key đã chấm (snapshot lúc chấm)
                    model: result.model || null,
                    aiProvider: result.aiProvider || 'gemini',
                    aiKeyName: result.aiKeyName || null,
                    aiLabel: formatAiLabel(result.aiProvider || 'gemini', result.aiKeyName),
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

            if (result.aiProvider === 'vilao') {
                // ★ vilao.ai: không dùng thông báo "Google" của Gemini
                if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('invalid api key')) {
                    friendlyMsg = 'API Key vilao.ai không hợp lệ hoặc chưa được cấp quyền. Liên hệ admin.';
                } else if (msg.includes('quota') || msg.includes('429') || msg.includes('rate limit')) {
                    friendlyMsg = 'vilao.ai đã hết quota hoặc bị giới hạn tốc độ. Vui lòng thử lại sau 1 phút.';
                } else if (msg.includes('503') || msg.includes('502') || msg.includes('504') || msg.includes('timeout') || msg.includes('overloaded')) {
                    friendlyMsg = 'vilao.ai đang quá tải. Vui lòng thử nộp lại sau 30 giây.';
                } else if (msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist') || msg.includes('không hỗ trợ'))) {
                    friendlyMsg = 'Model vilao.ai không tồn tại. Liên hệ admin đổi model.';
                } else if (msg.includes('không tải được nội dung prompt')) {
                    friendlyMsg = 'Hệ thống chưa đồng bộ xong prompt. Vui lòng thử nộp lại sau ít phút.';
                }
            } else if (msg.includes('high demand') || msg.includes('503') || msg.includes('try again')) {
                friendlyMsg = 'Model AI đang quá tải. Vui lòng thử nộp lại sau 30 giây.';
            } else if (msg.includes('denied access') || msg.includes('403')) {
                friendlyMsg = 'API Key chưa được Google cấp quyền. Liên hệ admin.';
            } else if (msg.includes('quota') || msg.includes('429')) {
                friendlyMsg = 'Đã hết quota trong phút này. Vui lòng thử lại sau 1 phút.';
            } else if (msg.includes('no longer available')) {
                friendlyMsg = 'Model AI đã bị Google khai tử. Liên hệ admin đổi model.';
            } else if (msg.includes('không tải được nội dung prompt')) {
                // ★ FIX: lỗi mới từ submissionService khi hydrate GitHub thất bại
                friendlyMsg = 'Hệ thống chưa đồng bộ xong prompt. Vui lòng thử nộp lại sau ít phút.';
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
        if (!user) {
            return res.redirect('/auth/login');
        }
        const { id } = req.params;

        // 1. Metadata từ MongoDB
        const submission = await loadSubmissionFull(id);

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

        // ★ USER KEY: admin xem bài của người khác → phải cùng tổ chức
        if (!isOwner && isAdmin && !(await adminCanSeeSubmission(req, submission))) {
            return renderSubmissionNotFound(res);
        }

        // 2. Data nặng từ GitHub
        await hydrateFromGithub(submission, 'getSubmission');

        // Sinh viên KHÔNG cần lịch sử các lần sửa nhận xét
        if (!isAdmin) {
            delete submission.teacherCommentHistory;
        }

        return res.render('student/submission-detail', {
            title: 'Chi tiết bài nộp',
            submission,
            aiLabel: await resolveAiLabel(submission), // ★ vilao.ai
            isAdmin,
            error: req.query.error || null,
            success: req.query.success || null
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

        const { items: submissions, pagination } = await paginate(
            Submission,
            { userId },
            req,
            {
                limit: 10,
                sort: { createdAt: -1 },
                select: '-teacherCommentHistory',
                populate: [
                    { path: 'lessonId', select: 'title subject slug' },
                    { path: 'subjectId', select: 'name code' }
                ]
            }
        );

        return res.render('student/history', {
            title: 'Lịch sử nộp bài',
            submissions,
            ...pagination
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

        // ★ USER KEY: admin user_key chỉ thấy bài nộp của bài học trong tổ chức mình
        const actor = await getActor(req);
        const subjectScope = { deletedAt: null, deletedForever: { $ne: true } };
        if (isOrgAdmin(actor)) {
            const lessonIds = await Lesson.find({ userKey: actor.userKey }).distinct('_id');
            filter.lessonId = { $in: lessonIds };
            subjectScope.userKey = actor.userKey;
        } else if (!isDefaultAdmin(actor)) {
            filter._id = null; // không phải admin → không thấy gì
        }

        // Tìm theo tên/email người nộp ngay ở DB để phân trang đúng
        // (trước đây lấy tối đa 500 bài rồi lọc trong bộ nhớ)
        if (search && search.trim()) {
            const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const userIds = await User.find({
                $or: [
                    { name: { $regex: safe, $options: 'i' } },
                    { email: { $regex: safe, $options: 'i' } }
                ]
            }).distinct('_id');
            filter.userId = { $in: userIds };
        }

        const { items: submissions, pagination } = await paginate(Submission, filter, req, {
            limit: 15,
            sort: { createdAt: -1 },
            populate: [
                { path: 'userId', select: 'name email' },
                { path: 'lessonId', select: 'title' },
                { path: 'subjectId', select: 'name code' }
            ]
        });

        const subjects = await Subject.find(subjectScope)
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
            },
            ...pagination
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

// ============================================================
// ADMIN — trang giảng viên nhận xét 1 bài nộp
// ============================================================
function isAdminUser(req) {
    return req.session?.user?.role === 'admin';
}

const getSubmissionReview = async (req, res) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).render('error', {
                title: 'Không có quyền',
                message: 'Chỉ giảng viên/admin mới xem được trang này.',
                statusCode: 403,
                stack: null
            });
        }

        const submission = await loadSubmissionFull(req.params.id);
        if (!submission) {
            return res.status(404).render('error', {
                title: 'Không tìm thấy',
                message: 'Không tìm thấy bài nộp.',
                statusCode: 404,
                stack: null
            });
        }

        // ★ USER KEY
        if (!(await adminCanSeeSubmission(req, submission))) {
            return renderSubmissionNotFound(res);
        }

        await hydrateFromGithub(submission, 'getSubmissionReview');

        return res.render('admin/submission_review', {
            title: 'Nhận xét bài làm',
            submission,
            aiLabel: await resolveAiLabel(submission), // ★ vilao.ai
            answerHtml: submission.answerHtml || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('getSubmissionReview error:', error);
        return res.status(500).render('error', {
            title: 'Lỗi',
            message: 'Không thể tải trang nhận xét.',
            statusCode: 500,
            stack: null
        });
    }
};

// Lưu nhận xét (tuỳ chọn). Giảng viên không viết thì thôi — AI chấm xong đã đăng kết quả rồi.
const saveTeacherComment = async (req, res) => {
    const { id } = req.params;
    const back = (type, msg) =>
        res.redirect(`/admin/submissions/${id}/review?${type}=${encodeURIComponent(msg)}`);

    try {
        if (!isAdminUser(req)) {
            return res.status(403).render('error', {
                title: 'Không có quyền',
                message: 'Chỉ giảng viên/admin mới nhận xét được.',
                statusCode: 403,
                stack: null
            });
        }

        const sessionUser = req.session.user;
        const adminId = sessionUser.id || sessionUser._id;

        const content = String(req.body.content ?? '').trim();
        if (!content) {
            return back('error', 'Vui lòng nhập nội dung nhận xét.');
        }
        if (content.length > MAX_COMMENT_LENGTH) {
            return back('error', `Nhận xét tối đa ${MAX_COMMENT_LENGTH} ký tự.`);
        }

        const current = await Submission.findById(id)
            .select('teacherComment status githubFile userId lessonId')
            .populate('lessonId', 'title userKey')
            .lean();
        if (!current || !(await adminCanSeeSubmission(req, current))) {
            return back('error', 'Không tìm thấy bài nộp.');
        }

        // Tên người chấm: ưu tiên session, thiếu thì tra DB
        let adminName = sessionUser.name;
        if (!adminName) {
            const u = await User.findById(adminId).select('name').lean();
            adminName = u?.name || 'Giảng viên';
        }

        const newComment = {
            content,
            commentedBy: adminId,
            commentedByName: adminName,
            commentedAt: new Date()
        };

        // Compare-and-set: chỉ ghi nếu nhận xét hiện tại đúng là bản form đang hiển thị
        const expected = String(req.body.expectedCommentedAt || '').trim();
        const filter = { _id: id };
        if (expected) {
            filter['teacherComment.commentedAt'] = new Date(expected);
        } else {
            filter.teacherComment = null;
        }

        const update = {
            $set: {
                teacherComment: newComment,
                teacherCommentSyncStatus: current.githubFile ? 'pending' : 'none',
                teacherCommentSyncError: null
            }
        };
        if (current.teacherComment) {
            update.$push = { teacherCommentHistory: current.teacherComment };
        }

        const updated = await Submission.findOneAndUpdate(filter, update, { new: true }).lean();
        if (!updated) {
            return back('error', 'Nhận xét vừa được người khác cập nhật. Hãy xem bản mới rồi lưu lại.');
        }

        // ---- Đồng bộ GitHub (lỗi không làm mất nhận xét đã lưu ở Mongo) ----
        if (updated.githubFile && githubService.isConfigured) {
            try {
                await githubService.updateJsonFile(
                    updated.githubFile,
                    (data) => ({
                        ...data,
                        teacherComment: {
                            content: updated.teacherComment.content,
                            commentedBy: String(updated.teacherComment.commentedBy),
                            commentedByName: updated.teacherComment.commentedByName,
                            commentedAt: updated.teacherComment.commentedAt
                        },
                        teacherCommentHistory: (updated.teacherCommentHistory || []).map((h) => ({
                            content: h.content,
                            commentedBy: String(h.commentedBy),
                            commentedByName: h.commentedByName,
                            commentedAt: h.commentedAt
                        }))
                    }),
                    `Teacher comment: ${updated.githubFile}`
                );
                await Submission.updateOne(
                    { _id: id },
                    { $set: { teacherCommentSyncStatus: 'committed', teacherCommentSyncError: null } }
                );
            } catch (e) {
                console.warn(`[saveTeacherComment] Sync GitHub lỗi: ${e.message}`);
                await Submission.updateOne(
                    { _id: id },
                    { $set: { teacherCommentSyncStatus: 'failed', teacherCommentSyncError: e.message } }
                );
            }
        }

        // ---- Audit log ----
        try {
            await AuditLog.create({
                actor: adminId,
                action: current.teacherComment ? 'edit_teacher_comment' : 'add_teacher_comment',
                targetType: 'Submission',
                targetId: id,
                detail: { length: content.length }
            });
        } catch (e) {
            console.warn(`[saveTeacherComment] AuditLog lỗi: ${e.message}`);
        }

        // ---- Thông báo cho sinh viên ----
        try {
            await notificationService.createNotification({
                userId: current.userId,
                type: 'teacher_comment',
                title: 'Giảng viên đã nhận xét bài làm của bạn',
                message: `${adminName} đã xem xét bài "${current.lessonId?.title || 'Bài học'}".`,
                link: `/submissions/${id}`
            });
        } catch (e) {
            console.warn(`[saveTeacherComment] Notification lỗi: ${e.message}`);
        }

        return back('success', 'Đã lưu nhận xét.');
    } catch (error) {
        console.error('saveTeacherComment error:', error);
        return back('error', 'Không thể lưu nhận xét. Vui lòng thử lại.');
    }
};

module.exports = {
    createSubmission,
    getSubmission,
    getMySubmissions,
    getAdminSubmissions,
    getSubmissionReview,
    saveTeacherComment
};