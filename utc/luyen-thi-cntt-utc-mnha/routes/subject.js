const express = require("express");

const subjectController = require("../controllers/subject.controller");

const router = express.Router();


// ============================================================
// SUBJECT
// ============================================================

// Danh sách môn học
router.get("/", subjectController.getSubjects);

// Chi tiết môn học
router.get("/:id", subjectController.getSubject);


module.exports = router;