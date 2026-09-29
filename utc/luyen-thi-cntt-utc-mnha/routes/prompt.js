// routes/prompt.js
const express = require("express");
const router = express.Router();

const promptController = require("../controllers/prompt.controller");
const { attachUser } = require("../middleware/auth");
const { adminOnly, requireDefaultAdmin } = require("../middleware/role");

// ============================================================
// MIDDLEWARE — chỉ ADMIN (default hoặc user_key)
// - attachUser: đọc lại user từ DB (không tin session cũ)
// - adminOnly : chặn client / student / khách ở tầng route
// Trang này render admin/prompts nên student không có lý do vào.
// (Nếu muốn cho student XEM danh sách: đổi adminOnly -> studentOrAdmin,
//  controller đã trả canManage=false cho họ.)
// ============================================================
router.use(attachUser, adminOnly);

// ============================================================
// PROMPT ROUTES
// Quyền sửa/xoá theo createdBy được kiểm tra trong prompt.controller
// (admin default: mọi prompt; admin user_key: chỉ prompt do mình tạo).
// ============================================================

// Danh sách prompt (xem)
router.get("/", promptController.getPrompts);

// CRUD
router.get("/create", promptController.showCreatePrompt);
router.post("/", promptController.createPrompt);
router.get("/:id/edit", promptController.showEditPrompt);
router.post("/:id/edit", promptController.updatePrompt);

// Prompt mặc định ảnh hưởng mọi tổ chức → chỉ admin default
router.post("/:id/set-default", requireDefaultAdmin, promptController.setDefault);

router.post("/:id/delete", promptController.deletePrompt);
router.post("/:id/hard-delete", promptController.hardDeletePrompt);

module.exports = router;
