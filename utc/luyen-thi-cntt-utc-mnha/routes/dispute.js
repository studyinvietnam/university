const express = require("express");
const router = express.Router();
const disputeController = require("../controllers/dispute.controller");

function requireAuth(req, res, next) {
    const user = req.user || req.session?.user;
    if (!user) return res.redirect("/auth/login");
    if (user.status === "pending" || user.role === "client") return res.redirect("/pages");
    next();
}

router.use(requireAuth);

// Student tạo khiếu nại
router.post("/", disputeController.createDispute);

// Xem chi tiết 1 khiếu nại
router.get("/:id", disputeController.showDispute);

// Admin: danh sách + cập nhật
router.get("/", disputeController.getDisputes);
router.post("/:id/update", disputeController.updateDispute);

module.exports = router;