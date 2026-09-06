// backend/src/controllers/subjectController.js

const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Problem = require('../models/Problem');

// Lấy tất cả môn học (chỉ lấy status: 'published')
exports.getAllSubjects = async (req, res) => {
  try {
    // Đảm bảo filter theo status: 'published'
    const subjects = await Subject.find({ status: 'published' })
      .select('-__v')
      .lean();

    // Tính số bài tập của từng môn
    const result = await Promise.all(
      subjects.map(async (subject) => {
        const chapters = await Chapter.find({ subjectId: subject._id }).select('_id');
        const chapterIds = chapters.map((ch) => ch._id);
        const problemCount = await Problem.countDocuments({
          chapterId: { $in: chapterIds },
          status: 'published' // Chỉ đếm bài đã publish
        });
        return {
          ...subject,
          problemCount
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('GET ALL SUBJECTS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy chi tiết một môn học
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).select('-__v');
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(subject);
  } catch (err) {
    console.error('GET SUBJECT BY ID ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy các chương của một môn học (chỉ lấy chương published)
exports.getChaptersBySubject = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const chapters = await Chapter.find({
      subjectId,
      status: 'published' // Chỉ lấy chương published
    })
      .select('-__v')
      .sort({ order: 1 });

    // Tính số bài tập của từng chương
    const result = await Promise.all(
      chapters.map(async (chapter) => {
        const problemCount = await Problem.countDocuments({
          chapterId: chapter._id,
          status: 'published' // Chỉ đếm bài published
        });
        return {
          ...chapter.toObject(),
          problemCount
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('GET CHAPTERS BY SUBJECT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};