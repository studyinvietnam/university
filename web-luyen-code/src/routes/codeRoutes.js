// backend/src/routes/codeRoutes.js
const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// ============================================================
// RUN CODE
// ============================================================
router.post('/run', codeController.runCode);

// ============================================================
// DRAFT
// ============================================================
router.put('/draft', codeController.saveDraft);

// ============================================================
// VERSION
// ============================================================
router.post('/versions', codeController.createVersion);
router.get('/versions/:id', codeController.getVersionById);
router.post('/versions/:id/restore', codeController.restoreVersion);

// ============================================================
// FILE MANAGEMENT
// ============================================================
router.post('/files', codeController.createFile);
router.get('/files/:problemId', codeController.getFilesByProblem);
router.get('/files/:problemId/:fileName', codeController.getFileContent);
router.put('/files/update', codeController.updateFileContent);
router.delete('/files/delete', codeController.deleteFile);
router.put('/files/rename', codeController.renameFile);
router.get('/files/:fileId/rename-history', codeController.getRenameHistory);

// ============================================================
// EXECUTION HISTORY
// ============================================================
router.get('/executions/:problemId', codeController.getExecutionsByProblem);
router.get('/executions/:executionId', codeController.getExecutionById);

// ============================================================
// INTERACTIVE MODE
// ============================================================
router.post('/interactive/start', codeController.startInteractive);
router.post('/interactive/input', codeController.sendInteractiveInput);
router.post('/interactive/kill', codeController.killInteractive);
router.get('/interactive/status/:sessionId', codeController.getInteractiveStatus);
router.get('/interactive/output/:sessionId', codeController.getInteractiveOutput);

module.exports = router;