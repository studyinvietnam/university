
// backend/src/controllers/chapterController.js

const Chapter = require('../models/Chapter');
const Problem = require('../models/Problem');

// Lấy tất cả bài tập của một chương
exports.getProblemsByChapter = async (req, res) => {
  try {
    const chapterId = req.params.id;

    const chapter = await Chapter.findById(chapterId);

    if (!chapter) {
      return res.status(404).json({
        error: 'Chapter not found'
      });
    }

    const problems = await Problem.find({ chapterId })
      .select('-__v')
      .sort({ order: 1 });

    res.json(problems);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

