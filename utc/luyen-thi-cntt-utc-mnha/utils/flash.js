// utils/flash.js — flash message tối giản dựa trên session (không cần connect-flash).
// redirectWithFlash dùng session.save() để chắc chắn flash đã được lưu vào
// MongoStore TRƯỚC khi trình duyệt gọi trang kế tiếp (tránh mất flash khi redirect).

function redirectWithFlash(req, res, url, type, message) {
    req.session.flash = { type, message };
    req.session.save(() => res.redirect(url));
}

function takeFlash(req) {
    const flash = req.session && req.session.flash;
    if (flash) delete req.session.flash;
    return flash || null;
}

module.exports = { redirectWithFlash, takeFlash };
