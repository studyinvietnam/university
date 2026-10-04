// routes/userConnect.js — mount: app.use('/admin/users/connect', userConnect)
// PHẢI mount trước adminRoutes để "/admin/users/:id" không nuốt chữ "connect".
const express = require('express');
const { requireUserKeyAdmin } = require('../middleware/userKeyGuard');
const controller = require('../controllers/userConnect.controller');

const router = express.Router();

router.use(requireUserKeyAdmin);

router.get('/', controller.list);
router.post('/', controller.add);
router.post('/:userId/delete', controller.remove);

module.exports = router;
