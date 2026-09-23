const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
    model:     String,
    score:     Number,
    latencyMs: Number,
    feedback:  String,
    error:     String,
}, { _id: false });

const ModelComparisonSchema = new mongoose.Schema({
    promptId:       { type: mongoose.Schema.Types.ObjectId, ref: "GradingPrompt", default: null },
    promptSnapshot: { type: String, default: null },
    topic:          { type: String, default: null },
    essay:          { type: String, required: true },
    studentName:    { type: String, default: null },
    results:        { type: [ResultSchema], default: [] },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("ModelComparison", ModelComparisonSchema);