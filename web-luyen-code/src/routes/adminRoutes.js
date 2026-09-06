// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

// ---- Subject ----
router.get('/subjects', adminController.getAllSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// ---- Chapter ----
router.get('/chapters', adminController.getAllChapters);
router.get('/chapters/:id', adminController.getChapterById);
router.post('/chapters', adminController.createChapter);
router.put('/chapters/:id', adminController.updateChapter);
router.delete('/chapters/:id', adminController.deleteChapter);

// ---- Problem ----
router.get('/problems', adminController.getAllProblems);
router.get('/problems/:id', adminController.getProblemById);
router.post('/problems', adminController.createProblem);
router.put('/problems/:id', adminController.updateProblem);
router.delete('/problems/:id', adminController.deleteProblem);

// ---- Grading ----
router.get('/problems/:problemId/grading', adminController.getGrading);
router.put('/problems/:problemId/grading', adminController.updateGrading);
router.delete('/problems/:problemId/grading', adminController.deleteGrading);

module.exports = router;