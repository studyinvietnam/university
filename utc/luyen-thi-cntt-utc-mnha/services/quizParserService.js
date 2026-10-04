// services/quizParserService.js
// Parse / serialize / validate text đề trắc nghiệm theo format trong README.

const cfg = require('../config/quizConfig');

const RE = {
  QUESTION: /^- /,
  OPTION: /^\+\)/,
  ANSWER: /^=>/,
  EXPLANATION: /^\+\+\)/,
  IMAGE_LINE: /^https?:\/\/\S+$/,
  NUMBER: /^[-+]?\d+([.,]\d+)?$/,
};

function stripFences(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\s+$/, '');
  // bỏ ``` mở đầu nhưng GIỮ nguyên số dòng (thay bằng dòng trống) để báo lỗi "dòng N" đúng
  s = s.replace(/^\s*```[a-zA-Z]*[ \t]*(\r?\n|$)/, (m) => m.replace(/[^\r\n]/g, ''));
  s = s.replace(/(\r?\n)?[ \t]*```\s*$/, '');
  // bỏ dấu ngoặc kép bao quanh cả khối
  const t = s.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    s = t.slice(1, -1);
  }
  return s;
}

function unescapeLeading(line) {
  // "\\- ..." => "- ...", "\\+) ..." => "+) ...", ...
  return line.replace(/^\\(- |\+\)|=>|\+\+\))/, (m) => m.slice(1));
}

// Dòng nối (câu hỏi / giải thích nhiều dòng): nếu bắt đầu bằng ký tự thoát "\\" thì bỏ nó, còn lại giữ nguyên
function continuationLine(raw, keepIndent) {
  const t = raw.trimStart();
  if (t.startsWith('\\')) return unescapeLeading(t);
  return keepIndent ? raw : t;
}
// Khi serialize: dòng nối mà trông giống ký hiệu (- , +) , => , ++) ) phải thêm "\\" phía trước
function escapeContinuation(line) {
  return /^\s*(- |\+\+\)|\+\)|=>)/.test(line) ? '\\' + line.trimStart() : line;
}

function isImageUrl(line) {
  if (!RE.IMAGE_LINE.test(line)) return false;
  try {
    const u = new URL(line);
    if (u.protocol !== 'https:') return false;
    return cfg.ALLOWED_IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

function normalizeFillValue(v) {
  if (v == null) return '';
  return String(v).trim().replace(/\s+/g, ' ');
}

function isNumberLike(s) {
  return RE.NUMBER.test(String(s).trim());
}

function parseNumber(s) {
  // 3,10 => 3.1
  return Number(String(s).trim().replace(',', '.'));
}

/**
 * Parse một phần (mcq | tf | fill)
 * @returns { questions: [...], note?: string, errors: [{line:number, msg:string}] }
 */
function parsePart(rawText, part) {
  const errors = [];
  const lines = stripFences(rawText).split(/\r?\n/);
  let note = null;

  const questions = [];
  let cur = null;         // câu đang mở
  let mode = null;        // 'question' | 'options' | 'answer' | 'explanation' | 'note'
  let sawAnyQuestion = false;
  let explanationIsHtml = false;

  const pushCur = () => {
    if (!cur) return;
    // validate câu
    const q = cur;
    q.text = (q.text || '').trim();
    q.explanationHtml = (q.explanationHtml || '').trim() || null;

    if (!q.text) errors.push({ line: q.startLine, msg: 'Câu hỏi rỗng' });

    if (part === 'mcq') {
      q.options = (q.options || []).map((o, i) => ({ key: String.fromCharCode(65 + i), text: o.text }));
      q.correct = (q.correctIdx || []).filter((i) => i < q.options.length).map((i) => q.options[i].key);
      q.multi = q.correct.length > 1;
      delete q.correctIdx;
      if (!q.options || q.options.length < cfg.LIMITS.MIN_OPTIONS_MCQ) {
        errors.push({ line: q.startLine, msg: `Câu ${q.text.slice(0, 40) || ''}: cần ít nhất ${cfg.LIMITS.MIN_OPTIONS_MCQ} đáp án` });
      }
      if (q.options && q.options.length > cfg.LIMITS.MAX_OPTIONS_PER_QUESTION) {
        errors.push({ line: q.startLine, msg: `Câu có hơn ${cfg.LIMITS.MAX_OPTIONS_PER_QUESTION} đáp án` });
      }
      // trùng đáp án
      if (q.options) {
        const seen = new Set();
        for (const o of q.options) {
          const k = (o.text || '').trim().toLowerCase();
          if (seen.has(k)) errors.push({ line: q.startLine, msg: `Đáp án trùng: "${o.text}"` });
          seen.add(k);
        }
      }
      if (!q.correct || q.correct.length === 0) {
        errors.push({ line: q.startLine, msg: 'Thiếu dòng "=> đáp án đúng"' });
      }
    } else if (part === 'tf') {
      if (typeof q.correct !== 'boolean') errors.push({ line: q.startLine, msg: 'Thiếu "=> Đúng" hoặc "=> Sai"' });
    } else if (part === 'fill') {
      if (!q.answers || q.answers.length === 0) errors.push({ line: q.startLine, msg: 'Thiếu đáp án điền' });
    }

    if (q.text.length > cfg.LIMITS.MAX_QUESTION_LEN) {
      errors.push({ line: q.startLine, msg: `Câu hỏi quá dài (>${cfg.LIMITS.MAX_QUESTION_LEN} ký tự)` });
    }
    if (q.explanationHtml && q.explanationHtml.length > cfg.LIMITS.MAX_EXPLANATION_LEN) {
      errors.push({ line: q.startLine, msg: `Giải thích quá dài (>${cfg.LIMITS.MAX_EXPLANATION_LEN} ký tự)` });
    }

    questions.push(q);
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trim = raw.trim();
    if (!trim) continue;

    // Note ở đầu khối (chỉ fill), trước câu đầu tiên
    if (!sawAnyQuestion && part === 'fill' && !RE.QUESTION.test(trim) && !RE.OPTION.test(trim) && !RE.ANSWER.test(trim) && !RE.EXPLANATION.test(trim) && !RE.IMAGE_LINE.test(trim)) {
      note = note ? note + '\n' + raw : raw;
      continue;
    }

    // Câu hỏi mới
    if (RE.QUESTION.test(trim)) {
      pushCur();
      sawAnyQuestion = true;
      const text = unescapeLeading(trim.slice(2)).trim();
      cur = {
        startLine: lineNo,
        text,
        image: null,
        options: part === 'mcq' ? [] : undefined,
        correct: part === 'mcq' ? [] : undefined,
        correctIdx: part === 'mcq' ? [] : undefined,
        answers: part === 'fill' ? [] : undefined,
        explanationHtml: null,
        multi: false,
      };
      mode = 'question';
      explanationIsHtml = false;
      continue;
    }

    if (!cur) {
      // dòng lạc trước câu đầu tiên
      if (!sawAnyQuestion) continue; // ignore header rác
      errors.push({ line: lineNo, msg: 'Dòng không thuộc câu nào' });
      continue;
    }

    // Explanation phải check trước Option
    if (RE.EXPLANATION.test(trim)) {
      const body = unescapeLeading(trim.slice(3)).trim();
      if (!cur.explanationHtml) cur.explanationHtml = body;
      else cur.explanationHtml += '\n' + body;
      mode = 'explanation';
      explanationIsHtml = true;
      continue;
    }

    // Option (chỉ mcq)
    if (RE.OPTION.test(trim)) {
      if (part !== 'mcq') {
        errors.push({ line: lineNo, msg: 'Phần này không có đáp án "+)"' });
        continue;
      }
      const body = unescapeLeading(trim.slice(2)).trim();
      cur.options.push({ text: body });
      mode = 'options';
      continue;
    }

    // Answer
    if (RE.ANSWER.test(trim)) {
      const body = unescapeLeading(trim.replace(/^=>\s?/, '')).trim();
      mode = 'answer';
      if (part === 'mcq') {
        // chấp nhận "B", "2", "A, C", hoặc chép nguyên văn
        const correctKeys = [];
        const lowBody = body.toLowerCase();
        const wholeIdx = cur.options.findIndex((o) => o.text.trim().toLowerCase() === lowBody);
        const isSingleToken = /^[A-Z]$/i.test(body) || /^\d+$/.test(body);
        const tokens = (wholeIdx >= 0 && !isSingleToken) ? [] : body.split(',').map((s) => s.trim()).filter(Boolean);
        if (wholeIdx >= 0 && !isSingleToken) correctKeys.push(wholeIdx);
        for (const tok of tokens) {
          let matched = null;
          // chữ cái
          if (/^[A-Z]$/i.test(tok)) {
            const idx = tok.toUpperCase().charCodeAt(0) - 65;
            if (idx >= 0 && idx < cur.options.length) matched = idx;
          }
          // số thứ tự 1-based
          if (matched === null && /^\d+$/.test(tok)) {
            const idx = Number(tok) - 1;
            if (idx >= 0 && idx < cur.options.length) matched = idx;
          }
          // chép nguyên văn
          if (matched === null) {
            const low = tok.toLowerCase();
            const idx = cur.options.findIndex((o) => o.text.trim().toLowerCase() === low);
            if (idx >= 0) matched = idx;
          }
          if (matched === null) {
            errors.push({ line: lineNo, msg: `Đáp án "${tok}" không khớp đáp án nào` });
          } else {
            correctKeys.push(matched);
          }
        }
        cur.correctIdx = Array.from(new Set(correctKeys)).sort((a, b) => a - b);   // key A,B,C gán ở pushCur
      } else if (part === 'tf') {
        const low = body.toLowerCase();
        if (['đúng', 'đ', 'true', 't', '1'].includes(low)) cur.correct = true;
        else if (['sai', 's', 'false', 'f', '0'].includes(low)) cur.correct = false;
        else errors.push({ line: lineNo, msg: `Giá trị đúng/sai không hợp lệ: "${body}"` });
      } else if (part === 'fill') {
        const answers = body.split('|').map((s) => normalizeFillValue(s)).filter(Boolean);
        if (answers.length === 0) errors.push({ line: lineNo, msg: 'Đáp án điền rỗng' });
        cur.answers = answers;
      }
      continue;
    }

    // Ảnh — chỉ hợp lệ ngay sau câu hỏi, trước đáp án / => / +)
    if (RE.IMAGE_LINE.test(trim) && mode !== 'explanation') {
      if (!isImageUrl(trim)) {
        errors.push({ line: lineNo, msg: 'Ảnh phải là https và host không nằm trong allowlist' });
        continue;
      }
      if (mode === 'question' && !cur.image) {
        cur.image = trim;
        continue;
      }
      errors.push({ line: lineNo, msg: 'Ảnh phải đặt ngay sau câu hỏi, trước đáp án' });
      continue;
    }

    // Nối dòng vào mục đang mở
    if (mode === 'question') cur.text += '\n' + continuationLine(raw, false);
    else if (mode === 'explanation') {
      cur.explanationHtml = (cur.explanationHtml || '') + '\n' + continuationLine(raw, true);
    } else if (mode === 'options') {
      // nối vào option cuối
      if (cur.options && cur.options.length > 0) {
        const last = cur.options[cur.options.length - 1];
        if (typeof last === 'object') last.text += ' ' + trim;
      }
    } else {
      errors.push({ line: lineNo, msg: 'Dòng không thuộc mục nào' });
    }
  }
  pushCur();

  if (questions.length > cfg.LIMITS.MAX_QUESTIONS_PER_PART) {
    errors.push({ line: 0, msg: `Vượt ${cfg.LIMITS.MAX_QUESTIONS_PER_PART} câu` });
  }

  // Gán id
  questions.forEach((q, i) => { q.id = `${part}-${i + 1}`; });

  return { questions, note: note || null, errors };
}

function serializePart(questions, part, note) {
  const out = [];
  if (part === 'fill' && note) out.push(note);
  for (const q of questions || []) {
    out.push('- ' + (q.text || '').split('\n').map((l, i) => (i === 0 ? l : escapeContinuation(l))).join('\n'));
    if (q.image) out.push(q.image);
    if (part === 'mcq') {
      for (const o of q.options || []) out.push('+)' + String(o.text).replace(/\n/g, ' '));
      out.push('=> ' + (q.correct || []).join(', '));
    } else if (part === 'tf') {
      out.push('=> ' + (q.correct ? 'Đúng' : 'Sai'));
    } else {
      out.push('=> ' + (q.answers || []).join(' | '));
    }
    if (q.explanationHtml) {
      out.push('++) ' + q.explanationHtml.split('\n').map((l, i) => (i === 0 ? l : escapeContinuation(l))).join('\n'));
    }
  }
  return out.join('\n');
}

function parseAll(input) {
  // input: { mcq, tf, fill } — mỗi cái là text
  const result = { parts: {}, errors: [] };
  for (const part of cfg.PARTS) {
    const raw = input[part] || '';
    if (raw.length > cfg.LIMITS.MAX_RAW_TEXT_LEN) {
      result.errors.push({ part, line: 0, msg: `Text vượt ${cfg.LIMITS.MAX_RAW_TEXT_LEN} ký tự` });
      continue;
    }
    const r = parsePart(raw, part);
    if (r.errors.length) {
      for (const e of r.errors) result.errors.push({ part, ...e });
    }
    if (r.questions.length > 0) {
      result.parts[part] = {
        questions: r.questions,
        ...(part === 'fill' && r.note ? { note: r.note } : {}),
      };
    }
  }
  return result;
}

module.exports = {
  parsePart,
  serializePart,
  parseAll,
  stripFences,
  isNumberLike,
  parseNumber,
  normalizeFillValue,
};