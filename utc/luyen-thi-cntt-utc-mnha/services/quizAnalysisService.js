// services/quizAnalysisService.js
// Dựng prompt + gọi AI + ghi aiAnalyses vào JSON bài nộp trên GitHub.

const cfg = require('../config/quizConfig');
const aiService = require('./aiService');
const githubService = require('./githubService');
const promptService = require('./promptService');
const sanitizeService = require('./sanitizeService');

const SUBMISSION_PATH_TMPL = (subjectSlug, lessonSlug, userId, ts) =>
  `submissions/${subjectSlug}/${lessonSlug}/${userId}-${ts}.json`;

function buildQuizForAI(quiz, result, answers) {
  // Câu sai: full (đề + đáp án + giải thích + bài làm + đúng/sai)
  // Câu đúng: rút gọn (id + ~200 ký tự đầu)
  const lines = [];
  for (const partKey of cfg.PARTS) {
    const p = quiz.parts?.[partKey];
    if (!p || !p.questions?.length) continue;
    lines.push(`## ${cfg.PART_LABEL[partKey]}`);
    for (const q of p.questions) {
      const item = result.items.find((x) => x.id === q.id);
      const correct = item?.correct;
      if (correct) {
        const preview = (q.text || '').slice(0, cfg.CORRECT_QUESTION_PREVIEW_LEN);
        lines.push(`- [ĐÚNG] ${q.id}: ${preview}`);
        continue;
      }
      lines.push(`- [SAI] ${q.id}: ${q.text}`);
      if (partKey === 'mcq') {
        for (const o of q.options || []) lines.push(`  ${o.key}. ${o.text}`);
        lines.push(`  Đáp án đúng: ${(q.correct || []).join(', ')}`);
        lines.push(`  SV chọn: ${JSON.stringify(item?.studentAnswer ?? null)}`);
      } else if (partKey === 'tf') {
        lines.push(`  Đáp án đúng: ${q.correct ? 'Đúng' : 'Sai'}`);
        lines.push(`  SV chọn: ${item?.studentAnswer === true ? 'Đúng' : item?.studentAnswer === false ? 'Sai' : '(bỏ trống)'}`);
      } else {
        lines.push(`  Đáp án chấp nhận: ${(q.answers || []).join(' | ')}`);
        lines.push(`  SV điền: ${item?.studentAnswer ?? '(bỏ trống)'}`);
      }
      if (q.explanationHtml) {
        lines.push(`  Giải thích của GV: ${q.explanationHtml}`);
      }
    }
  }
  return lines.join('\n');
}

function buildAnswerForAI(quiz, result) {
  const lines = [];
  for (const it of result.items) {
    const q = (quiz.parts?.[it.part]?.questions || []).find((x) => x.id === it.id);
    const label = it.correct ? 'ĐÚNG' : 'SAI';
    lines.push(`- ${it.id} [${label}]: SV=${JSON.stringify(it.studentAnswer)} | Đáp án=${JSON.stringify(it.correctAnswer)}${q ? ' | câu: ' + (q.text || '').slice(0, 120) : ''}`);
  }
  return lines.join('\n');
}

function buildResultForAI(result) {
  const lines = [];
  lines.push(`Điểm: ${result.score}/${result.maxScore}`);
  lines.push(`Số câu đúng: ${result.correctCount}/${result.totalCount}`);
  for (const partKey of cfg.PARTS) {
    const s = result.parts[partKey];
    if (!s) continue;
    lines.push(`- ${cfg.PART_LABEL[partKey]}: ${s.correct}/${s.total} câu, ${s.earned}/${s.points} điểm`);
  }
  return lines.join('\n');
}

/**
 * Chọn prompt theo thứ tự ưu tiên:
 * Lesson.promptId (kind=quiz) → Subject.quizPromptId → global default (kind=quiz) → fallback cứng
 */
async function resolvePrompt({ lesson, subject }) {
  const fromLesson = lesson?.promptId ? await promptService.getPromptById(lesson.promptId) : null;
  if (fromLesson && fromLesson.active && (fromLesson.kind || 'essay') === 'quiz') return fromLesson;

  const fromSubject = subject?.quizPromptId ? await promptService.getPromptById(subject.quizPromptId) : null;
  if (fromSubject && fromSubject.active && (fromSubject.kind || 'essay') === 'quiz') return fromSubject;

  const globalDefault = await promptService.getDefaultPromptByKind('quiz');
  if (globalDefault) return globalDefault;

  return null; // dùng fallback cứng
}

function renderPrompt(promptDoc, { quiz, result, answers, studentName }) {
  const rawTemplate = promptDoc?.content || cfg.DEFAULT_QUIZ_ANALYSIS_PROMPT;
  const map = {
    '{đề_trắc_nghiệm}': sanitizeService.wrapAsData(buildQuizForAI(quiz, result, answers), 'ĐỀ TRẮC NGHIỆM'),
    '{bài_làm}': sanitizeService.wrapAsData(buildAnswerForAI(quiz, result), 'BÀI LÀM'),
    '{kết_quả}': buildResultForAI(result),
    '{student_name}': studentName || 'sinh viên',
    '{max_score}': String(quiz.maxScore || cfg.DEFAULT_MAX_SCORE),
  };
  // Thay MỘT LƯỢT: nếu sinh viên gõ "{kết_quả}" vào ô điền thì chuỗi đó không bị thay lần nữa
  return rawTemplate.replace(/\{[^{}]+\}/g, (m) => (Object.prototype.hasOwnProperty.call(map, m) ? map[m] : m));
}

function safeParseAnalysis(text) {
  if (!text) return null;
  let s = String(text).trim();
  // bỏ code fence
  s = s.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  // tìm object JSON đầu tiên
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(candidate);
    if (typeof obj !== 'object' || obj === null) return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Chạy phân tích AI.
 * @returns { aiAnalyses: [...] } - trả về object mới để controller append vào GitHub
 */
async function analyze({
  quiz, result, answers, submission, studentName,
  lesson, subject, userId,
  aiKeyId, aiProviderHint, // hint provider nếu client chọn key
  providerResolver, // hàm (aiKeyId) => { provider, keyName, model, apiKey }
}) {
  const promptDoc = await resolvePrompt({ lesson, subject });
  const rendered = renderPrompt(promptDoc, { quiz, result, answers, studentName });

  const resolved = await providerResolver(aiKeyId);
  if (!resolved) throw new Error('Không có AI key khả dụng để phân tích.');

  const startedAt = Date.now();
  const callResult = await aiService.runQuizAnalysis({
    systemPrompt: rendered,
    provider: resolved.provider,
    apiKey: resolved.apiKey,
    model: resolved.model,
    timeoutMs: cfg.ANALYSIS_TIMEOUT_MS,
  });
  const latencyMs = Date.now() - startedAt;

  const parsed = safeParseAnalysis(callResult.text);

  const entry = {
    id: `an_${Date.now()}`,
    aiProvider: resolved.provider,
    aiKeyName: resolved.keyName,
    model: resolved.model,
    analyzedAt: new Date().toISOString(),
    triggeredBy: String(userId),
    promptId: promptDoc?._id ? String(promptDoc._id) : null,
    promptName: promptDoc?.name || 'Mặc định (fallback)',
    promptVersion: promptDoc?.version || 1,
    promptSnapshot: rendered, // lưu toàn bộ prompt đã render
    status: parsed ? 'ok' : 'parse_failed',
    result: parsed || null,
    rawText: parsed ? null : String(callResult.text || '').slice(0, 5000),
    latencyMs,
  };

  return entry;
}

module.exports = {
  analyze,
  resolvePrompt,
  renderPrompt,
  buildQuizForAI,
  buildAnswerForAI,
  buildResultForAI,
  safeParseAnalysis,
  SUBMISSION_PATH_TMPL,
};