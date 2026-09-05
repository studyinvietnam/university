// backend/src/controllers/submissionController.js

const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const AIEvaluation = require('../models/AIEvaluation');

const codeRunnerService = require('../services/codeRunner/codeRunnerService');
const githubService = require('../services/githubService');
const gradingService = require('../services/gradingService');
const aiService = require('../services/ai/aiService');

const { v4: uuidv4 } = require('uuid');

// ============================================================
// SUBMIT
// ============================================================
exports.submit = async (req, res) => {
    try {
        const { problemId, code, input, language, aiProvider, aiModel } = req.body;

        if (!problemId || !code || !input || !language) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userId = req.userId;
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        const selectedProvider = aiProvider || process.env.AI_PROVIDER || 'gemini';
        const selectedModel = aiModel || process.env.AI_MODEL || null;
        console.log(`🤖 Submit với AI Provider: ${selectedProvider}, Model: ${selectedModel || 'default'}`);

        // 1. Chạy code
        const runResult = await codeRunnerService.runCode({
            code,
            input,
            language,
            timeout: Number(process.env.DOCKER_EXECUTION_TIMEOUT) || 5000
        });

        const output = runResult.output || '';
        const error = runResult.error || null;

        // 2. Lấy tiêu chí chấm
        const gradingCriteria = await gradingService.getGradingCriteria(problemId);

        // 3. Đánh giá bằng AI với provider và model được chọn
        let aiReview = null;
        if (!error) {
            console.log(`⏳ Đang gọi AI (${selectedProvider} / ${selectedModel || 'default'}) để đánh giá...`);
            aiReview = await aiService.reviewCode({
                problem: problem.toObject(),
                code,
                input,
                output,
                language,
                gradingCriteria,
                gradingRequirements: problem.gradingRequirements || '',
                providerName: selectedProvider,
                modelName: selectedModel
            });
            console.log(`✅ AI (${selectedProvider}) đã đánh giá xong. Điểm: ${aiReview.score}`);
        }

        // 4. Lưu lên GitHub
        const submissionId = uuidv4();
        const submissionPath = `submissions/${userId}/${problemId}/submission-${submissionId}/`;
        const fileExtension = language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'py';

        await githubService.saveFile(`${submissionPath}/main.${fileExtension}`, code);
        await githubService.saveFile(`${submissionPath}/input.txt`, input);
        await githubService.saveFile(`${submissionPath}/output.txt`, output);

        if (aiReview) {
            await githubService.saveFile(`${submissionPath}/review/review.json`, JSON.stringify(aiReview, null, 2));
            await githubService.saveFile(`${submissionPath}/review/review.md`, aiReview.overallComment || '');
        }

        // 5. Lưu metadata
        const submission = new Submission({
            userId,
            problemId,
            submissionNumber: await Submission.countDocuments({ userId, problemId }) + 1,
            version: null,
            githubPath: submissionPath,
            language,
            score: aiReview ? aiReview.score : 0,
            status: error ? 'error' : (aiReview ? 'graded' : 'pending'),
            aiEvaluationId: null,
            createdAt: new Date()
        });
        await submission.save();

        // 6. Lưu AI evaluation
        if (aiReview) {
            const evaluation = new AIEvaluation({
                submissionId: submission._id,
                problemId,
                gradingSource: gradingCriteria.source || 'default',
                gradingVersion: gradingCriteria.version || null,
                score: aiReview.score,
                status: 'completed',
                details: aiReview,
                createdAt: new Date()
            });
            await evaluation.save();
            submission.aiEvaluationId = evaluation._id;
            await submission.save();
        }

        res.json({
            submissionId: submission._id,
            score: aiReview ? aiReview.score : 0,
            output,
            error,
            review: aiReview || null
        });

    } catch (err) {
        console.error('❌ Submit error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// GET ALL SUBMISSIONS
// ============================================================
exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.userId })
            .select('-__v')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// GET SUBMISSION BY ID
// ============================================================
exports.getSubmissionById = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const path = submission.githubPath;
        const files = await githubService.listFiles(path);
        const codeFile = files.find(f => /^main\./.test(f.name));
        const inputFile = files.find(f => f.name === 'input.txt');
        const outputFile = files.find(f => f.name === 'output.txt');

        let code = '', input = '', output = '';
        if (codeFile) code = await githubService.readFile(`${path}/${codeFile.name}`);
        if (inputFile) input = await githubService.readFile(`${path}/${inputFile.name}`);
        if (outputFile) output = await githubService.readFile(`${path}/${outputFile.name}`);

        res.json({ ...submission.toObject(), code, input, output });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};