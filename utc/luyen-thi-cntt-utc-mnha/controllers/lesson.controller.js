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

async function findLessonByParam(param) {
    if (isObjectId(param)) {
        return Lesson.findOne({
            _id: param,
            deletedAt: null,
            deletedForever: false,
        }).lean();
    }
    return Lesson.findOne({
        slug: param,
        deletedAt: null,
        deletedForever: false,
    }).lean();
}

async function readLessonFromGithub(filePath) {
    const fn =
        (typeof githubService.readJsonFile === "function" && githubService.readJsonFile) ||
        (typeof githubService.getJSON === "function" && githubService.getJSON) ||
        null;

    if (!fn) throw new Error("githubService không có method readJsonFile/getJSON");
    return fn(filePath);
}

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
 * 2b. LIST ALL LESSONS — admin + student
 * ============================================================ */
exports.listAllLessons = async (req, res, next) => {
    try {
        const user = req.user;
        const isAdmin = user?.role === "admin";

        const subjectQuery = req.query.subject || req.query.subjectId || null;
        const filter = { deletedAt: null, deletedForever: false };

        let currentSubject = null;
        if (subjectQuery) {
            currentSubject = isObjectId(subjectQuery)
                ? await Subject.findById(subjectQuery).lean()
                : await Subject.findOne({ slug: subjectQuery }).lean();

            if (currentSubject) filter.subjectId = currentSubject._id;
        }

        const lessons = await Lesson.find(filter).sort({ createdAt: -1 }).lean();
        const lessonsWithSubject = await attachSubjects(lessons);

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
 * 3. SHOW LESSON
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

async function renderLessonPage(req, res, lesson) {
    const user = req.user;
    if (!user) return res.redirect("/auth/login");

    const subject = lesson.subjectId
        ? await Subject.findById(lesson.subjectId).lean()
        : null;

    const subjectSlug = subject?.slug || `subject-${lesson.subjectId}`;
    const lessonSlug = lesson.slug || `lesson-${lesson._id}`;
    const filePath = lesson.githubFile || `subjects/${subjectSlug}/lessons/${lessonSlug}.json`;

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

    const finalContentHtml = lessonContent.contentHtml || lesson.contentHtml || "";
    const finalSampleSolution = lessonContent.sampleSolution || lesson.sampleSolution || "";

    const lastSubmission = await Submission.findOne({
        userId: user._id,
        lessonId: lesson._id,
    }).sort({ submittedAt: -1 }).lean();

    const canSeeSample = !!lastSubmission;
    const sampleSolution = canSeeSample ? finalSampleSolution : "";

    // ★ duration từ DB — fallback 20 phút
    const duration = Number(lesson.duration) || 20;

    res.render("student/lesson", {
        title: lessonContent.title || lesson.title,
        user,
        subject,
        lesson: {
            ...lesson,
            contentHtml: finalContentHtml,
            attachments: lessonContent.attachments || [],
            duration,
        },
        sampleSolution,
        lastSubmission,
        isAdminView: user.role === "admin",
    });
}

/* ============================================================
 * 5. GET ADMIN LESSONS
 * ============================================================ */
exports.getAdminLessons = async (req, res, next) => {
    try {
        const lessons = await Lesson.find().sort({ createdAt: -1 }).lean();
        const lessonsWithSubject = await attachSubjects(lessons);

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
        const AIKey = require("../models/AIKey");
        const { SUPPORTED_MODELS, DEFAULT_MODEL } = require("../config/aiModels");

        const [subjects, prompts, aiKeys] = await Promise.all([
            Subject.find({ deletedAt: null, deletedForever: false }).sort({ name: 1 }).lean(),
            GradingPrompt.find({ active: true }).lean(),
            AIKey.find({ isActive: true, isRevoked: { $ne: true } }).sort({ createdAt: -1 }).lean(),
        ]);

        res.render("admin/lesson-form", {
            title: "Thêm Bài học",
            user: req.user,
            lesson: null,
            subjects,
            prompts,
            aiKeys,
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL,
            isAdminView: true,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 7. CREATE LESSON  ✅ ĐÃ SỬA: dùng syncQueueService.enqueue
 * ============================================================ */
exports.createLesson = async (req, res, next) => {
    try {
        const {
            subjectId, title, description,
            contentHtml, sampleSolution, promptId, githubFile,
            duration, aiKeyId, model,
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
            duration: Number(duration) || 20,
            aiKeyId: aiKeyId && mongoose.Types.ObjectId.isValid(aiKeyId) ? aiKeyId : null,
            model: model ? String(model).trim() : null,
            createdBy: req.user?._id || null,
            updatedBy: req.user?._id || null,
            deletedAt: null,
            deletedForever: false,
        });

        // ★ Đẩy lên GitHub qua queue
        try {
            syncQueueService.enqueue({
                type: 'putJson',
                filePath: lesson.githubFile,
                commitMessage: `[Lesson] Create: ${lesson.title}`,
                lessonId: String(lesson._id),
                data: {
                    lessonId: String(lesson._id),
                    title: lesson.title,
                    slug: lesson.slug,
                    description: lesson.description || '',
                    contentHtml: lesson.contentHtml || '',
                    sampleSolution: lesson.sampleSolution || '',
                    duration: lesson.duration || 20,
                    model: lesson.model || null,
                    isPublished: lesson.isPublished !== false,
                    createdAt: lesson.createdAt || new Date(),
                    updatedAt: new Date()
                },
                onSuccess: async (result) => {
                    console.log(`📤 [lesson] Đã đẩy lên GitHub: ${result.url}`);
                }
            });
        } catch (e) {
            console.warn("[lesson] Enqueue fail:", e.message);
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

        const AIKey = require("../models/AIKey");
        const { SUPPORTED_MODELS, DEFAULT_MODEL } = require("../config/aiModels");

        const [lesson, subjects, prompts, aiKeys] = await Promise.all([
            Lesson.findById(id).lean(),
            Subject.find({ deletedAt: null, deletedForever: false }).sort({ name: 1 }).lean(),
            GradingPrompt.find({ active: true }).lean(),
            AIKey.find({ isActive: true, isRevoked: { $ne: true } }).sort({ createdAt: -1 }).lean(),
        ]);

        if (!lesson) {
            return res.status(404).render("error", {
                title: "Không tìm thấy", message: "Bài học không tồn tại",
                user: req.user, statusCode: 404, stack: null,
            });
        }

        res.render("admin/lesson-form", {
            title: "Sửa Bài học",
            user: req.user,
            lesson,
            subjects,
            prompts,
            aiKeys,
            supportedModels: SUPPORTED_MODELS,
            defaultModel: DEFAULT_MODEL,
            isAdminView: true,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================================================
 * 9. UPDATE LESSON  ✅ ĐÃ SỬA: fallback githubFile + dùng enqueue
 * ============================================================ */
exports.updateLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            subjectId, title, description,
            contentHtml, sampleSolution, promptId, githubFile,
            duration, aiKeyId, model,
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
        if (duration !== undefined) lesson.duration = Number(duration) || 20;

        // ★ AI KEY + MODEL
        if (aiKeyId !== undefined) {
            lesson.aiKeyId = aiKeyId && mongoose.Types.ObjectId.isValid(aiKeyId) ? aiKeyId : null;
        }
        if (model !== undefined) {
            lesson.model = model ? String(model).trim() : null;
        }

        // ★ FALLBACK: nếu bài cũ không có githubFile → tự tạo từ subject.slug + lesson.slug
        if (!lesson.githubFile) {
            const subjectDoc = await Subject.findById(lesson.subjectId).lean();
            if (subjectDoc && subjectDoc.slug) {
                const subjectSlug = subjectDoc.slug;
                const lessonSlug = lesson.slug || String(lesson._id);
                lesson.githubFile = `subjects/${subjectSlug}/lessons/${lessonSlug}.json`;
                console.log(`📁 [lesson] Fallback githubFile: ${lesson.githubFile}`);
            }
        }

        lesson.updatedBy = req.user?._id || null;
        await lesson.save();

        // ★ Đẩy lên GitHub qua queue
        try {
            if (lesson.githubFile) {
                syncQueueService.enqueue({
                    type: 'putJson',
                    filePath: lesson.githubFile,
                    commitMessage: `[Lesson] Update: ${lesson.title}`,
                    lessonId: String(lesson._id),
                    data: {
                        lessonId: String(lesson._id),
                        title: lesson.title,
                        slug: lesson.slug,
                        description: lesson.description || '',
                        contentHtml: lesson.contentHtml || '',
                        sampleSolution: lesson.sampleSolution || '',
                        duration: lesson.duration || 20,
                        model: lesson.model || null,
                        isPublished: lesson.isPublished !== false,
                        updatedAt: new Date()
                    },
                    onSuccess: async (result) => {
                        console.log(`📤 [lesson] Đã cập nhật GitHub: ${result.url}`);
                    }
                });
            } else {
                console.warn(`[lesson] Bỏ qua enqueue — lesson không có githubFile`);
            }
        } catch (e) {
            console.warn("[lesson] Enqueue fail:", e.message);
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
        lesson.updatedBy = req.user?._id || null;
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
        lesson.updatedBy = req.user?._id || null;
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