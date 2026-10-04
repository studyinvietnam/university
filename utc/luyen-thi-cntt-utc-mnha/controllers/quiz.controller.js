'use strict';
/* ============================================================
   controllers/quiz.controller.js — bài trắc nghiệm
   Admin : newForm, editForm, parsePreview, create, update, reviewPage, saveQuizTeacherComment
   Student: submit, status, analyze, renderStudentDetail
   Export thêm: toStudentView(quiz) — lesson.controller dùng khi render quiz-lesson.pug

   ⚠️ Mình CHƯA thấy các service của bạn, nên mọi lời gọi tới chúng nằm trong
   khối ADAPTERS bên dưới. Đối chiếu tên hàm / kiểu trả về thật rồi sửa MỘT CHỖ đó.
   ============================================================ */

const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const GradingPrompt = require('../models/GradingPrompt');
const AIKey = require('../models/AIKey');
const AuditLog = require('../models/AuditLog');

const githubService = require('../services/githubService');
const syncQueue = require('../services/syncQueueService');
const quizParser = require('../services/quizParserService');
const quizGrader = require('../services/quizGradingService');
const quizAnalysis = require('../services/quizAnalysisService');
const userKeyService = require('../services/userKeyService');
const sanitizeService = require('../services/sanitizeService');
const notificationService = require('../services/notificationService');
const aiService = require('../services/aiService');
const quizConfig = require('../config/quizConfig');

// ============================================================
// ADAPTERS — chỉnh cho khớp code thật của bạn
// ============================================================
const A = {
  // → { data, sha } | null (không có file)
  ghRead: (path) => githubService.readJsonFileWithSha(path),
  // sha = undefined → tạo mới. Phải ném lỗi có err.status === 409 khi SHA cũ.
  ghWrite: async (path, data, sha) => {
    if (!sha) return githubService.writeJsonFile(path, data, 'Quiz: ' + path);
    try {
      return await githubService.writeJsonFileIfSha(path, data, sha, 'Quiz: ' + path);
    } catch (e) {
      if (e && e.code === 'SHA_CONFLICT') e.status = 409;   // controller bắt err.status === 409
      throw e;
    }
  },
  ghInvalidate: (path) => { if (typeof githubService.invalidate === 'function') githubService.invalidate(path); },

  // → { errors: [{ line, msg }], questions: [...] } theo đúng JSON đề trong README
  parsePart: (part, text, opts) => {
    const r = quizParser.parsePart(text, part);   // service export: parsePart(rawText, part)
    return { errors: r.errors || [], questions: r.questions || [], note: r.note || null };
  },
  serializePart: (part, questions, note) => quizParser.serializePart(questions, part, note),

  grade: (quiz, answers) => quizGrader.grade(quiz, answers),

  // HTML ngắn (giải thích / mô tả) → sanitize-html allowlist
  cleanHtml: (html) => sanitizeService.sanitizeExplanationHtml(html),

  // Phạm vi user_key. Trả về điều kiện Mongo gộp vào query Subject/Lesson của admin.
  adminScope: async (actor) => (await userKeyService.getContentScope(actor)).query || {},
  // Student có được làm bài này không (userKey gốc + connectedUserKeys)
  studentCanAccess: (user, lesson) => userKeyService.canAccess(user, lesson),
  // Admin này có quyền với bài này không (default admin: mọi bài; user_key admin: bài mình tạo)
  adminCanAccess: (actor, lesson) => !actor.userKey || String(lesson.createdBy) === String(actor._id),

  formatAiLabel: (provider, keyName) => aiService.formatAiLabel(provider, keyName),

  // Đẩy JSON bài nộp lên GitHub qua queue; có fallback tự retry nếu queue không có enqueue()
  queuePush: (job) => {
    if (typeof syncQueue.enqueue === 'function') return syncQueue.enqueue(job);
    (async () => {
      for (let i = 0; i < 3; i++) {
        try { await A.ghWrite(job.path, job.content); return job.onCommitted(); }
        catch (e) { await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
      }
      job.onFailed();
    })();
  },

  notifyNewLesson: (lesson, subject) => notificationService.notifyNewLesson(lesson, subject),
  notifyTeacherComment: (submission) => notificationService.create({
    userId: submission.userId, type: 'teacher_comment', title: 'Giảng viên đã nhận xét bài làm',
    message: 'Bài trắc nghiệm của bạn có nhận xét mới từ giảng viên.', link: `/submissions/${submission._id}`,
  }),
};

async function audit(req, action, targetType, targetId, detail) {
  try {
    await AuditLog.create({ adminId: req.user._id, action, targetType, targetId, detail, userKey: req.user.userKey || null });
  } catch (e) { console.warn('[quiz] audit:', e.message); }
}

// ============================================================
// Tiện ích
// ============================================================
const PARTS = ['mcq', 'tf', 'fill'];
const MAX_TEXT = quizConfig.MAX_TEXT_CHARS || 200000;
const MAX_ANALYSES = quizConfig.MAX_ANALYSES_PER_SUBMISSION || 5;
const COOLDOWN_MS = quizConfig.ANALYSIS_COOLDOWN_MS || 30000;
const DEFAULT_DURATION = quizConfig.DEFAULT_DURATION || 20;
const DURATION_MIN = 1;
const DURATION_MAX = 600;

// Số thập phân: nhận cả "0.25" lẫn "0,25"
function toNum(v, def) {
  const s = String(v == null ? '' : v).trim().replace(',', '.');
  if (s === '') return def;
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}
const round4 = (n) => Math.round(n * 10000) / 10000;

function parseDuration(v) {
  const n = toNum(v, NaN);
  return Number.isInteger(n) && n >= DURATION_MIN && n <= DURATION_MAX ? n : null;
}

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'quiz';
}

const fail = (res, status, message, extra) => res.status(status).json(Object.assign({ success: false, message }, extra || {}));
const isDefaultAdmin = (u) => !u.userKey;

// ============================================================
// Dựng đề từ text (SERVER PARSE LẠI — không tin JSON của client)
// ============================================================
function buildQuiz(body) {
  const errors = [];
  const maxScore = toNum(body.maxScore, NaN);
  if (!(maxScore > 0)) errors.push({ msg: 'Thang điểm tối đa phải là số lớn hơn 0 (VD 10 hoặc 2.5).' });

  const parts = {};
  let total = 0;
  for (const part of PARTS) {
    const text = String(body[part] || '');
    if (text.length > MAX_TEXT) { errors.push({ part, msg: 'Text quá dài.' }); continue; }
    if (!text.trim()) continue;

    const ppq = toNum(body['pointsPerQuestion_' + part], NaN);
    if (!(ppq > 0)) { errors.push({ part, msg: '“Điểm / câu” phải là số lớn hơn 0 (VD 0.1, 0.2, 0.25, 1).' }); continue; }

    const opts = {};
    if (part === 'fill') {
      opts.tolerance = Math.max(0, toNum(body.tolerance, 0));
      opts.note = String(body.note || '').trim().slice(0, 300);
    }
    const r = A.parsePart(part, text, opts);
    if (r.errors.length) { r.errors.forEach((e) => errors.push({ part, line: e.line, msg: e.msg })); continue; }
    if (!r.questions.length) continue;

    const questions = r.questions.map((q, i) => Object.assign({}, q, {
      id: `${part}-${i + 1}`,
      explanationHtml: q.explanationHtml ? (A.cleanHtml(q.explanationHtml) || null) : null,
    }));
    parts[part] = { pointsPerQuestion: round4(ppq), questions };
    if (part === 'fill') {
      parts.fill.tolerance = opts.tolerance;
      parts.fill.note = opts.note || (r.note ? String(r.note).slice(0, 300) : '');
    }
    total += questions.length;
  }
  if (!total && !errors.length) errors.push({ msg: 'Cần ít nhất 1 câu hỏi ở một phần nào đó.' });
  if (errors.length) return { errors };
  return { quiz: { version: 1, maxScore: round4(maxScore), parts }, counts: {
    mcq: parts.mcq ? parts.mcq.questions.length : 0,
    tf: parts.tf ? parts.tf.questions.length : 0,
    fill: parts.fill ? parts.fill.questions.length : 0,
  } };
}

// ============================================================
// Dữ liệu gửi xuống sinh viên: COPY theo allowlist — KHÔNG có correct / answers / explanationHtml
// ============================================================
function toStudentView(quiz) {
  const out = { maxScore: quiz.maxScore, parts: {} };
  for (const k of PARTS) {
    const p = quiz.parts && quiz.parts[k];
    if (!p || !Array.isArray(p.questions) || !p.questions.length) continue;
    out.parts[k] = {
      pointsPerQuestion: p.pointsPerQuestion,
      questions: p.questions.map((q) => {
        const v = { id: q.id, text: q.text, image: q.image || null };
        if (k === 'mcq') { v.options = (q.options || []).map((o) => ({ key: o.key, text: o.text })); v.multi = !!q.multi; }
        return v;
      }),
    };
    if (k === 'fill') out.parts[k].note = p.note || '';
  }
  return out;
}

// Lọc bài làm: chỉ nhận id có trong đề, đúng kiểu, giới hạn độ dài
function sanitizeAnswers(quiz, raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const k of PARTS) {
    const p = quiz.parts && quiz.parts[k];
    if (!p) continue;
    for (const q of p.questions) {
      const a = src[q.id];
      if (a === undefined || a === null) continue;
      if (k === 'mcq') {
        const keys = new Set((q.options || []).map((o) => o.key));
        const picked = (Array.isArray(a) ? a : [a]).map(String).filter((x) => keys.has(x));
        if (picked.length) out[q.id] = Array.from(new Set(picked)).sort();
      } else if (k === 'tf') {
        if (typeof a === 'boolean') out[q.id] = a;
      } else if (typeof a === 'string' && a.trim()) {
        out[q.id] = a.trim().slice(0, 300);
      }
    }
  }
  return out;
}

// Kết quả trả ngay cho sinh viên: thêm giải thích đã sanitize (lấy từ đề, không lưu vào result)
function withExplanations(result, quiz) {
  const expl = {};
  for (const k of PARTS) ((quiz.parts[k] || {}).questions || []).forEach((q) => { expl[q.id] = q.explanationHtml || null; });
  return Object.assign({}, result, {
    items: (result.items || []).map((it) => Object.assign({}, it, { explanationHtml: expl[it.id] ? A.cleanHtml(expl[it.id]) : null })),
  });
}

// ============================================================
// ADMIN — form tạo / sửa
// ============================================================
async function formLists(actor) {
  const scope = await A.adminScope(actor);
  const [subjects, prompts, aiKeys] = await Promise.all([
    Subject.find(Object.assign({ deletedAt: null, deletedForever: { $ne: true } }, scope)).sort({ name: 1 }).lean(),
    GradingPrompt.find({ kind: 'quiz', active: true }).sort({ name: 1 }).lean(),
    isDefaultAdmin(actor) ? AIKey.find({ active: true }).sort({ name: 1 }).lean() : [],
  ]);
  return { subjects, prompts, aiKeys: aiKeys.map((k) => Object.assign({}, k, { provider: k.provider || 'gemini' })), canPickAIKey: isDefaultAdmin(actor) };
}

exports.newForm = async (req, res, next) => {
  try {
    const lists = await formLists(req.user);
    res.render('admin/quiz-form', Object.assign(lists, {
      mode: 'create', subjectId: req.query.subjectId || '', quiz: null, lesson: null,
      rawTexts: { mcq: '', tf: '', fill: '' }, submissionCount: 0, sha: null, quizConfig,
    }));
  } catch (e) { next(e); }
};

exports.editForm = async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.lessonId, type: 'quiz', deletedForever: { $ne: true } }).lean();
    if (!lesson || !A.adminCanAccess(req.user, lesson)) return res.status(404).render('error', { message: 'Không tìm thấy bài trắc nghiệm.' });
    const file = await A.ghRead(lesson.githubFile);
    if (!file) return res.status(404).render('error', { message: 'Không đọc được đề trên GitHub.' });

    const parts = (file.data.quiz && file.data.quiz.parts) || {};
    const rawTexts = {};
    PARTS.forEach((k) => { rawTexts[k] = parts[k] ? A.serializePart(k, parts[k].questions) : ''; });

    const lists = await formLists(req.user);
    const submissionCount = await Submission.countDocuments({ lessonId: lesson._id, type: 'quiz' });
    res.render('admin/quiz-form', Object.assign(lists, {
      mode: 'edit', subjectId: String(lesson.subjectId), quiz: file.data, lesson, rawTexts, submissionCount, sha: file.sha, quizConfig,
    }));
  } catch (e) { next(e); }
};

// Xem trước / kiểm tra, KHÔNG lưu (route cần rate-limit)
exports.parsePreview = (req, res) => {
  const built = buildQuiz(req.body || {});
  if (built.errors) return fail(res, 400, 'Đề chưa hợp lệ.', { errors: built.errors });
  res.json({ success: true, preview: built.quiz });
};

// ============================================================
// ADMIN — lưu (tạo mới / cập nhật)
// ============================================================
async function readCommon(req, body) {
  const duration = parseDuration(body.duration);
  if (duration == null) return { error: `Thời gian làm bài phải là số phút nguyên từ ${DURATION_MIN} đến ${DURATION_MAX}.` };

  const title = String(body.title || '').trim().slice(0, 200);
  if (!title) return { error: 'Chưa nhập tiêu đề bài.' };

  const built = buildQuiz(body);
  if (built.errors) return { errors: built.errors };

  let promptId = null;
  if (body.promptId) {
    const p = await GradingPrompt.findOne({ _id: body.promptId, kind: 'quiz', active: true }).select('_id').lean();
    if (!p) return { error: 'Prompt phân tích không hợp lệ.' };
    promptId = p._id;
  }

  // Chỉ admin default được gán AI cho phép phân tích (server bỏ qua với admin user_key)
  let analysisAiKeyIds;
  if (isDefaultAdmin(req.user)) {
    const ids = Array.isArray(body.aiKeyIds) ? body.aiKeyIds : [];
    analysisAiKeyIds = ids.length ? (await AIKey.find({ _id: { $in: ids }, active: true }).select('_id').lean()).map((k) => k._id) : [];
  }
  return { duration, title, built, promptId, analysisAiKeyIds,
    contentHtml: body.contentHtml ? (A.cleanHtml(String(body.contentHtml).slice(0, 20000)) || null) : null };
}

exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    const scope = await A.adminScope(req.user);
    const subject = await Subject.findOne(Object.assign({ _id: body.subjectId, deletedAt: null, deletedForever: { $ne: true } }, scope));
    if (!subject) return fail(res, 404, 'Không tìm thấy môn học.');

    const c = await readCommon(req, body);
    if (c.error) return fail(res, 400, c.error);
    if (c.errors) return fail(res, 400, 'Đề chưa hợp lệ.', { errors: c.errors });

    let slug = slugify(body.slug || c.title);
    if (await Lesson.exists({ subjectId: subject._id, slug })) slug += '-' + Date.now().toString(36);
    const githubFile = `subjects/${subject.slug}/lessons/${slug}.json`;
    if (await A.ghRead(githubFile)) return fail(res, 409, 'Đã có file trùng đường dẫn trên GitHub. Đổi tiêu đề / slug.');

    await A.ghWrite(githubFile, { type: 'quiz', title: c.title, contentHtml: c.contentHtml, quiz: c.built.quiz });

    const lesson = await Lesson.create({
      subjectId: subject._id, title: c.title, slug, githubFile, type: 'quiz',
      quizCounts: c.built.counts, duration: c.duration, promptId: c.promptId,
      analysisAiKeyIds: c.analysisAiKeyIds || [],
      userKey: subject.userKey || null,          // kế thừa từ môn
      createdBy: req.user._id, isPublished: true,
    });

    try { await A.notifyNewLesson(lesson, subject); } catch (e) { console.warn('[quiz] notify:', e.message); }
    await audit(req, 'create_quiz', 'Lesson', lesson._id, { title: c.title, duration: c.duration, counts: c.built.counts });
    res.json({ success: true, lessonId: String(lesson._id) });
  } catch (e) {
    console.error('[quiz.create]', e);
    fail(res, 500, 'Lỗi máy chủ khi tạo bài.');
  }
};

exports.update = async (req, res) => {
  try {
    const body = req.body || {};
    const lesson = await Lesson.findOne({ _id: req.params.lessonId, type: 'quiz', deletedForever: { $ne: true } });
    if (!lesson || !A.adminCanAccess(req.user, lesson)) return fail(res, 404, 'Không tìm thấy bài trắc nghiệm.');

    const c = await readCommon(req, body);
    if (c.error) return fail(res, 400, c.error);
    if (c.errors) return fail(res, 400, 'Đề chưa hợp lệ.', { errors: c.errors });

    const file = await A.ghRead(lesson.githubFile);
    if (!file) return fail(res, 404, 'Không đọc được đề trên GitHub.');
    // Ai đó vừa sửa đề (trên GitHub hoặc tab khác) → không tự ghi đè
    if (body.sha && body.sha !== file.sha) return fail(res, 409, 'Đề đã bị đổi, vui lòng tải lại trang.');

    try {
      await A.ghWrite(lesson.githubFile, { type: 'quiz', title: c.title, contentHtml: c.contentHtml, quiz: c.built.quiz }, file.sha);
    } catch (e) {
      if (e && e.status === 409) return fail(res, 409, 'Đề đã bị đổi, vui lòng tải lại trang.');
      throw e;
    }
    A.ghInvalidate(lesson.githubFile);

    lesson.title = c.title;
    lesson.duration = c.duration;
    lesson.promptId = c.promptId;
    lesson.quizCounts = c.built.counts;
    if (c.analysisAiKeyIds) lesson.analysisAiKeyIds = c.analysisAiKeyIds;
    await lesson.save();

    await audit(req, 'update_quiz', 'Lesson', lesson._id, { title: c.title, duration: c.duration, counts: c.built.counts });
    res.json({ success: true, lessonId: String(lesson._id) });
  } catch (e) {
    console.error('[quiz.update]', e);
    fail(res, 500, 'Lỗi máy chủ khi lưu bài.');
  }
};

// ============================================================
// STUDENT — nộp bài (server chấm, KHÔNG dùng AI)
// ============================================================
async function loadStudentLesson(req) {
  const lesson = await Lesson.findOne({
    _id: req.params.lessonId, type: 'quiz', isPublished: true, deletedAt: null, deletedForever: { $ne: true },
  });
  if (!lesson) return null;
  // Admin cũng được làm bài: default admin làm mọi bài, admin user_key chỉ bài mình tạo
  if (req.user.role === 'admin') return A.adminCanAccess(req.user, lesson) ? lesson : null;
  return (await A.studentCanAccess(req.user, lesson)) ? lesson : null;
}

exports.submit = async (req, res) => {
  try {
    if (!['student', 'admin'].includes(req.user.role)) return fail(res, 403, 'Bạn không có quyền nộp bài.');
    const lesson = await loadStudentLesson(req);
    if (!lesson) return fail(res, 404, 'Không tìm thấy bài.');

    const file = await A.ghRead(lesson.githubFile);            // đọc LẠI đề từ GitHub
    if (!file || !file.data.quiz) return fail(res, 500, 'Không đọc được đề.');
    const quiz = file.data.quiz;
    const answers = sanitizeAnswers(quiz, req.body && req.body.answers);

    const result = A.grade(quiz, answers);
    const subject = await Subject.findById(lesson.subjectId).select('slug').lean();
    const now = new Date();
    const path = `submissions/${subject.slug}/${lesson.slug}/${req.user._id}-${now.getTime()}.json`;

    const sub = await Submission.create({
      userId: req.user._id, lessonId: lesson._id, githubFile: path, type: 'quiz',
      score: result.score, maxScore: result.maxScore, correctCount: result.correctCount, totalCount: result.totalCount,
      status: 'pending', submittedAt: now, gradedAt: now, analysisCount: 0, teacherComment: null,
    });

    const json = {
      type: 'quiz', userId: String(req.user._id), lessonId: String(lesson._id), submittedAt: now.toISOString(),
      answers, quizSnapshot: quiz, result, gradedAt: now.toISOString(), gradedBy: 'auto',
      teacherComment: null, teacherCommentHistory: [], aiAnalyses: [],
    };
    A.queuePush({
      path, content: json, label: 'quiz-submission',
      onCommitted: () => Submission.updateOne({ _id: sub._id }, { $set: { status: 'committed' } }),
      onFailed: () => Submission.updateOne({ _id: sub._id }, { $set: { status: 'failed' } }),
    });

    // Trả ngay (không chờ GitHub)
    res.json({ success: true, submissionId: String(sub._id), status: 'pending', result: withExplanations(result, quiz) });
  } catch (e) {
    console.error('[quiz.submit]', e);
    fail(res, 500, 'Lỗi máy chủ khi chấm bài.');
  }
};

exports.status = async (req, res) => {
  const sub = await Submission.findOne({ _id: req.params.id, userId: req.user._id, type: 'quiz' }).select('status analysisCount').lean();
  if (!sub) return fail(res, 404, 'Không tìm thấy bài nộp.');
  res.json({ success: true, status: sub.status, analysisCount: sub.analysisCount || 0 });
};

// ============================================================
// STUDENT — Phân tích AI (chỉ chủ bài, bài đã committed)
// ============================================================
const analyzing = new Set();   // chống bấm đồng thời cùng một bài

exports.analyze = async (req, res) => {
  const id = String(req.params.id);
  if (analyzing.has(id)) return fail(res, 429, 'Đang phân tích, vui lòng chờ.');
  analyzing.add(id);
  try {
    const sub = await Submission.findOne({ _id: id, userId: req.user._id, type: 'quiz' });
    if (!sub) return fail(res, 404, 'Không tìm thấy bài nộp.');
    if (sub.status !== 'committed') return fail(res, 409, 'Bài chưa lưu xong lên GitHub, thử lại sau ít giây.');
    if ((sub.analysisCount || 0) >= MAX_ANALYSES) return fail(res, 429, 'Đã đạt số lần phân tích tối đa.', { limitReached: true });
    if (sub.lastAnalyzedAt && Date.now() - sub.lastAnalyzedAt.getTime() < COOLDOWN_MS) {
      return fail(res, 429, `Vui lòng chờ ${Math.ceil((COOLDOWN_MS - (Date.now() - sub.lastAnalyzedAt.getTime())) / 1000)} giây rồi thử lại.`);
    }

    const lesson = await Lesson.findById(sub.lessonId).lean();
    if (!lesson) return fail(res, 404, 'Bài học không còn tồn tại.');
    // Chỉ nhận aiKeyId nằm trong danh sách cho phép của bài
    let aiKeyId = null;
    if (req.body && req.body.aiKeyId) {
      const allowed = (lesson.analysisAiKeyIds || []).map(String);
      if (!allowed.includes(String(req.body.aiKeyId))) return fail(res, 400, 'AI không được phép cho bài này.');
      aiKeyId = req.body.aiKeyId;
    }

    const subject = await Subject.findById(lesson.subjectId).lean();
    // Service: dựng prompt → gọi AI (timeout, retry parse) → append vào aiAnalyses trên GitHub (đọc mới nhất → gộp → ghi theo SHA)
    const analysis = await quizAnalysis.analyze({ submission: sub, lesson, subject, student: req.user, aiKeyId });

    // Chỉ tăng đếm sau khi GitHub đã ghi OK
    const upd = await Submission.findOneAndUpdate({ _id: sub._id },
      { $inc: { analysisCount: 1 }, $set: { lastAnalyzedAt: new Date() } }, { new: true });
    const count = upd.analysisCount;
    res.json({
      success: true, analysisCount: count, limitReached: count >= MAX_ANALYSES,
      analysis: Object.assign({}, analysis, { aiLabel: A.formatAiLabel(analysis.aiProvider || 'gemini', analysis.aiKeyName) }),
    });
  } catch (e) {
    console.error('[quiz.analyze]', e);
    fail(res, e.status || 500, e.userMessage || 'Phân tích thất bại, thử lại sau.');
  } finally {
    analyzing.delete(id);
  }
};

// ============================================================
// Trang chi tiết bài nộp (student) + trang review (admin)
// ============================================================
async function loadDetail(sub) {
  const [lesson, doc] = await Promise.all([Lesson.findById(sub.lessonId).lean(), A.ghRead(sub.githubFile)]);
  const subject = lesson ? await Subject.findById(lesson.subjectId).lean() : null;
  return { lesson, subject, doc: doc ? doc.data : null, sha: doc ? doc.sha : null };
}

exports.renderStudentDetail = async (req, res, next) => {
  try {
    const sub = await Submission.findOne({ _id: req.params.id, userId: req.user._id, type: 'quiz' }).lean();
    if (!sub) return res.status(404).render('error', { message: 'Không tìm thấy bài nộp.' });
    const d = await loadDetail(sub);
    if (!d.lesson || !d.doc) return res.status(404).render('error', { message: 'Chưa đọc được dữ liệu bài nộp.' });
    const keyIds = d.lesson.analysisAiKeyIds || [];
    const ais = keyIds.length ? await AIKey.find({ _id: { $in: keyIds }, active: true }).lean() : [];
    res.render('student/quiz-submission-detail', {
      submission: sub, lesson: d.lesson, subject: d.subject, doc: d.doc, quizConfig,
      formatAiLabel: A.formatAiLabel,
      analysisAiOptions: ais.map((k) => ({ id: String(k._id), label: A.formatAiLabel(k.provider || 'gemini', k.name) })),
    });
  } catch (e) { next(e); }
};

exports.reviewPage = async (req, res, next) => {
  try {
    const sub = await Submission.findOne({ _id: req.params.id, type: 'quiz' }).lean();
    if (!sub) return res.status(404).render('error', { message: 'Không tìm thấy bài nộp.' });
    const d = await loadDetail(sub);
    if (!d.lesson || !A.adminCanAccess(req.user, d.lesson)) return res.status(404).render('error', { message: 'Không tìm thấy bài nộp.' });
    res.render('admin/quiz_submission_review', {
      submission: sub, lesson: d.lesson, subject: d.subject, doc: d.doc, formatAiLabel: A.formatAiLabel,
    });
  } catch (e) { next(e); }
};

// Nhận xét giảng viên — hàm riêng, KHÔNG sửa saveTeacherComment của tự luận
exports.saveQuizTeacherComment = async (req, res) => {
  try {
    const content = String((req.body && req.body.content) || '').trim();
    if (!content) return fail(res, 400, 'Vui lòng nhập nội dung nhận xét');
    if (content.length > 3000) return fail(res, 400, 'Nhận xét tối đa 3000 ký tự.');

    const sub = await Submission.findOne({ _id: req.params.id, type: 'quiz' });
    if (!sub) return fail(res, 404, 'Không tìm thấy bài nộp.');
    const lesson = await Lesson.findById(sub.lessonId).lean();
    if (!lesson || !A.adminCanAccess(req.user, lesson)) return fail(res, 404, 'Không tìm thấy bài nộp.');

    const entry = { content, commentedBy: req.user._id, commentedByName: req.user.name || 'Giảng viên', commentedAt: new Date().toISOString() };
    const hadComment = !!sub.teacherComment;

    // đọc mới nhất → gộp → ghi theo SHA; 409 thì đọc lại gộp lại (phân tích AI có thể ghi cùng lúc)
    for (let attempt = 0; attempt < 3; attempt++) {
      const file = await A.ghRead(sub.githubFile);
      if (!file) return fail(res, 404, 'Không đọc được bài nộp trên GitHub.');
      const doc = file.data;
      if (doc.teacherComment) {
        doc.teacherCommentHistory = (doc.teacherCommentHistory || []).concat([{
          content: doc.teacherComment.content, commentedBy: doc.teacherComment.commentedBy, commentedAt: doc.teacherComment.commentedAt,
        }]);
      }
      doc.teacherComment = entry;
      try { await A.ghWrite(sub.githubFile, doc, file.sha); break; }
      catch (e) { if (e && e.status === 409 && attempt < 2) continue; throw e; }
    }

    sub.teacherComment = entry;
    await sub.save();
    try { await A.notifyTeacherComment(sub); } catch (e) { console.warn('[quiz] notify:', e.message); }
    await audit(req, hadComment ? 'edit_teacher_comment' : 'add_teacher_comment', 'Submission', sub._id, { length: content.length });
    res.json({ success: true });
  } catch (e) {
    console.error('[quiz.saveQuizTeacherComment]', e);
    fail(res, 500, 'Không lưu được nhận xét.');
  }
};

exports.toStudentView = toStudentView;
exports._internal = { buildQuiz, sanitizeAnswers, parseDuration, toNum };   // để viết test

/* ------------------------------------------------------------
   routes/quiz.js (gợi ý) — requireAdmin / requireStudent / rateLimit của bạn
   router.get ('/admin/quiz/new',                        requireAdmin, c.newForm);
   router.post('/admin/quiz/parse',                      requireAdmin, rateLimit, c.parsePreview);
   router.post('/admin/quiz',                            requireAdmin, c.create);
   router.get ('/admin/quiz/:lessonId/edit',             requireAdmin, c.editForm);
   router.post('/admin/quiz/:lessonId',                  requireAdmin, c.update);
   router.get ('/admin/quiz-submissions/:id/review',     requireAdmin, c.reviewPage);
   router.post('/admin/quiz-submissions/:id/review',     requireAdmin, c.saveQuizTeacherComment);
   router.post('/api/quiz/:lessonId/submit',             requireStudent, rateLimit, c.submit);
   router.get ('/api/quiz/submissions/:id/status',       requireStudent, c.status);
   router.post('/api/quiz/submissions/:id/analyze',      requireStudent, rateLimit, c.analyze);
   ⚠️ Route /admin/quiz/parse và /admin/quiz/new khai báo TRƯỚC /admin/quiz/:lessonId.
   ------------------------------------------------------------ */
