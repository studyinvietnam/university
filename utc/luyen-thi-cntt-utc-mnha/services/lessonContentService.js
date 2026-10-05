// services/lessonContentService.js
// ============================================================
// contentHtml của bài học CHỈ nằm ở file JSON trên GitHub
// (Lesson.githubFile). MongoDB KHÔNG lưu field này.
//   - getLessonContent(lesson, subjectSlug) : đọc từ GitHub (cache ~60s)
//   - saveLessonContent(filePath, patch, msg): ghi/merge vào GitHub (đồng bộ,
//       KHÔNG qua queue) rồi xoá cache
// ============================================================
const githubService = require('./githubService');

const TTL_MS = 60 * 1000;
const cache = new Map(); // filePath -> { data, exp }

function pickFn(names) {
    for (const n of names) {
        if (typeof githubService[n] === 'function') return githubService[n];
    }
    return null;
}

function isNotFound(err) {
    const msg = String(err && err.message || '');
    return (err && (err.status === 404 || err.code === 404)) ||
        /404|not found|không tồn tại|không tìm thấy/i.test(msg);
}

// Đường dẫn file đề bài (khớp quy ước cũ của lesson.controller)
function lessonFilePath(lesson, subjectSlug) {
    if (lesson && lesson.githubFile) return lesson.githubFile;
    const s = subjectSlug || `subject-${lesson && lesson.subjectId}`;
    const l = (lesson && lesson.slug) || `lesson-${lesson && lesson._id}`;
    return `subjects/${s}/lessons/${l}.json`;
}

async function getLessonContent(lesson, subjectSlug) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    const filePath = lessonFilePath(lesson, subjectSlug);

    const hit = cache.get(filePath);
    if (hit && hit.exp > Date.now()) return hit.data;

    const read = pickFn(['readJsonFile', 'getJSON']);
    if (!read) throw new Error('githubService không có method readJsonFile/getJSON');

    const json = await read.call(githubService, filePath);
    if (!json || typeof json !== 'object') {
        throw new Error(`File đề bài rỗng hoặc sai định dạng: ${filePath}`);
    }
    cache.set(filePath, { data: json, exp: Date.now() + TTL_MS });
    return json;
}

// Merge `patch` vào JSON hiện có (giữ nguyên attachments/field khác); chưa có file → tạo mới.
async function saveLessonContent(filePath, patch, commitMessage) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    if (!filePath) throw new Error('Thiếu đường dẫn GitHub (githubFile).');

    const merge = (data) => ({
        ...(data && typeof data === 'object' ? data : {}),
        ...patch
    });

    try {
        await githubService.updateJsonFile(filePath, merge, commitMessage);
    } catch (err) {
        if (!isNotFound(err)) throw err;
        // File chưa tồn tại → tạo mới.
        // ⚠️ ĐỐI CHIẾU: đổi danh sách tên hàm dưới đây cho khớp githubService.js thật
        const create = pickFn(['putJsonFile', 'putJson', 'createJsonFile', 'writeJsonFile', 'upsertJsonFile']);
        if (!create) {
            throw new Error(`File ${filePath} chưa có trên GitHub và githubService không có hàm tạo file mới.`);
        }
        await create.call(githubService, filePath, merge(null), commitMessage);
    }
    cache.delete(filePath);
}

function clearCache(filePath) {
    if (filePath) cache.delete(filePath); else cache.clear();
}

module.exports = { lessonFilePath, getLessonContent, saveLessonContent, clearCache };
