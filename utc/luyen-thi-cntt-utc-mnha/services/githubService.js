// ============================================================
// GITHUB SERVICE - Octokit wrapper
// ============================================================

const { Octokit } = require("@octokit/rest");

const OWNER = process.env.GITHUB_OWNER;
const REPO  = process.env.GITHUB_REPO;

if (!process.env.GITHUB_TOKEN) {
    console.warn("⚠️  GITHUB_TOKEN chưa cấu hình — submission sẽ không lưu được lên GitHub.");
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const MAX_RETRY = 3;
const BASE_DELAY = 500;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Retry khi gặp lỗi 409 (SHA conflict) hoặc 5xx.
 */
async function withRetry(fn, label = "github") {
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const status = e.status || e.response?.status;
            const retriable = status === 409 || (status >= 500 && status < 600);
            console.warn(`⚠️ [${label}] attempt ${attempt} failed: ${e.message} (status=${status})`);
            if (!retriable || attempt === MAX_RETRY) throw e;
            await sleep(BASE_DELAY * Math.pow(2, attempt - 1));
        }
    }
    throw lastErr;
}

/**
 * Lấy SHA của file (null nếu chưa tồn tại).
 */
async function getFileSha(path) {
    try {
        const res = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path });
        if (Array.isArray(res.data)) return null; // là folder
        return res.data.sha;
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}

/**
 * Ghi file JSON lên GitHub (tạo mới hoặc cập nhật).
 */
async function writeJsonFile(path, data, commitMessage = "Update JSON") {
    return withRetry(async () => {
        const sha = await getFileSha(path);
        const content = Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64");

        const res = await octokit.repos.createOrUpdateFileContents({
            owner: OWNER, repo: REPO, path,
            message: commitMessage,
            content,
            sha: sha || undefined,
            committer: {
                name: "IELTS Grader Bot",
                email: "bot@ielts-grader.local",
            },
        });

        return {
            path,
            sha: res.data.content.sha,
            url: res.data.content.html_url,
            downloadUrl: res.data.content.download_url,
            commitSha: res.data.commit.sha,
        };
    }, `write:${path}`);
}

/**
 * Đọc file JSON từ GitHub.
 */
async function readJsonFile(path) {
    const res = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path });
    if (Array.isArray(res.data)) throw new Error(`Path không phải file: ${path}`);
    const content = Buffer.from(res.data.content, "base64").toString("utf8");
    return JSON.parse(content);
}

/**
 * Kiểm tra file tồn tại.
 */
async function fileExists(path) {
    const sha = await getFileSha(path);
    return sha !== null;
}

module.exports = {
    writeJsonFile,
    readJsonFile,
    fileExists,
    getFileSha,
    _octokit: octokit,
    _config: { OWNER, REPO },
};