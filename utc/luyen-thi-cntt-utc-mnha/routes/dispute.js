const express = require("express");

const disputeController = require("../controllers/dispute.controller");

const router = express.Router();


// ============================================================
// ADMIN
// ============================================================

router.get(
    "/admin/all",
    disputeController.getDisputes
);

router.put(
    "/admin/:id",
    disputeController.updateDispute
);


// ============================================================
// STUDENT
// ============================================================

router.get(
    "/:submissionId",
    disputeController.showDispute
);

router.post(
    "/:submissionId",
    disputeController.createDispute
);


module.exports = router;