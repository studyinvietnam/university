// backend/src/models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },         // "Lập trình C"
  code: { type: String, required: true, unique: true }, // "C101"
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  // Số lượng bài tập có thể tính từ aggregation, không lưu trực tiếp
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);