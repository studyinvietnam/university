// backend/src/models/FileRenameHistory.js
const mongoose = require('mongoose');

const fileRenameHistorySchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  versionId: { type: String, required: true }, // version-001 hoặc draft
  fileType: { type: String, enum: ['input', 'output', 'source'], required: true },
  oldName: { type: String, required: true },
  newName: { type: String, required: true },
  renamedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FileRenameHistory', fileRenameHistorySchema);