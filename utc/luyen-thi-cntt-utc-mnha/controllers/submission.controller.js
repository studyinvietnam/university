// ============================================================
// SUBMISSION CONTROLLER
// Method: submit | detail | history | dispute | override | getAdminSubmissions
// ============================================================

const {
    checkWritingByGemini,
    createWritingPrompt,
    getSafeModel,
    DEFAULT_MODEL,
    countWords,
} = require("../services/aiService");

const { writeJsonFile, readJsonFile } = require("../services/githubService");

let syncQueue = null;
try { syncQueue = require("../services/syncQueueService"); } catch (_) {}

const Submission = (() => {
    try { return require("../models/Submission"); } catch (_) { return null; }
})();
const Notification = (() => {
    try { return require("../models/Notification"); } catch (_) { return null; }
})();
const Lesson = (() => {
    try { return require("../models/Lesson"); } catch (_) { return null; }
})();
const Subject = (() => {
    try { return require("../models/Subject"); } catch (_) { return null; }
})();
const GradingPrompt = (() => {
    try { return require("../models/GradingPrompt"); } catch (_) { return null; }
})();
const Dispute = (() => {
    try { return require("../models/Dispute"); } catch (_) { return null; }
})();
const AuditLog = (() => {
    try { return require("../models/AuditLog"); } catch (_) { return null; }
})();

// ============================================================
// HELPERS
// ============================================================

function safeStr(v) { return typeof v === "string" ? v : ""; }

function slugify(input, fallback = "unknown") {
    const v = safeStr(input).trim().toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    return v || fallback;
}

function makeTimestamp(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
    );
}

function buildPaths({ subjectSlug, lessonSlug, userId, timestamp }) {
    const base = `submissions/${subjectSlug}/${lessonSlug}`;
    return {
        detail: `${base}/${userId}-${timestamp}.json`,
        latest: `${base}/${userId}-latest.json`,
    };
}

function buildPayload({
    userId, userName,
    subjectId, subjectSlug,
    lessonId, lessonSlug, lessonTitle,
    topic, essay,
    aiResult, model, latencyMs,
    promptId, promptVersion, promptSnapshot,
    sampleSolution, sampleComparison,
    submittedAt, status,
}) {
    const errors = Array.isArray(aiResult?.grammar?.errors) ? aiResult.grammar.errors : [];

    return {
        schemaVersion: 1,
        userId: String(userId),
        userName: userName || null,
        subjectId: subjectId ? String(subjectId) : null,
        subjectSlug,
        lessonId: lessonId ? String(lessonId) : null,
        lessonSlug,
        lessonTitle: lessonTitle || null,

        topic: topic || "",
        essay: essay || "",
        wordCount: aiResult?.wordCount ?? countWords(essay),

        score: aiResult?.score ?? null,
        maxScore: 10,
        model: model || DEFAULT_MODEL,
        latencyMs: latencyMs ?? null,

        submittedAt: submittedAt || new Date().toISOString(),
        gradedAt: new Date().toISOString(),
        status: status || "graded",

        feedback: {
            grammar: {
                score: aiResult?.grammar?.score ?? null,
                comment: aiResult?.grammar?.comment || "",
                errors: errors.map((e) => ({
                    original: e.original || "",
                    corrected: e.corrected || "",
                    explanation: e.explanation || "",
                })),
                errorCount: errors.length,
            },
            vocabulary: {
                score: aiResult?.vocabulary?.score ?? null,
                comment: aiResult?.vocabulary?.comment || "",
                suggestions: Array.isArray(aiResult?.vocabulary?.suggestions)
                    ? aiResult.vocabulary.suggestions
                    : [],
            },
            coherence: {
                score: aiResult?.coherence?.score ?? null,
                comment: aiResult?.coherence?.comment || "",
            },
            content: {
                score: aiResult?.content?.score ?? null,
                comment: aiResult?.content?.comment || "",
            },
            outline: {
                introduction: {
                    score: aiResult?.outline?.introduction?.score ?? null,
                    comment: aiResult?.outline?.introduction?.comment || "",
                },
                body: {
                    score: aiResult?.outline?.body?.score ?? null,
                    comment: aiResult?.outline?.body?.comment || "",
                },
                conclusion: {
                    score: aiResult?.outline?.conclusion?.score ?? null,
                    comment: aiResult?.outline?.conclusion?.comment || "",
                },
            },
            strengths: Array.isArray(aiResult?.strengths) ? aiResult.strengths : [],
            weaknesses: Array.isArray(aiResult?.weaknesses) ? aiResult.weaknesses : [],
            improvements: Array.isArray(aiResult?.improvements) ? aiResult.improvements : [],
            overall: aiResult?.overall_comment || "",
        },

        sampleSolution: sampleSolution || null,
        sampleComparison: sampleComparison || null,

        promptId: promptId ? String(promptId) : null,
        promptVersion: promptVersion ?? null,
        promptSnapshot: promptSnapshot || createWritingPrompt(topic, essay),
    };
}

async function resolveLessonContext(lessonId, body) {
    const ctx = {
        subjectSlug: slugify(body?.subjectSlug, ""),
        lessonSlug: slugify(body?.lessonSlug, ""),
        lessonTitle: body?.lessonTitle || null,
        subjectId: body?.subjectId || null,
        promptId: body?.promptId || null,
        promptVersion: null,
        promptSnapshot: null,
    };

    if (Lesson && (!ctx.subjectSlug || !ctx.lessonSlug || !ctx.lessonTitle)) {
        try {
            const lesson = await Lesson.findById(lessonId).lean();
            if (lesson) {
                ctx.lessonSlug = ctx.lessonSlug || slugify(lesson.slug || lesson.title, `lesson-${lessonId}`);
                ctx.lessonTitle = ctx.lessonTitle || lesson.title || null;
                ctx.subjectId = ctx.subjectId || lesson.subjectId || null;
                ctx.promptId = ctx.promptId || lesson.promptId || null;

                if (Subject && !ctx.subjectSlug && lesson.subjectId) {
                    const subject = await Subject.findById(lesson.subjectId).lean();
                    if (subject) {
                        ctx.subjectSlug = slugify(subject.slug || subject.name, `subject-${lesson.subjectId}`);
                    }
                }
            }
        } catch (e) {
            console.warn("⚠️ resolveLessonContext:", e.message);
        }
    }

    ctx.subjectSlug = ctx.subjectSlug || `subject-${ctx.subjectId || "unknown"}`;
    ctx.lessonSlug = ctx.lessonSlug || `lesson-${lessonId}`;

    if (ctx.promptId && GradingPrompt) {
        try {
            const gp = await GradingPrompt.findById(ctx.promptId).lean();
            if (gp) {
                ctx.promptVersion = gp.version ?? null;
                ctx.promptSnapshot = gp.content || null;
            }
        } catch (_) {}
    }

    return ctx;
}

// ============================================================
// 1. SUBMIT — POST /practice/submit  (form)  hoặc  POST /api/submissions (JSON)
// ============================================================

async function submit(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json") ||
        req.is("application/json");

    try {
        const user = req.session?.user || req.user;
        if (!user) {
            return isJson
                ? res.status(401).json({ success: false, message: "Chưa đăng nhập." })
                : res.redirect("/auth/login");
        }

        const userId = user._id;
        const userName = user.name || null;

        const body = req.body || {};
        const lessonId = body.lessonId;
        const topic = safeStr(body.topic).trim();
        const essay = safeStr(body.essay || body.answer).trim();
        const model = getSafeModel(body.model);
        const timeout = Math.min(120000, Math.max(5000, Number(body.timeoutMs) || 45000));
        const sampleSolution = safeStr(body.sampleSolution).trim() || null;

        if (!lessonId) {
            return isJson
                ? res.status(400).json({ success: false, message: "Thiếu lessonId." })
                : res.status(400).render("error", { title: "Lỗi", message: "Thiếu lessonId.", statusCode: 400, stack: null });
        }
        if (!essay) {
            return isJson
                ? res.status(400).json({ success: false, message: "Bài viết đang trống." })
                : res.status(400).render("error", { title: "Lỗi", message: "Bài viết đang trống.", statusCode: 400, stack: null });
        }

        const ctx = await resolveLessonContext(lessonId, body);

        console.log(`🤖 [submission.submit] user=${userId} lesson=${lessonId} model=${model}`);
        const t0 = Date.now();
        const aiResult = await checkWritingByGemini(topic, essay, timeout, model);
        const latencyMs = Date.now() - t0;

        const submittedAt = new Date().toISOString();
        const timestamp = makeTimestamp();
        const paths = buildPaths({
            subjectSlug: ctx.subjectSlug,
            lessonSlug: ctx.lessonSlug,
            userId, timestamp,
        });

        const payload = buildPayload({
            userId, userName,
            subjectId: ctx.subjectId,
            subjectSlug: ctx.subjectSlug,
            lessonId,
            lessonSlug: ctx.lessonSlug,
            lessonTitle: ctx.lessonTitle,
            topic, essay,
            aiResult, model, latencyMs,
            promptId: ctx.promptId,
            promptVersion: ctx.promptVersion,
            promptSnapshot: ctx.promptSnapshot,
            sampleSolution,
            sampleComparison: aiResult?.sampleComparison || null,
            submittedAt,
            status: "graded",
        });

        // Lưu GitHub
        let githubInfo = null;
        let githubError = null;

        try {
            const commitMsg = `submission: ${userName || userId} - ${ctx.lessonSlug} - ${payload.score}/10`;
            const [detailRes, latestRes] = await Promise.all([
                writeJsonFile(paths.detail, payload, commitMsg),
                writeJsonFile(paths.latest, payload, `${commitMsg} (latest)`),
            ]);
            githubInfo = {
                detailPath: detailRes.path,
                detailUrl: detailRes.url,
                latestPath: latestRes.path,
                latestUrl: latestRes.url,
                commitSha: detailRes.commitSha,
            };
        } catch (e) {
            console.error("⚠️ Lưu GitHub lỗi:", e.message);
            githubError = e.message;

            if (syncQueue && typeof syncQueue.enqueue === "function") {
                syncQueue.enqueue({
                    path: paths.detail,
                    data: payload,
                    commitMessage: `submission(retry): ${userId} - ${ctx.lessonSlug}`,
                });
            }
        }

        // Lưu MongoDB
        let submissionId = null;
        if (Submission) {
            try {
                const grammarErrors = payload.feedback.grammar.errors;
                const summary = payload.feedback.overall ||
                    `${grammarErrors.length} lỗi — ${payload.feedback.strengths[0] || "—"}`;

                const doc = await Submission.create({
                    userId,
                    lessonId,
                    subjectId: ctx.subjectId || undefined,
                    githubFile: githubInfo?.detailPath || paths.detail,
                    githubUrl: githubInfo?.detailUrl || null,
                    githubError,
                    score: payload.score,
                    maxScore: payload.maxScore,
                    wordCount: payload.wordCount,
                    model, latencyMs,
                    errorCount: grammarErrors.length,
                    summary,
                    promptId: ctx.promptId || undefined,
                    promptVersion: ctx.promptVersion,
                    promptSnapshot: ctx.promptSnapshot || payload.promptSnapshot,
                    grammarErrors,
                    submittedAt: new Date(submittedAt),
                    gradedAt: new Date(),
                    status: githubError ? "pending" : "committed",
                });
                submissionId = doc._id;
            } catch (e) {
                console.error("⚠️ Lưu MongoDB Submission lỗi:", e.message);
            }
        }

        // Thông báo
        if (Notification) {
            try {
                await Notification.create({
                    userId,
                    type: "graded",
                    title: "Bài đã được chấm",
                    message: `Bài "${ctx.lessonTitle || ctx.lessonSlug}" đạt ${payload.score}/10 (${payload.feedback.grammar.errorCount} lỗi).`,
                    link: `/practice/submission/${submissionId || ""}`,
                    isRead: false,
                });
            } catch (_) {}
        }

        if (isJson) {
            return res.json({
                success: true,
                submissionId,
                github: githubInfo,
                githubError,
                result: payload,
            });
        }
        return res.redirect(`/practice/submission/${submissionId}`);
    } catch (error) {
        console.error("❌ submit:", error);
        if (isJson) {
            return res.status(500).json({ success: false, message: error.message });
        }
        return res.status(500).render("error", {
            title: "Lỗi chấm bài",
            message: error.message,
            statusCode: 500,
            stack: null,
        });
    }
}

// ============================================================
// 2. DETAIL — GET /practice/submission/:id  hoặc  GET /api/submissions/:id
// ============================================================

async function detail(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json");

    try {
        if (!Submission) {
            return isJson
                ? res.status(501).json({ success: false, message: "Chưa có model Submission." })
                : res.status(501).render("error", { title: "Lỗi", message: "Chưa có model Submission.", statusCode: 501, stack: null });
        }

        const sub = await Submission.findById(req.params.id).lean();
        if (!sub) {
            return isJson
                ? res.status(404).json({ success: false, message: "Không tìm thấy bài nộp." })
                : res.status(404).render("error", { title: "Không tìm thấy", message: "Không tìm thấy bài nộp.", statusCode: 404, stack: null });
        }

        const user = req.session?.user || req.user;
        const isOwner = String(sub.userId) === String(user?._id);
        const isAdmin = user?.role === "admin";
        if (!isOwner && !isAdmin) {
            return isJson
                ? res.status(403).json({ success: false, message: "Không có quyền xem bài này." })
                : res.status(403).render("error", { title: "Không có quyền", message: "Không có quyền xem bài này.", statusCode: 403, stack: null });
        }

        let detailData = null, readError = null;
        if (sub.githubFile) {
            try {
                detailData = await readJsonFile(sub.githubFile);
            } catch (e) {
                readError = e.message;
                console.warn("⚠️ Không đọc được GitHub:", e.message);
            }
        }

        if (isJson) {
            return res.json({ success: true, submission: sub, detail: detailData, readError });
        }

        // Fallback từ MongoDB nếu không đọc được GitHub
        const viewData = detailData || {
            ...sub,
            essay: sub.essay || "(Không đọc được file gốc)",
            feedback: {
                grammar: { score: sub.score, comment: sub.summary || "", errors: sub.grammarErrors || [], errorCount: sub.errorCount || 0 },
                vocabulary: { score: null, comment: "", suggestions: [] },
                coherence: { score: null, comment: "" },
                content: { score: null, comment: "" },
                outline: {
                    introduction: { score: null, comment: "" },
                    body: { score: null, comment: "" },
                    conclusion: { score: null, comment: "" },
                },
                strengths: [], weaknesses: [], improvements: [],
                overall: sub.summary || "",
            },
        };

        return res.render("student/submission_detail", {
            title: "Chi tiết bài nộp",
            detail: viewData,
            submission: sub,
            readError,
        });
    } catch (error) {
        console.error("❌ detail:", error);
        if (isJson) return res.status(500).json({ success: false, message: error.message });
        return res.status(500).render("error", {
            title: "Lỗi", message: error.message, statusCode: 500, stack: null,
        });
    }
}

// ============================================================
// 3. HISTORY — GET /practice/history  hoặc  GET /api/submissions/my
// ============================================================

async function history(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json");

    try {
        const user = req.session?.user || req.user;
        if (!user) {
            return isJson
                ? res.status(401).json({ success: false, message: "Chưa đăng nhập." })
                : res.redirect("/auth/login");
        }

        if (!Submission) {
            return isJson
                ? res.status(501).json({ success: false, message: "Chưa có model Submission." })
                : res.render("student/history", { title: "Lịch sử nộp bài", submissions: [] });
        }

        const userId = user._id;
        const lessonId = req.query.lessonId;
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

        const query = { userId };
        if (lessonId) query.lessonId = lessonId;

        const docs = await Submission.find(query)
            .sort({ submittedAt: -1 })
            .limit(limit)
            .lean();

        const items = docs.map((d) => ({
            _id: d._id,
            lessonId: d.lessonId,
            subjectId: d.subjectId,
            score: d.score,
            maxScore: d.maxScore,
            wordCount: d.wordCount,
            errorCount: d.errorCount,
            summary: d.summary,
            model: d.model,
            status: d.status,
            submittedAt: d.submittedAt,
            gradedAt: d.gradedAt,
            githubUrl: d.githubUrl,
        }));

        if (isJson) {
            return res.json({ success: true, total: items.length, submissions: items });
        }

        return res.render("student/history", {
            title: "Lịch sử nộp bài",
            submissions: items,
        });
    } catch (error) {
        console.error("❌ history:", error);
        if (isJson) return res.status(500).json({ success: false, message: error.message });
        return res.status(500).render("error", {
            title: "Lỗi", message: error.message, statusCode: 500, stack: null,
        });
    }
}

// ============================================================
// 4. DISPUTE — POST /api/submissions/:id/dispute  hoặc form
// ============================================================

async function dispute(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json");

    try {
        const user = req.session?.user || req.user;
        if (!user) {
            return isJson
                ? res.status(401).json({ success: false, message: "Chưa đăng nhập." })
                : res.redirect("/auth/login");
        }

        const reason = safeStr(req.body?.reason).trim();
        if (!reason) {
            return isJson
                ? res.status(400).json({ success: false, message: "Phải nhập lý do khiếu nại." })
                : res.status(400).render("error", { title: "Lỗi", message: "Phải nhập lý do khiếu nại.", statusCode: 400, stack: null });
        }

        let result = { _id: null };

        if (Dispute) {
            try {
                result = await Dispute.create({
                    submissionId: req.params.id,
                    userId: user._id,
                    reason,
                    status: "pending",
                });
            } catch (e) {
                console.error("⚠️ Tạo Dispute lỗi:", e.message);
            }
        }

        if (Notification) {
            try {
                // Thông báo cho admin — tuỳ cấu trúc Notification model
                await Notification.create({
                    userId: null,
                    type: "system",
                    title: "Khiếu nại mới",
                    message: `${user.name || user.email} khiếu nại bài ${req.params.id}`,
                    link: `/admin/disputes`,
                    isRead: false,
                });
            } catch (_) {}
        }

        if (isJson) return res.json({ success: true, dispute: result });
        return res.redirect(`/practice/submission/${req.params.id}`);
    } catch (error) {
        console.error("❌ dispute:", error);
        if (isJson) return res.status(500).json({ success: false, message: error.message });
        return res.status(500).render("error", {
            title: "Lỗi", message: error.message, statusCode: 500, stack: null,
        });
    }
}

// ============================================================
// 5. OVERRIDE — POST /admin/submission/:id/override  hoặc  PATCH /api/submissions/:id/override
// ============================================================

async function override(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json");

    try {
        const user = req.session?.user || req.user;
        if (!user || user.role !== "admin") {
            return isJson
                ? res.status(403).json({ success: false, message: "Chỉ admin." })
                : res.status(403).render("error", { title: "Không có quyền", message: "Chỉ admin.", statusCode: 403, stack: null });
        }

        const score = Number(req.body?.score);
        const reason = safeStr(req.body?.reason).trim();

        if (!Number.isFinite(score) || score < 0 || score > 10) {
            return isJson
                ? res.status(400).json({ success: false, message: "Điểm phải từ 0 đến 10." })
                : res.status(400).render("error", { title: "Lỗi", message: "Điểm phải từ 0 đến 10.", statusCode: 400, stack: null });
        }
        if (!reason) {
            return isJson
                ? res.status(400).json({ success: false, message: "Phải có lý do override." })
                : res.status(400).render("error", { title: "Lỗi", message: "Phải có lý do override.", statusCode: 400, stack: null });
        }

        if (!Submission) {
            return isJson
                ? res.status(501).json({ success: false, message: "Chưa có model Submission." })
                : res.status(501).render("error", { title: "Lỗi", message: "Chưa có model Submission.", statusCode: 501, stack: null });
        }

        const doc = await Submission.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    score,
                    "override.score": score,
                    "override.reason": reason,
                    "override.by": user._id,
                    "override.at": new Date(),
                },
            },
            { new: true }
        );

        if (!doc) {
            return isJson
                ? res.status(404).json({ success: false, message: "Không tìm thấy." })
                : res.status(404).render("error", { title: "Không tìm thấy", message: "Không tìm thấy bài nộp.", statusCode: 404, stack: null });
        }

        // Audit log
        if (AuditLog) {
            try {
                await AuditLog.create({
                    adminId: user._id,
                    action: "override_score",
                    targetType: "Submission",
                    targetId: doc._id,
                    detail: { score, reason },
                });
            } catch (_) {}
        }

        if (isJson) return res.json({ success: true, submission: doc });
        return res.redirect("/admin/submissions");
    } catch (error) {
        console.error("❌ override:", error);
        if (isJson) return res.status(500).json({ success: false, message: error.message });
        return res.status(500).render("error", {
            title: "Lỗi", message: error.message, statusCode: 500, stack: null,
        });
    }
}

// ============================================================
// 6. GET ADMIN SUBMISSIONS — GET /admin/submissions  (FIX cho dòng 117 admin.js)
// ============================================================

async function getAdminSubmissions(req, res) {
    const isJson =
        req.xhr ||
        req.path.startsWith("/api") ||
        req.headers.accept?.includes("json");

    try {
        const user = req.session?.user || req.user;
        if (!user || user.role !== "admin") {
            return isJson
                ? res.status(403).json({ success: false, message: "Chỉ admin." })
                : res.status(403).render("error", { title: "Không có quyền", message: "Chỉ admin.", statusCode: 403, stack: null });
        }

        if (!Submission) {
            return isJson
                ? res.status(501).json({ success: false, message: "Chưa có model Submission." })
                : res.render("admin/submissions", { title: "Quản lý bài nộp", submissions: [] });
        }

        const { lessonId, subjectId, userId, status } = req.query;
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

        const query = {};
        if (lessonId) query.lessonId = lessonId;
        if (subjectId) query.subjectId = subjectId;
        if (userId) query.userId = userId;
        if (status) query.status = status;

        const submissions = await Submission.find(query)
            .populate("userId", "name email")
            .populate("lessonId", "title slug")
            .populate("subjectId", "name slug")
            .sort({ submittedAt: -1 })
            .limit(limit)
            .lean();

        if (isJson) {
            return res.json({ success: true, total: submissions.length, submissions });
        }

        return res.render("admin/submissions", {
            title: "Quản lý bài nộp",
            submissions,
        });
    } catch (error) {
        console.error("❌ getAdminSubmissions:", error);
        if (isJson) return res.status(500).json({ success: false, message: error.message });
        return res.status(500).render("admin/submissions", {
            title: "Quản lý bài nộp",
            submissions: [],
            error: error.message,
        });
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    submit,
    detail,
    history,
    dispute,
    override,
    getAdminSubmissions,
    // helpers (dùng nội bộ / nơi khác)
    _helpers: { buildPayload, buildPaths, makeTimestamp, resolveLessonContext },
};