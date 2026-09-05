// backend/src/controllers/adminController.js

const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Problem = require('../models/Problem');

const githubService = require('../services/githubService');
const gradingService = require('../services/gradingService');


// ============================================================
// SUBJECT MANAGEMENT
// ============================================================

exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().select('-__v').sort({ createdAt: -1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code required' });
    }
    const subject = new Subject({ name, code, description: description || '', status: status || 'draft' });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================================================
// CHAPTER MANAGEMENT
// ============================================================

exports.getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find().select('-__v').sort({ order: 1 });
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChapterById = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id).select('-__v');
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createChapter = async (req, res) => {
  try {
    const { subjectId, name, order, status } = req.body;
    if (!subjectId || !name) {
      return res.status(400).json({ error: 'subjectId and name required' });
    }
    const chapter = new Chapter({ subjectId, name, order: order || 0, status: status || 'draft' });
    await chapter.save();
    res.status(201).json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json({ message: 'Chapter deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================================================
// PROBLEM MANAGEMENT
// ============================================================

exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().select('-__v').sort({ createdAt: -1 });
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).select('-__v');
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProblem = async (req, res) => {
  try {
    const {
      subjectId, chapterId, name, code, statement, inputSample, outputSample,
      languages, score, status, gradingRequirements
    } = req.body;

    if (!subjectId || !chapterId || !name || !code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const problem = new Problem({
      subjectId, chapterId, name, code,
      statement: statement || '',
      exampleInput: inputSample || '',
      exampleOutput: outputSample || '',
      languages: languages || ['cpp'],
      score: score || 10,
      status: status || 'draft',
      gradingRequirements: gradingRequirements || '',
    });

    await problem.save();
    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      req.body, // đã bao gồm gradingRequirements nếu có
      { new: true, runValidators: true }
    );
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    res.json({ message: 'Problem deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================================================
// GRADING CRITERIA
// ============================================================

exports.getGrading = async (req, res) => {
  try {
    const grading = await gradingService.getGradingCriteria(req.params.problemId);
    res.json(grading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGrading = async (req, res) => {
  try {
    await gradingService.updateGradingCriteria(req.params.problemId, req.body);
    res.json({ message: 'Grading updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGrading = async (req, res) => {
  try {
    await gradingService.disableGradingCriteria(req.params.problemId);
    res.json({ message: 'Grading disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
