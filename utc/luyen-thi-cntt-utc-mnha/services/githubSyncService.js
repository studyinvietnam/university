// ============================================================
// GITHUB SYNC SERVICE — lớp mỏng giữ API cũ
// ------------------------------------------------------------
// Lessons / prompts / submissions đọc THẲNG từ GitHub (không qua MongoDB):
// xem services/githubStore.js. syncKinds() chỉ còn là "đảm bảo RAM đang mới"
// (webhook đã cập nhật sẵn; lưới an toàn kiểm tra đầu nhánh ≥5s/lần).
// Không bao giờ ném lỗi.
// ============================================================
const githubStore = require('./githubStore');

async function syncKinds(kinds, opts = {}) {
    try {
        return await githubStore.refresh(kinds, { force: Boolean(opts.force) });
    } catch (e) {
        console.warn(`⚠️ [githubSync] lỗi: ${e.message}`);
        return (kinds || ['lessons', 'prompts', 'submissions']).map((k) => ({ kind: k, error: e.message }));
    }
}

const one = (k) => (opts) => syncKinds([k], opts).then((r) => r[0]);
module.exports = {
    syncKinds,
    syncLessons: one('lessons'),
    syncPrompts: one('prompts'),
    syncSubmissions: one('submissions')
};
