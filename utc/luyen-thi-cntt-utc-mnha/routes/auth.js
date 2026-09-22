const express = require("express");

const authController = require("../controllers/auth.controller");

const router = express.Router();


// ============================================================
// AUTH
// ============================================================

// Đăng nhập
router.get("/login", authController.showLogin);
router.post("/login", authController.login);

// Đăng ký
router.get("/register", authController.showRegister);
router.post("/register", authController.register);

// Quên mật khẩu
router.get("/forgot", authController.showForgot);
router.post("/forgot", authController.forgotPassword);

// Đăng xuất
router.post("/logout", authController.logout);


module.exports = router;