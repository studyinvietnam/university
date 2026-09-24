const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

// Public / authenticated
router.get("/models", ctrl.listModels);

// ★ List các AI Key đang active — chỉ trả name + model (không trả key thật)
// Dùng cho dropdown "Chọn AI Key" ở lesson.pug
router.get("/keys", requireAuth, ctrl.listKeys);

router.get("/test", requireAuth, ctrl.testConnection);
router.get("/ai-status", requireAuth, ctrl.testConnection);
router.post("/check", requireAuth, ctrl.checkWriting);
router.post("/preview-prompt", requireAuth, ctrl.previewPrompt);
router.post("/save-to-github", requireAuth, ctrl.saveToGithub);

// Admin only
router.post("/compare", requireAuth, requireRole("admin"), ctrl.compareModels);
router.get("/test-all", requireAuth, requireRole("admin"), ctrl.testAllConnections);
router.get("/comparison/:id", requireAuth, requireRole("admin"), ctrl.getComparison);
router.get("/comparisons", requireAuth, requireRole("admin"), ctrl.listComparisons);

module.exports = router;