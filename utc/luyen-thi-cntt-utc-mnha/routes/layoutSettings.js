// routes/layoutSettings.js
//   app.use('/layout', layoutSettings.logoRouter);     → GET /layout/logo/:userKeyId
//   app.use('/admin/layout', layoutSettings);          → trang sửa layout
const express = require('express');
const multer = require('multer');
const { requireLayoutEditor } = require('../middleware/userKeyGuard');
const { MAX_LOGO_BYTES } = require('../services/layoutService');
const { redirectWithFlash } = require('../utils/flash');
const controller = require('../controllers/layout.controller');

const router = express.Router();
const logoRouter = express.Router();

// Lưu trong RAM (không ghi đĩa — hợp với serverless); file đi thẳng lên GitHub.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 5 }
}).single('logo');

function uploadLogo(req, res, next) {
    upload(req, res, (err) => {
        if (!err) return next();
        const message =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'Logo tối đa 512KB.'
                : 'Không đọc được file tải lên.';
        return redirectWithFlash(req, res, '/admin/layout', 'error', message);
    });
}

router.get('/', requireLayoutEditor, controller.showForm);
router.post('/', requireLayoutEditor, uploadLogo, controller.update);
router.post('/reset', requireLayoutEditor, controller.reset);

logoRouter.get('/logo/:userKeyId', controller.serveLogo);

module.exports = router;
module.exports.logoRouter = logoRouter;
