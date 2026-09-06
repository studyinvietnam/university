// backend/src/controllers/problemController.js
const Problem = require('../models/Problem');
const githubService = require('../services/githubService');

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .select('-__v')
      .lean();

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Mặc định lấy từ MongoDB (fallback nếu GitHub không có / lỗi)
    let statement = problem.statement || '';
    let exampleInput = problem.exampleInput || '';
    let exampleOutput = problem.exampleOutput || '';
    let gradingRequirements = problem.gradingRequirements || '';

    // Cấu trúc thật trên GitHub: problems/<_id>/statement.md, problem.json, examples/input.txt, examples/output.txt
    const basePath = `problems/${problem._id}`;

    try {
      const [statementMd, metaJson, inputTxt, outputTxt] = await Promise.all([
        githubService.readFile(`${basePath}/statement.md`),
        githubService.readFile(`${basePath}/problem.json`),
        githubService.readFile(`${basePath}/examples/input.txt`),
        githubService.readFile(`${basePath}/examples/output.txt`),
      ]);

      if (statementMd !== null) statement = statementMd;
      if (inputTxt !== null) exampleInput = inputTxt;
      if (outputTxt !== null) exampleOutput = outputTxt;

      if (metaJson !== null) {
        const meta = JSON.parse(metaJson);
        if (meta.gradingRequirements) gradingRequirements = meta.gradingRequirements;
      }
    } catch (e) {
      console.warn(`⚠️ Cannot read problem data from GitHub (${basePath}):`, e.message);
      // Fallback: giữ nguyên dữ liệu từ MongoDB
    }

    res.json({
      ...problem,
      statement,
      exampleInput,
      exampleOutput,
      gradingRequirements,
    });
  } catch (err) {
    console.error('GET PROBLEM BY ID ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};
