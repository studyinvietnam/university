const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/ai.controller");
const { attachUser } = require("../middleware/auth");
const { adminOnly, studentOrAdmin, requireDefaultAdmin } = require("../middleware/role");

// Đảm bảo req.user luôn được nạp từ DB (idempotent nếu đã gắn global)
router.use(attachUser);

// Public
router.get("/models", ctrl.listModels);

// ★ Các route dưới đây dùng studentOrAdmin (thay cho requireAuth):
//   client / tài khoản pending bị chặn ở TẦNG API, không chỉ ở tầng render.

// List các AI Key đang active — chỉ trả name + model (không trả key thật)
router.get("/keys", studentOrAdmin, ctrl.listKeys);

router.get("/test", studentOrAdmin, ctrl.testConnection);
router.get("/ai-status", studentOrAdmin, ctrl.testConnection);
router.post("/check", studentOrAdmin, ctrl.checkWriting);
router.post("/preview-prompt", studentOrAdmin, ctrl.previewPrompt);
router.post("/save-to-github", studentOrAdmin, ctrl.saveToGithub);

// Admin (default + user_key)
router.post("/compare", adminOnly, ctrl.compareModels);

// ★ Chỉ admin default:
//   - test-all: kiểm tra toàn bộ AI key của hệ thống
//   - comparison(s): đọc kết quả so sánh của MỌI admin (chứa promptSnapshot của
//     các tổ chức khác) — chưa lọc theo createdBy nên không mở cho admin user_key
router.get("/test-all", requireDefaultAdmin, ctrl.testAllConnections);
router.get("/comparison/:id", requireDefaultAdmin, ctrl.getComparison);
router.get("/comparisons", requireDefaultAdmin, ctrl.listComparisons);

module.exports = router;
