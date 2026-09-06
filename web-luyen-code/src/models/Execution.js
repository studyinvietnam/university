// backend/src/models/Execution.js
const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  codeFile: { type: String, required: true }, // Lưu source code dạng text
  input: { type: String, default: '' },
  output: { type: String, default: '' },
  language: { type: String, enum: ['c', 'cpp', 'java', 'python'], required: true },
  status: { type: String, enum: ['success', 'error', 'pending'], default: 'pending' },
  executionTime: { type: Number, default: 0 },
  memoryUsage: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Execution', executionSchema);