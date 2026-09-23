// routes/subject.js
const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");

// ============================================================
// MIDDLEWARE — yêu cầu admin (dùng per-route, KHÔNG global)
// ============================================================
function requireAdmin(req, res, next) {
    const user = req.user || req.session?.user;

    if (!user) {
        if (req.xhr || req.path.startsWith("/api")) {
            return res.status(401).json({ error: "Chưa đăng nhập" });
        }
        return res.redirect("/auth/login");
    }

    if (user.role !== "admin") {
        if (req.xhr || req.path.startsWith("/api")) {
            return res.status(403).json({ error: "Không có quyền" });
        }
        return res.status(403).render("error", {
            title: "Không có quyền truy cập",
            message: "Bạn không có quyền truy cập trang quản trị.",
            statusCode: 403,
            stack: null
        });
    }

    next();
};

// ============================================================
// ADMIN ONLY — ĐẶT TRƯỚC /:id ĐỂ TRÁNH BỊ NUỐT
// ============================================================

router.get("/admin/all", requireAdmin, subjectController.getAdminSubjects);

router.get("/:id/edit", requireAdmin, subjectController.showEditSubject);
router.post("/:id/edit", requireAdmin, subjectController.updateSubject);

router.post("/:id/delete", requireAdmin, subjectController.deleteSubject);
router.post("/:id/restore", requireAdmin, subjectController.restoreSubject);
router.post("/:id/hard-delete", requireAdmin, subjectController.hardDeleteSubject);

router.post("/", requireAdmin, subjectController.createSubject);

// ============================================================
// PUBLIC — student & admin đều xem được
// ============================================================

// Danh sách môn học (student xem)
router.get("/", subjectController.getSubjects);

// Chi tiết 1 môn — route này phải tồn tại sau khi bỏ comment
router.get("/:id", subjectController.getSubject);

module.exports = router;