// routes/subject.js
const express = require("express");
const router = express.Router();

const subjectController = require("../controllers/subject.controller");
const { attachUser } = require("../middleware/auth");
const { studentOrAdmin } = require("../middleware/role");

// ============================================================
// MIDDLEWARE — ADMIN + STUDENT đều qua
// - attachUser   : đọc lại user từ DB (không tin session cũ)
// - studentOrAdmin: chặn client / tài khoản pending (→ trang chờ duyệt)
//   và mọi role lạ (trước đây "mọi role khác đã login → cho qua" là fail-open)
// Việc lọc Subject theo userKey (student chỉ thấy môn của tổ chức mình / đã kết nối)
// nằm trong subject.controller.
// ============================================================
router.use(attachUser, studentOrAdmin);

// ============================================================
// SUBJECT — dùng chung admin + student
// ============================================================

router.get("/", subjectController.getSubjects);
router.get("/:id", subjectController.getSubject);

module.exports = router;
