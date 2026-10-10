// services/lessonContentService.js
// ============================================================
// contentHtml của bài học CHỈ nằm ở file JSON trên GitHub
// (Lesson.githubFile). MongoDB KHÔNG lưu field này.
//   - getLessonContent(lesson, subjectSlug, {fresh}) : đọc từ GitHub (cache ~60s; fresh=true → bỏ qua cache)
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

// options.fresh = true → bỏ qua cache RAM, đọc thẳng GitHub (dùng cho form sửa của admin).
// Lý do: trên Vercel (serverless) mỗi instance có Map cache riêng, nên lưu ở instance A
// không xoá được cache của instance B → form sửa có thể hiện bản cũ rồi ghi đè mất bản mới.
async function getLessonContent(lesson, subjectSlug, options = {}) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    const filePath = lessonFilePath(lesson, subjectSlug);
    const fresh = !!(options && options.fresh);

    if (!fresh) {
        const hit = cache.get(filePath);
        if (hit && hit.exp > Date.now()) return hit.data;
    }

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
// Trả về { path, sha, commitSha } của lần ghi (sha dùng để lưu Lesson.githubSha).
async function saveLessonContent(filePath, patch, commitMessage) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    if (!filePath) throw new Error('Thiếu đường dẫn GitHub (githubFile).');

    const merge = (data) => ({
        ...(data && typeof data === 'object' ? data : {}),
        ...patch
    });

    let result;
    try {
        result = await githubService.updateJsonFile(filePath, merge, commitMessage);
    } catch (err) {
        if (!isNotFound(err)) throw err;
        // File chưa tồn tại → tạo mới.
        const create = pickFn(['putJsonFile', 'putJson', 'createJsonFile', 'writeJsonFile', 'upsertJsonFile']);
        if (!create) {
            throw new Error(`File ${filePath} chưa có trên GitHub và githubService không có hàm tạo file mới.`);
        }
        result = await create.call(githubService, filePath, merge(null), commitMessage);
    }
    cache.delete(filePath);
    return result;
}

// Chỉ SỬA file đã có (merge `patch`). File không tồn tại → trả về null, KHÔNG tạo file rỗng
// (dùng cho xoá mềm / khôi phục / gán prompt: tránh sinh ra file "mồ côi" chỉ có vài field).
async function patchLessonFile(filePath, patch, commitMessage) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    if (!filePath) return null;
    try {
        const result = await githubService.updateJsonFile(
            filePath,
            (data) => ({ ...(data && typeof data === 'object' ? data : {}), ...patch }),
            commitMessage
        );
        cache.delete(filePath);
        return result;
    } catch (err) {
        if (isNotFound(err)) {
            console.warn(`[lessonContent] File không còn trên GitHub, bỏ qua ghi: ${filePath}`);
            return null;
        }
        throw err;
    }
}

// Chuyển file sang đường dẫn mới (vd đổi môn của bài học): đọc file cũ, ghi file mới
// (đã merge `patch`), rồi xoá file cũ. Ghi file mới thất bại → file cũ còn nguyên.
async function moveLessonFile(oldPath, newPath, patch, commitMessage) {
    if (!githubService.isConfigured) throw new Error('GitHub chưa được cấu hình.');
    if (oldPath === newPath) return saveLessonContent(newPath, patch, commitMessage);

    if (await githubService.fileExists(newPath)) {
        throw new Error(`Đã có file ${newPath} trên GitHub (trùng tên bài trong môn mới).`);
    }
    const current = await githubService.readJsonFile(oldPath);
    if (!current) throw new Error(`File cũ không tồn tại trên GitHub: ${oldPath}`);

    const result = await githubService.writeJsonFile(newPath, { ...current, ...patch }, commitMessage);
    await githubService.deleteFile(oldPath, `${commitMessage} (chuyển file)`);
    cache.delete(oldPath);
    cache.delete(newPath);
    return result;
}

function clearCache(filePath) {
    if (filePath) cache.delete(filePath); else cache.clear();
}

module.exports = { lessonFilePath, getLessonContent, saveLessonContent, patchLessonFile, moveLessonFile, clearCache };
