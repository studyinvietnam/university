// backend/src/models/Problem.js
const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  statement: { type: String, default: '' },
  exampleInput: { type: String, default: '' },
  exampleOutput: { type: String, default: '' },
  languages: { type: [String], default: ['cpp'] },
  score: { type: Number, default: 10 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  gradingRequirements: { type: String, default: '' },
  githubPath: { type: String, default: '' }, // 👈 Thêm trường này
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);