// ============================================================
// GITHUB SERVICE - Octokit wrapper
// ============================================================
// Dùng config/github.js làm nguồn config DUY NHẤT.
// Export đầy đủ: writeJsonFile, readJsonFile, deleteFile,
// path helpers (submissionPath, subjectPath, lessonPath).
// ============================================================

const {
    octokit,
    owner,
    repo,
    branch,
    isConfigured,
    subjectFile,
    lessonFile,
    submissionFile
} = require('../config/github');

const MAX_RETRY = 3;
const BASE_DELAY = 500;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retry khi gặp 409 (SHA conflict) hoặc 5xx.
 */
async function withRetry(fn, label = 'github') {
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const status = e.status || e.response?.status;
            const retriable = status === 409 || (status >= 500 && status < 600);
            console.warn(`⚠️ [${label}] attempt ${attempt} fail: ${e.message} (status=${status})`);
            if (!retriable || attempt === MAX_RETRY) throw e;
            await sleep(BASE_DELAY * Math.pow(2, attempt - 1));
        }
    }
    throw lastErr;
}

/**
 * Đảm bảo các env cần thiết đã cấu hình.
 */
function assertConfigured() {
    if (!isConfigured) {
        throw new Error(
            'GitHub chưa cấu hình: cần GITHUB_TOKEN + GITHUB_OWNER + GITHUB_REPO trong .env'
        );
    }
}

/**
 * Lấy SHA của file (null nếu chưa tồn tại).
 */
async function getFileSha(path) {
    assertConfigured();
    try {
        const res = await octokit.repos.getContent({
            owner, repo, path, ref: branch
        });
        if (Array.isArray(res.data)) return null;
        return res.data.sha;
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}

/**
 * Ghi file JSON lên GitHub (tạo mới hoặc cập nhật).
 */
async function writeJsonFile(path, data, commitMessage = 'Update JSON') {
    assertConfigured();

    return withRetry(async () => {
        const sha = await getFileSha(path);
        const content = Buffer
            .from(JSON.stringify(data, null, 2), 'utf8')
            .toString('base64');

        const res = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            branch,
            path,
            message: commitMessage,
            content,
            sha: sha || undefined,
            committer: {
                name: 'Luyen Thi CNTT Bot',
                email: 'bot@luyen-thi-cntt.local'
            }
        });

        return {
            path,
            sha: res.data.content.sha,
            url: res.data.content.html_url,
            downloadUrl: res.data.content.download_url,
            commitSha: res.data.commit.sha
        };
    }, `write:${path}`);
}

/**
 * Đọc file JSON từ GitHub.
 */
async function readJsonFile(path) {
    assertConfigured();

    try {
        const res = await octokit.repos.getContent({
            owner, repo, path, ref: branch
        });
        if (Array.isArray(res.data)) {
            throw new Error(`Path không phải file: ${path}`);
        }
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}

/**
 * Xoá file trên GitHub.
 */
async function deleteFile(path, commitMessage = 'Delete file') {
    assertConfigured();

    return withRetry(async () => {
        const sha = await getFileSha(path);
        if (!sha) {
            console.warn(`[githubService] File không tồn tại, bỏ qua xoá: ${path}`);
            return { path, deleted: false };
        }

        const res = await octokit.repos.deleteFile({
            owner,
            repo,
            branch,
            path,
            message: commitMessage,
            sha
        });

        return {
            path,
            deleted: true,
            commitSha: res.data.commit.sha
        };
    }, `delete:${path}`);
}

/**
 * Kiểm tra file tồn tại.
 */
async function fileExists(path) {
    const sha = await getFileSha(path);
    return sha !== null;
}

// ============================================================
// PATH HELPERS — alias cho code cũ
// ============================================================
function submissionPath(subjectSlug, lessonSlug, userId, timestamp) {
    return submissionFile(subjectSlug, lessonSlug, userId, timestamp);
}

function subjectPath(subjectSlug) {
    return subjectFile(subjectSlug);
}

function lessonPath(subjectSlug, lessonSlug) {
    return lessonFile(subjectSlug, lessonSlug);
}

module.exports = {
    // Core
    writeJsonFile,
    readJsonFile,
    deleteFile,
    fileExists,
    getFileSha,

    // Path helpers
    submissionPath,
    subjectPath,
    lessonPath,

    // Config
    isConfigured,
    owner,
    repo,
    branch,

    // Debug
    _octokit: octokit
};