// =============================================================
// AI ROUTES
// =============================================================

const router =
    require('express').Router();


const writingController =
    require('../controllers/ai/writing.controller');


// =============================================================
// CHECK WRITING
// =============================================================

router.post(
    '/check-writing',
    writingController.checkWriting
);


// =============================================================
// CHECK AI STATUS
// =============================================================

router.get(
    '/check-writing/ai-status',
    writingController.checkAIStatus
);


module.exports = router;