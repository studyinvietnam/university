// backend/src/models/AIEvaluation.js
const mongoose = require('mongoose');

const aiEvaluationSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  score: { type: Number, min: 0, max: 10 },
  correctness: { type: Number, min: 0, max: 10 },
  quality: { type: Number, min: 0, max: 10 },
  performance: { type: Number, min: 0, max: 10 },
  edgeCases: { type: Number, min: 0, max: 10 },
  customRequirements: { type: Array, default: [] }, // [ { requirementId, passed, comment } ]
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  improvements: { type: [String], default: [] },
  overallComment: { type: String, default: '' },
  provider: { type: String, enum: ['gemini', 'openai', 'deepseek', 'claude'], default: 'gemini' },
  model: { type: String, default: '' },
  gradingSource: { type: String, enum: ['github', 'default'], default: 'default' },
  gradingVersion: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AIEvaluation', aiEvaluationSchema);