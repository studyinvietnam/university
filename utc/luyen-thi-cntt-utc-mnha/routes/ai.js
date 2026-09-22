const express = require("express");

const aiKeyController = require("../controllers/aikey.controller");

const router = express.Router();


// ============================================================
// AI KEYS
// ============================================================

// Danh sách AI keys
router.get(
    "/keys",
    aiKeyController.getAIKeys
);

// Tạo AI key
router.post(
    "/keys",
    aiKeyController.createAIKey
);

// Bật / tắt AI key
router.put(
    "/keys/:id/toggle",
    aiKeyController.toggleAIKey
);

// Xóa / revoke AI key
router.delete(
    "/keys/:id",
    aiKeyController.deleteAIKey
);


module.exports = router;