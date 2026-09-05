// backend/src/controllers/codeController.js

const codeRunnerService = require('../services/codeRunner/codeRunnerService');
const githubService = require('../services/githubService');
const { InteractiveRunner } = require('../services/codeRunner/codeRunnerInteractive');

const Execution = require('../models/Execution');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { v4: uuidv4 } = require('uuid');

// Lưu các interactive session
const interactiveSessions = new Map();

// ============================================================
// FREOPEN AUTO-DETECT
// Tự tìm các lời gọi freopen("ten_file.txt", "r"/"w", stdin/stdout) trong code
// để tự lấy file input từ GitHub, hoặc tự lưu file output lên GitHub sau khi chạy.
// ============================================================
function extractFreopenFiles(code = '') {
    const inputFileNames = new Set();
    const outputFileNames = new Set();
    const regex = /freopen\s*\(\s*"([^"]+)"\s*,\s*"([rwa]+)"\s*,\s*std(in|out)\s*\)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
        const [, fileName, , stream] = match;
        if (stream === 'in') inputFileNames.add(fileName);
        else outputFileNames.add(fileName);
    }
    return { inputFileNames: [...inputFileNames], outputFileNames: [...outputFileNames] };
}

// Đường dẫn workspace trên GitHub, tách riêng theo từng userId + problemId
// (đây là chỗ đảm bảo file của tài khoản này không lẫn với tài khoản khác)
function getWorkspacePath(userId, problemId) {
    return `submissions/${userId}/${problemId}/workspace`;
}

// ============================================================
// RUN CODE (thường)
// ============================================================
exports.runCode = async (req, res) => {
    try {
        const { problemId, code, input, language } = req.body;
        console.log('📨 RunCode request:', { problemId, language, codeLength: code?.length });

        if (!problemId) return res.status(400).json({ error: 'Missing problemId' });
        if (!code) return res.status(400).json({ error: 'Missing code' });
        if (!language) return res.status(400).json({ error: 'Missing language' });
        if (input === undefined) return res.status(400).json({ error: 'Missing input' });

        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ error: 'Problem not found' });
        if (!problem.languages.includes(language)) {
            return res.status(400).json({ error: `Language ${language} not supported` });
        }

        // 🔍 Tự phát hiện freopen("...", "r", stdin) / freopen("...", "w", stdout) trong code
        const { inputFileNames, outputFileNames } = extractFreopenFiles(code);
        const workspacePath = getWorkspacePath(req.userId, problemId);

        // 📥 Với mỗi file freopen đọc (stdin), thử lấy nội dung đã lưu trên GitHub của
        // đúng tài khoản (req.userId) + đúng bài (problemId) này. File nào không tìm
        // thấy thì bỏ qua (không chặn việc chạy code).
        const extraFiles = [];
        const loadedInputFiles = [];
        for (const fileName of inputFileNames) {
            try {
                const content = await githubService.readFile(`${workspacePath}/${fileName}`);
                if (content !== undefined && content !== null) {
                    extraFiles.push({ name: fileName, content });
                    loadedInputFiles.push(fileName);
                }
            } catch (e) {
                console.warn(`⚠️ Không tìm thấy file input "${fileName}" trên GitHub (freopen), bỏ qua:`, e.message);
            }
        }

        const result = await codeRunnerService.runCode({
            language,
            code,
            input,
            timeout: Number(process.env.DOCKER_EXECUTION_TIMEOUT) || 5000,
            extraFiles,
            outputFiles: outputFileNames,
        });

        // 💾 Với mỗi file freopen ghi ra (stdout) mà chương trình vừa tạo, tự lưu lên
        // GitHub đúng workspace của tài khoản này (không lưu chung, không ghi đè tài khoản khác).
        const savedOutputFiles = [];
        if (result.generatedFiles && result.generatedFiles.length) {
            for (const file of result.generatedFiles) {
                try {
                    await githubService.saveFile(`${workspacePath}/${file.name}`, file.content);
                    savedOutputFiles.push(file.name);
                } catch (e) {
                    console.error(`❌ Lỗi lưu file output "${file.name}" lên GitHub:`, e.message);
                }
            }
        }

        const execution = new Execution({
            userId: req.userId,
            problemId,
            codeFile: code,
            input,
            output: result.output || '',
            language,
            status: result.error ? 'error' : 'success',
            executionTime: result.executionTime || 0,
            memoryUsage: result.memoryUsage || 0,
            createdAt: new Date()
        });
        await execution.save();

        res.json({
            output: result.output || '',
            error: result.error || null,
            executionId: execution._id,
            executionTime: result.executionTime || 0,
            loadedInputFiles,   // 👈 các file freopen đã tự lấy từ GitHub
            savedOutputFiles,   // 👈 các file freopen đã tự lưu lên GitHub
        });

    } catch (err) {
        console.error('❌ RunCode error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERACTIVE - START
// ============================================================
exports.startInteractive = async (req, res) => {
    try {
        const { problemId, code, language } = req.body;

        if (!problemId) return res.status(400).json({ error: 'Missing problemId' });
        if (!code) return res.status(400).json({ error: 'Missing code' });
        if (!language) return res.status(400).json({ error: 'Missing language' });

        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ error: 'Problem not found' });
        if (!problem.languages.includes(language)) {
            return res.status(400).json({ error: `Language ${language} not supported` });
        }

        const runner = new InteractiveRunner();
        const sessionId = uuidv4();

        interactiveSessions.set(sessionId, {
            runner,
            userId: req.userId,
            problemId,
            language,
            createdAt: Date.now(),
        });

        await runner.start({ language, code });

        res.json({
            sessionId,
            message: 'Interactive session started',
        });

    } catch (err) {
        console.error('❌ startInteractive error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERACTIVE - SEND INPUT
// ============================================================
exports.sendInteractiveInput = (req, res) => {
    try {
        const { sessionId, input } = req.body;
        const session = interactiveSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        session.runner.sendInput(input);
        res.json({ success: true });

    } catch (err) {
        console.error('❌ sendInteractiveInput error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERACTIVE - KILL
// ============================================================
exports.killInteractive = (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = interactiveSessions.get(sessionId);

        if (session) {
            session.runner.kill();
            interactiveSessions.delete(sessionId);
        }

        res.json({ success: true });

    } catch (err) {
        console.error('❌ killInteractive error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERACTIVE - GET STATUS
// ============================================================
exports.getInteractiveStatus = (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = interactiveSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            isRunning: session.runner.isRunning,
            createdAt: session.createdAt,
        });

    } catch (err) {
        console.error('❌ getInteractiveStatus error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERACTIVE - GET OUTPUT (polling fallback)
// ============================================================
exports.getInteractiveOutput = (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = interactiveSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            isRunning: session.runner.isRunning,
            output: '',
            exit: session.runner.isRunning ? null : 0,
        });

    } catch (err) {
        console.error('❌ getInteractiveOutput error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// SAVE DRAFT
// ============================================================
exports.saveDraft = async (req, res) => {
    try {
        const { problemId, code, input, language } = req.body;

        if (!problemId) {
            return res.status(400).json({ error: 'problemId required' });
        }

        const userId = req.userId;
        const draftPath = `submissions/${userId}/${problemId}/drafts`;
        const fileExtension = language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'py';

        if (code !== undefined) {
            await githubService.saveFile(`${draftPath}/main.${fileExtension}`, code);
        }
        if (input !== undefined) {
            await githubService.saveFile(`${draftPath}/input.txt`, input);
        }

        res.json({ message: 'Draft saved successfully' });

    } catch (err) {
        console.error('❌ saveDraft error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// CREATE VERSION
// ============================================================
exports.createVersion = async (req, res) => {
    try {
        const { problemId, code, input, language, score, status } = req.body;

        if (!problemId || !code || !language) {
            return res.status(400).json({ error: 'problemId, code and language are required' });
        }

        const userId = req.userId;
        const versionNumber = await Submission.countDocuments({ userId, problemId }) + 1;
        const versionPath = `submissions/${userId}/${problemId}/version-${Date.now()}`;
        const fileExtension = language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'py';

        await githubService.saveFile(`${versionPath}/main.${fileExtension}`, code);
        if (input !== undefined) {
            await githubService.saveFile(`${versionPath}/input.txt`, input);
        }

        const submission = new Submission({
            userId,
            problemId,
            submissionNumber: versionNumber,
            version: versionNumber,
            githubPath: versionPath,
            language,
            score: score || 0,
            status: status || 'pending',
            createdAt: new Date()
        });
        await submission.save();

        res.status(201).json({
            message: 'Version created successfully',
            version: submission
        });

    } catch (err) {
        console.error('❌ createVersion error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// GET VERSIONS
// ============================================================
exports.getVersions = async (req, res) => {
    try {
        const problemId = req.params.problemId;
        const userId = req.userId;

        const submissions = await Submission.find({ userId, problemId })
            .select('version githubPath language score status createdAt')
            .sort({ createdAt: -1 });

        res.json(submissions);

    } catch (err) {
        console.error('❌ getVersions error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// GET VERSION BY ID
// ============================================================
exports.getVersionById = async (req, res) => {
    try {
        const versionId = req.params.id;
        const submission = await Submission.findById(versionId);

        if (!submission) {
            return res.status(404).json({ error: 'Version not found' });
        }

        if (submission.userId && submission.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const githubPath = submission.githubPath;
        if (!githubPath) {
            return res.json({ ...submission.toObject(), code: '', input: '', output: '' });
        }

        const files = await githubService.listFiles(githubPath);
        const codeFile = files.find(f => /^main\./.test(f.name));
        const inputFile = files.find(f => f.name === 'input.txt');
        const outputFile = files.find(f => f.name === 'output.txt');

        let code = '', input = '', output = '';
        if (codeFile) code = await githubService.readFile(`${githubPath}/${codeFile.name}`);
        if (inputFile) input = await githubService.readFile(`${githubPath}/${inputFile.name}`);
        if (outputFile) output = await githubService.readFile(`${githubPath}/${outputFile.name}`);

        res.json({ ...submission.toObject(), code, input, output });

    } catch (err) {
        console.error('❌ getVersionById error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// RESTORE VERSION
// ============================================================
exports.restoreVersion = async (req, res) => {
    try {
        const versionId = req.params.id;
        const submission = await Submission.findById(versionId);

        if (!submission) {
            return res.status(404).json({ error: 'Version not found' });
        }

        if (submission.userId && submission.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const githubPath = submission.githubPath;
        const files = await githubService.listFiles(githubPath);
        const codeFile = files.find(f => /^main\./.test(f.name));
        const inputFile = files.find(f => f.name === 'input.txt');
        const outputFile = files.find(f => f.name === 'output.txt');

        let code = '', input = '', output = '';
        if (codeFile) code = await githubService.readFile(`${githubPath}/${codeFile.name}`);
        if (inputFile) input = await githubService.readFile(`${githubPath}/${inputFile.name}`);
        if (outputFile) output = await githubService.readFile(`${githubPath}/${outputFile.name}`);

        res.json({ code, input, output, language: submission.language });

    } catch (err) {
        console.error('❌ restoreVersion error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// FILE MANAGEMENT
// ============================================================
exports.createFile = async (req, res) => {
    try {
        const { problemId, fileName, content, language } = req.body;

        if (!problemId || !fileName) {
            return res.status(400).json({ error: 'problemId and fileName are required' });
        }

        const userId = req.userId;
        const filePath = `submissions/${userId}/${problemId}/workspace/${fileName}`;
        await githubService.saveFile(filePath, content || '');

        res.status(201).json({
            message: 'File created successfully',
            fileName,
            language: language || null,
            path: filePath
        });

    } catch (err) {
        console.error('❌ createFile error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getFilesByProblem = async (req, res) => {
    try {
        const problemId = req.params.problemId;
        const userId = req.userId;
        const workspacePath = `submissions/${userId}/${problemId}/workspace`;
        const files = await githubService.listFiles(workspacePath);
        res.json(files);

    } catch (err) {
        console.error('❌ getFilesByProblem error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getFileContent = async (req, res) => {
    try {
        const { problemId, fileName } = req.params;
        const userId = req.userId;
        const filePath = `submissions/${userId}/${problemId}/workspace/${fileName}`;
        const content = await githubService.readFile(filePath);
        res.json({ fileName, content: content || '' });

    } catch (err) {
        console.error('❌ getFileContent error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateFileContent = async (req, res) => {
    try {
        const { problemId, fileName, content } = req.body;

        if (!problemId || !fileName) {
            return res.status(400).json({ error: 'problemId and fileName are required' });
        }

        const userId = req.userId;
        const filePath = `submissions/${userId}/${problemId}/workspace/${fileName}`;
        await githubService.saveFile(filePath, content || '');

        res.json({ message: 'File updated successfully', fileName });

    } catch (err) {
        console.error('❌ updateFileContent error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const { problemId, fileName } = req.body;

        if (!problemId || !fileName) {
            return res.status(400).json({ error: 'problemId and fileName are required' });
        }

        const userId = req.userId;
        const filePath = `submissions/${userId}/${problemId}/workspace/${fileName}`;

        if (typeof githubService.deleteFile === 'function') {
            await githubService.deleteFile(filePath);
        } else {
            await githubService.saveFile(filePath, '');
        }

        res.json({ message: 'File deleted successfully', fileName });

    } catch (err) {
        console.error('❌ deleteFile error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.renameFile = async (req, res) => {
    try {
        const { problemId, oldFileName, newFileName } = req.body;

        if (!problemId || !oldFileName || !newFileName) {
            return res.status(400).json({ error: 'problemId, oldFileName and newFileName are required' });
        }

        const userId = req.userId;
        const oldPath = `submissions/${userId}/${problemId}/workspace/${oldFileName}`;
        const newPath = `submissions/${userId}/${problemId}/workspace/${newFileName}`;

        const content = await githubService.readFile(oldPath);
        await githubService.saveFile(newPath, content || '');

        if (typeof githubService.deleteFile === 'function') {
            await githubService.deleteFile(oldPath);
        } else {
            await githubService.saveFile(oldPath, '');
        }

        res.json({ message: 'File renamed successfully', oldFileName, newFileName });

    } catch (err) {
        console.error('❌ renameFile error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getRenameHistory = async (req, res) => {
    res.json([]);
};

// ============================================================
// EXECUTION HISTORY
// ============================================================
exports.getExecutionsByProblem = async (req, res) => {
    try {
        const problemId = req.params.problemId;
        const executions = await Execution.find({ userId: req.userId, problemId })
            .select('-__v')
            .sort({ createdAt: -1 });
        res.json(executions);

    } catch (err) {
        console.error('❌ getExecutionsByProblem error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getExecutionById = async (req, res) => {
    try {
        const execution = await Execution.findById(req.params.id).select('-__v');

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        if (execution.userId && execution.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(execution);

    } catch (err) {
        console.error('❌ getExecutionById error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// CLEANUP STALE SESSIONS
// ============================================================
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of interactiveSessions) {
        if (now - session.createdAt > 60000) {
            session.runner.kill();
            interactiveSessions.delete(id);
            console.log(`🧹 Cleaned up stale interactive session: ${id}`);
        }
    }
}, 30000);

// Export interactiveSessions để app.js dùng
exports.getInteractiveSessions = () => interactiveSessions;