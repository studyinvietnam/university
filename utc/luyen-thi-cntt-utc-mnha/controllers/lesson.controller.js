// controllers/lesson.controller.js
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Subject = require("../models/Subject");
const Lesson = require("../models/Lesson");
const Submission = require("../models/Submission");
const GradingPrompt = require("../models/GradingPrompt");
const githubService = require("../services/githubService");
const syncQueueService = require("../services/syncQueueService");

/* ============================================================
 * HELPERS
 * ============================================================ */

function slugify(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function isObjectId(str) {
    return mongoose.Types.ObjectId.isValid(str) && String(str).length === 24;
}

/**
 * Tìm lesson theo slug HOẶC _id
 */
async function findLessonByParam(param) {
    if (isObjectId(param)) {
        return Lesson.findOne({ _id: param, deletedAt: null, deletedForever: false }).lean();
    }
    return Lesson.findOne({ slug: param, deletedAt: null, deletedForever: false }).lean();
}

/**
 * Đọc file JSON đề bài từ GitHub
 */
async function readLessonFromGithub(filePath) {
    const fn =
        (typeof githubService.readJsonFile === "function" && githubService.readJsonFile) ||
        (typeof githubService.getJSON === "function" && githubService.getJSON) ||
        null;

    if (!fn) {
        throw new Error("githubService không có method readJsonFile/getJSON");
    }
    return fn(filePath);
}

/**
 * Đẩy job lên queue — hỗ trợ cả 2 signature
 */
function safeEnqueue(...args) {
    if (!syncQueueService || typeof syncQueueService.enqueue !== "function") return;

    if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "object") {
        const [type, job] = args;
        return syncQueueService.enqueue({ type, ...job });
    }
    return syncQueueService.enqueue(args[0]);
}

/**
 * Gắn subject vào list lesson mà KHÔNG dùng populate
 */
async function attachSubjects(lessons) {
    const subjectIds = [
        ...new Set(
            lessons
                .map((l) => l.subjectId || l.subject)
                .filter(Boolean)
                .map(String)
        ),
    ];

    const subjects = subjectIds.length
        ? await Subject.find({ _id: { $in: subjectIds } }).lean()
        : [];

    const subjectMap = Object.fromEntries(subjects.map((s) => [String(s._id), s]));

    return lessons.map((l) => {
        const sid = String(l.subjectId || l.subject || "");
        return {
            ...l,
            subjectId: l.subjectId || l.subject || null,
            subject: subjectMap[sid] || null,
        };
    });
}

/* ============================================================
 * 1. LIST SUBJECTS
 * ============================================================ */
exports.listSubjects = async (req, res, next) => {
    try {
        const isAdmin = req.user?.role === "admin";
        const subjects = await Subject.find({
            deletedAt: null,
            deletedForever: false,
        }).sort({ createdAt: -1 }).lean();

        const subjectIds = subjects.map((s) => s._id);
        const lessonCounts = await Lesson.aggregate([
            { $match: { subjectId: { $in: subjectIds }, deletedAt: null, deletedForever: false } },
            { $group: { _id: "$subjectId", count: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(lessonCounts.map((l) => [String(l._id), l.count]));

        const data = subjects.map((s) => ({
            ...s,
            lessonCount: countMap[String(s._id)] || 0,
        }));

        res.render("student/subjects", {
            title: "Môn học",
            user: req.user,
            subjects: data,
            isAdminView: isAdmin,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 2. LIST LESSONS (theo subject)
 * ============================================================ */
exports.listLessons = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const subject = await Subject.findOne({
            slug,
            deletedAt: null,
            deletedForever: false,
        }).lean();

        if (!subject) {
            return res.status(404).render("error", {
                title: "Không tìm thấy",
                message: "Môn học không tồn tại",
                user: req.user,
                statusCode: 404,
                stack: null,
            });
        }

        const lessons = await Lesson.find({
            subjectId: subject._id,
            deletedAt: null,
            deletedForever: false,
        }).sort({ createdAt: 1 }).lean();

        const submittedMap = {};
        if (req.user) {
            const subs = await Submission.find({
                userId: req.user._id,
                lessonId: { $in: lessons.map((l) => l._id) },
            }).sort({ submittedAt: -1 }).lean();

            subs.forEach((s) => {
                const key = String(s.lessonId);
                if (!submittedMap[key]) {
                    submittedMap[key] = {
                        score: s.score,
                        maxScore: s.maxScore || 10,
                        submittedAt: s.submittedAt,
                        submissionId: s._id,
                    };
                }
            });
        }

        res.render("student/lessons", {
            title: subject.name,
            user: req.user,
            subject,
            lessons,
            submittedMap,
            isAdminView: req.user?.role === "admin",
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 2b. LIST ALL LESSONS — dùng chung cho admin + student
 * GET /lessons
 * GET /lessons?subject=<slug|id>
 * ============================================================ */
exports.listAllLessons = async (req, res, next) => {
    try {
        const user = req.user;
        const isAdmin = user?.role === "admin";

        const subjectQuery = req.query.subject || req.query.subjectId || null;
        const filter = {
            deletedAt: null,
            deletedForever: false,
        };

        let currentSubject = null;
        if (subjectQuery) {
            currentSubject = isObjectId(subjectQuery)
                ? await Subject.findById(subjectQuery).lean()
                : await Subject.findOne({ slug: subjectQuery }).lean();

            if (currentSubject) {
                filter.subjectId = currentSubject._id;
            }
        }

        const lessons = await Lesson.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        // Gắn subject vào từng lesson (không populate)
        const lessonsWithSubject = await attachSubjects(lessons);

        // Map bài đã nộp (chỉ student cần)
        const submittedMap = {};
        if (!isAdmin && user) {
            const subs = await Submission.find({
                userId: user._id,
                lessonId: { $in: lessons.map((l) => l._id) },
            }).sort({ submittedAt: -1 }).lean();

            subs.forEach((s) => {
                const key = String(s.lessonId);
                if (!submittedMap[key]) {
                    submittedMap[key] = {
                        score: s.score,
                        maxScore: s.maxScore || 10,
                        submittedAt: s.submittedAt,
                        submissionId: s._id,
                    };
                }
            });
        }

        // Chọn view theo role — fallback nếu view admin chưa tồn tại
        const preferredView = isAdmin ? "admin/lessons" : "student/lessons";
        const viewFile = path.join(__dirname, "..", "views", preferredView + ".pug");
        const finalView = fs.existsSync(viewFile) ? preferredView : "student/lessons";

        res.render(finalView, {
            title: currentSubject ? currentSubject.name : "Tất cả bài học",
            user,
            subject: currentSubject,
            lessons: lessonsWithSubject,
            submittedMap,
            isAdminView: isAdmin,
        });
    } catch (err) {
        console.error("❌ listAllLessons:", err);
        next(err);
    }
};

/* ============================================================
 * 3. SHOW LESSON — dùng chung cho student + admin
 * ============================================================ */
exports.showLesson = async (req, res, next) => {
    try {
        const key = req.params.id || req.params.slug;
        const lesson = await findLessonByParam(key);

        if (!lesson) {
            return res.status(404).render("error", {
                title: "Không tìm thấy",
                message: "Bài học không tồn tại",
                user: req.user,
                statusCode: 404,
                stack: null,
            });
        }

        await renderLessonPage(req, res, lesson);
    } catch (err) {
        next(err);
    }
};

exports.getStudentLesson = exports.showLesson;

/**
 * Helper render trang làm bài — DÙNG CHUNG cho admin + student
 */
async function renderLessonPage(req, res, lesson) {
    const user = req.user;
    if (!user) {
        return res.redirect("/auth/login");
    }

    const subject = lesson.subjectId
        ? await Subject.findById(lesson.subjectId).lean()
        : null;

    const subjectSlug = subject?.slug || `subject-${lesson.subjectId}`;
    const lessonSlug = lesson.slug || `lesson-${lesson._id}`;
    const filePath =
        lesson.githubFile ||
        `subjects/${subjectSlug}/lessons/${lessonSlug}.json`;

    let lessonContent = {
        title: lesson.title,
        contentHtml: "",
        attachments: [],
        sampleSolution: "",
    };

    try {
        const json = await readLessonFromGithub(filePath);
        if (json && typeof json === "object") {
            lessonContent = { ...lessonContent, ...json };
        }
    } catch (err) {
        console.warn("[lesson] Không đọc được file GitHub:", err.message);
    }

    const lastSubmission = await Submission.findOne({
        userId: user._id,
        lessonId: lesson._id,
    }).sort({ submittedAt: -1 }).lean();

    const canSeeSample = !!lastSubmission;
    const sampleSolution = canSeeSample
        ? lessonContent.sampleSolution || lesson.sampleSolution || ""
        : "";

    res.render("student/lesson", {
        title: lessonContent.title || lesson.title,
        user,
        subject,
        lesson: {
            ...lesson,
            contentHtml: lessonContent.contentHtml || "",
            attachments: lessonContent.attachments || [],
        },
        sampleSolution,
        lastSubmission,
        isAdminView: user.role === "admin",
    });
}

/* ============================================================
 * 5. GET ADMIN LESSONS — FIX: không dùng populate
 * ============================================================ */
exports.getAdminLessons = async (req, res, next) => {
    try {
        const lessons = await Lesson.find()
            .sort({ createdAt: -1 })
            .lean();

        // Gắn subject vào từng lesson (không populate)
        const lessonsWithSubject = await attachSubjects(lessons);

        // Danh sách môn cho dropdown filter
        const allSubjects = await Subject.find({
            deletedAt: null,
            deletedForever: false,
        }).sort({ name: 1 }).lean();

        res.render("admin/lessons", {
            title: "Quản lý Bài học",
            user: req.user,
            lessons: lessonsWithSubject,
            subjects: allSubjects,
            isAdminView: true,
        });
    } catch (err) {
        console.error("❌ getAdminLessons:", err);
        next(err);
    }
};

/* ============================================================
 * 6. SHOW CREATE FORM
 * ============================================================ */
exports.showCreateLesson = async (req, res, next) => {
    try {
        const [subjects, prompts] = await Promise.all([
            Subject.find({ deletedAt: null, deletedForever: false }).sort({ name: 1 }).lean(),
            GradingPrompt.find({ active: true }).lean(),
        ]);

        res.render("admin/lesson_form", {
            title: "Thêm Bài học",
            user: req.user,
            lesson: null,
            subjects,
            prompts,
            isAdminView: true,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 7. CREATE LESSON
 * ============================================================ */
exports.createLesson = async (req, res, next) => {
    try {
        const {
            subjectId, title, description,
            contentHtml, sampleSolution, promptId, githubFile,
        } = req.body;

        if (!subjectId || !title || !title.trim()) {
            return res.status(400).json({ error: "Thiếu subjectId hoặc title" });
        }

        const subject = await Subject.findById(subjectId).lean();
        if (!subject) return res.status(404).json({ error: "Môn học không tồn tại" });

        const slug = slugify(title);
        const existed = await Lesson.findOne({ subjectId, slug });
        if (existed) {
            return res.status(409).json({ error: `Bài "${title}" đã tồn tại trong môn này` });
        }

        const lesson = await Lesson.create({
            subjectId,
            title: title.trim(),
            slug,
            description: description || "",
            contentHtml: contentHtml || "",
            sampleSolution: sampleSolution || "",
            promptId: promptId && mongoose.Types.ObjectId.isValid(promptId) ? promptId : null,
            githubFile: githubFile || `subjects/${subject.slug}/lessons/${slug}.json`,
            deletedAt: null,
            deletedForever: false,
        });

        try {
            safeEnqueue("lesson", {
                lessonId: String(lesson._id),
                path: lesson.githubFile,
                payload: {
                    title: lesson.title,
                    slug: lesson.slug,
                    description: lesson.description,
                    contentHtml: lesson.contentHtml,
                    sampleSolution: lesson.sampleSolution,
                },
            });
        } catch (e) {
            console.warn("[lesson] Queue enqueue failed:", e.message);
        }

        if (req.accepts("html") && !req.xhr) {
            req.flash?.("success", `Đã tạo bài "${lesson.title}"`);
            return res.redirect("/admin/lessons");
        }
        return res.status(201).json({ ok: true, lesson });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 8. SHOW EDIT FORM
 * ============================================================ */
exports.showEditLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).render("error", {
                title: "Lỗi", message: "ID không hợp lệ", user: req.user,
                statusCode: 400, stack: null,
            });
        }

        const [lesson, subjects, prompts] = await Promise.all([
            Lesson.findById(id).lean(),
            Subject.find({ deletedAt: null, deletedForever: false }).sort({ name: 1 }).lean(),
            GradingPrompt.find({ active: true }).lean(),
        ]);

        if (!lesson) {
            return res.status(404).render("error", {
                title: "Không tìm thấy", message: "Bài học không tồn tại",
                user: req.user, statusCode: 404, stack: null,
            });
        }

        res.render("admin/lesson_form", {
            title: "Sửa Bài học",
            user: req.user,
            lesson,
            subjects,
            prompts,
            isAdminView: true,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 9. UPDATE LESSON
 * ============================================================ */
exports.updateLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            subjectId, title, description,
            contentHtml, sampleSolution, promptId, githubFile,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID không hợp lệ" });
        }

        const lesson = await Lesson.findById(id);
        if (!lesson) return res.status(404).json({ error: "Bài học không tồn tại" });

        if (title && title.trim() && title.trim() !== lesson.title) {
            lesson.title = title.trim();
            lesson.slug = slugify(title.trim());
        }
        if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) lesson.subjectId = subjectId;
        if (typeof description === "string") lesson.description = description;
        if (typeof contentHtml === "string") lesson.contentHtml = contentHtml;
        if (typeof sampleSolution === "string") lesson.sampleSolution = sampleSolution;
        if (typeof githubFile === "string" && githubFile) lesson.githubFile = githubFile;
        if (promptId !== undefined) {
            lesson.promptId = promptId && mongoose.Types.ObjectId.isValid(promptId) ? promptId : null;
        }

        await lesson.save();

        try {
            safeEnqueue("lesson", {
                lessonId: String(lesson._id),
                path: lesson.githubFile,
                payload: {
                    title: lesson.title,
                    slug: lesson.slug,
                    description: lesson.description,
                    contentHtml: lesson.contentHtml,
                    sampleSolution: lesson.sampleSolution,
                },
            });
        } catch (e) {
            console.warn("[lesson] Queue enqueue failed:", e.message);
        }

        if (req.accepts("html") && !req.xhr) {
            req.flash?.("success", "Đã cập nhật bài học");
            return res.redirect("/admin/lessons");
        }
        return res.json({ ok: true, lesson });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 10-12. DELETE / RESTORE / HARD DELETE
 * ============================================================ */

exports.deleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID không hợp lệ" });

        const lesson = await Lesson.findById(id);
        if (!lesson) return res.status(404).json({ error: "Không tìm thấy" });

        lesson.deletedAt = new Date();
        await lesson.save();

        if (req.accepts("html") && !req.xhr) {
            req.flash?.("success", "Đã chuyển bài vào thùng rác");
            return res.redirect("/admin/lessons");
        }
        return res.json({ ok: true });
    } catch (err) { next(err); }
};

exports.restoreLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID không hợp lệ" });

        const lesson = await Lesson.findById(id);
        if (!lesson) return res.status(404).json({ error: "Không tìm thấy" });

        lesson.deletedAt = null;
        await lesson.save();

        if (req.accepts("html") && !req.xhr) {
            req.flash?.("success", "Đã khôi phục bài học");
            return res.redirect("/admin/lessons");
        }
        return res.json({ ok: true });
    } catch (err) { next(err); }
};

exports.hardDeleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID không hợp lệ" });

        const lesson = await Lesson.findById(id);
        if (!lesson) return res.status(404).json({ error: "Không tìm thấy" });

        await Lesson.deleteOne({ _id: lesson._id });

        if (req.accepts("html") && !req.xhr) {
            req.flash?.("success", "Đã xoá vĩnh viễn bài học");
            return res.redirect("/admin/lessons");
        }
        return res.json({ ok: true });
    } catch (err) { next(err); }
};