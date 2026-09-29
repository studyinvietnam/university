// routes/userkey.js — chỉ phần STUDENT kết nối tổ chức bằng code.
// (Phần admin default quản lý User Key nằm trong routes/admin.js: /admin/user-keys)
// Gắn trong app.js, SAU session/auth và TRƯỚC handler 404:
//     app.use('/student', require('./routes/userkey'));
const express = require('express');
const c = require('../controllers/userkey.controller');

const router = express.Router();

const needLogin = (req, res, next) =>
    (req.user || req.session?.user) ? next() : res.redirect('/auth/login');

router.get('/connect', needLogin, c.requireApprovedStudent, c.showConnect);
router.post('/connect', needLogin, c.requireApprovedStudent, c.connectUserKey);
router.post('/connect/:id/disconnect', needLogin, c.requireApprovedStudent, c.disconnectUserKey);

module.exports = router;
