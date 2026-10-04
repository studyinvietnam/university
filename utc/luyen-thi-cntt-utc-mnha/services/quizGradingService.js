// services/quizGradingService.js
// Chấm tự động, KHÔNG dùng AI.

const cfg = require('../config/quizConfig');
const { isNumberLike, parseNumber, normalizeFillValue } = require('./quizParserService');

// Làm tròn 4 chữ số để điểm thập phân không bị lệch kiểu 0.30000000000000004
const r4 = (n) => Math.round(n * 10000) / 10000;

function norm(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function gradeMcq(question, studentAnswer) {
  const correct = question.correct || [];
  const chosen = Array.isArray(studentAnswer) ? studentAnswer : (studentAnswer ? [studentAnswer] : []);
  const chosenSet = new Set(chosen.map(String));
  const correctSet = new Set(correct.map(String));
  if (chosenSet.size !== correctSet.size) return false;
  for (const k of correctSet) if (!chosenSet.has(k)) return false;
  return true;
}

function gradeTf(question, studentAnswer) {
  if (typeof question.correct !== 'boolean') return false;
  return studentAnswer === question.correct;
}

function gradeFill(question, studentAnswer, tolerance) {
  const answers = question.answers || [];
  if (!answers.length || studentAnswer == null) return false;
  const stu = normalizeFillValue(studentAnswer);
  if (!stu) return false;

  for (const a of answers) {
    const an = normalizeFillValue(a);
    if (!an) continue;
    if (isNumberLike(an) && isNumberLike(stu)) {
      const tol = Number(tolerance) || 0;
      // + 1e-9: tránh sai số float (vd |1.1 − 1.0| = 0.10000000000000009 phải ≤ 0.1)
      if (Math.abs(parseNumber(an) - parseNumber(stu)) <= tol + 1e-9) return true;
    } else {
      if (norm(an) === norm(stu)) return true;
    }
  }
  return false;
}

/**
 * @param {object} quiz - đề (đã có đáp án + giải thích)
 * @param {object} answers - { [qid]: string|string[]|boolean }
 * @returns {object} result { score, maxScore, earnedPoints, totalPoints, correctCount, totalCount, parts, items }
 */
function grade(quiz, answers) {
  answers = answers || {};
  const maxScore = Number(quiz.maxScore) || cfg.DEFAULT_MAX_SCORE;
  const parts = quiz.parts || {};

  let earnedPoints = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let totalCount = 0;
  const partStats = {};
  const items = [];

  for (const partKey of cfg.PARTS) {
    const p = parts[partKey];
    if (!p || !Array.isArray(p.questions) || p.questions.length === 0) continue;
    const ppq = Number(p.pointsPerQuestion) || cfg.DEFAULT_POINTS_PER_QUESTION;
    const tolerance = partKey === 'fill' ? Number(p.tolerance) || 0 : 0;

    let pCorrect = 0;
    let pTotal = 0;
    let pEarned = 0;

    for (const q of p.questions) {
      const stu = answers[q.id];
      let ok = false;
      if (partKey === 'mcq') ok = gradeMcq(q, stu);
      else if (partKey === 'tf') ok = gradeTf(q, stu);
      else if (partKey === 'fill') ok = gradeFill(q, stu, tolerance);

      pTotal = r4(pTotal + ppq);
      totalPoints = r4(totalPoints + ppq);
      totalCount += 1;
      if (ok) {
        pCorrect += 1;
        correctCount += 1;
        pEarned = r4(pEarned + ppq);
        earnedPoints = r4(earnedPoints + ppq);
      }

      items.push({
        id: q.id,
        part: partKey,
        correct: ok,
        earned: ok ? ppq : 0,
        points: ppq,
        studentAnswer: stu == null ? null : stu,
        correctAnswer: partKey === 'mcq' ? (q.correct || []) :
                       partKey === 'tf'  ? (typeof q.correct === 'boolean' ? q.correct : null) :
                       (q.answers || []),
      });
    }
    partStats[partKey] = {
      correct: pCorrect,
      total: p.questions.length,
      earned: pEarned,
      points: pTotal,
    };
  }

  const score = totalPoints > 0
    ? Math.round((earnedPoints / totalPoints) * maxScore * 100) / 100
    : 0;

  return {
    score,
    maxScore,
    earnedPoints,
    totalPoints,
    correctCount,
    totalCount,
    parts: partStats,
    items,
  };
}

module.exports = { grade, gradeMcq, gradeTf, gradeFill };