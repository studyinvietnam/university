// backend/src/models/Submission.js
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  submissionNumber: { type: Number, required: true }, // auto increment per user/problem
  version: { type: Number, default: 1 },              // version lúc submit
  githubPath: { type: String, required: true },       // đường dẫn trên GitHub
  language: { type: String, enum: ['c', 'cpp', 'java', 'python'], required: true },
  score: { type: Number, min: 0, max: 10, default: 0 },
  status: { type: String, enum: ['pending', 'running', 'success', 'error'], default: 'pending' },
  aiEvaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIEvaluation' },
  gradingSource: { type: String, enum: ['github', 'default'], default: 'default' },
  gradingVersion: { type: String, default: '' }, // commit sha hoặc hash
}, { timestamps: true });

// Tạo index để tăng submissionNumber
submissionSchema.index({ userId: 1, problemId: 1, submissionNumber: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);