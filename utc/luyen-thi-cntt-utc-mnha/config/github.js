// config/github.js
const { Octokit } = require('@octokit/rest');

/**
 * Khởi tạo Octokit với token trong .env.
 * Nếu thiếu token → vẫn khởi tạo nhưng cảnh báo (một số route public vẫn gọi được,
 * nhưng push file thì chắc chắn fail).
 */
const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo  = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || 'main';

if (!token) {
  console.warn('⚠️  GITHUB_TOKEN chưa được cấu hình — các thao tác ghi GitHub sẽ thất bại.');
}
if (!owner || !repo) {
  console.warn('⚠️  GITHUB_OWNER hoặc GITHUB_REPO chưa được cấu hình trong .env');
}

const octokit = new Octokit({
  auth: token || undefined,
  userAgent: 'luyen-thi-cntt-utc/1.0.0',
  request: {
    timeout: 20000 // 20s cho mỗi request GitHub
  }
});

/**
 * Đường dẫn gốc cho đề bài & bài nộp trong repo
 * Ví dụ:
 *   /subjects/{subject-slug}/subject.json
 *   /subjects/{subject-slug}/lessons/{lesson-slug}.json
 *   /submissions/{subject-slug}/{lesson-slug}/{userId}-{timestamp}.json
 */
const PATHS = {
  subjectsRoot: 'subjects',
  submissionsRoot: 'submissions'
};

module.exports = {
  octokit,
  owner,
  repo,
  branch,
  PATHS,
  isConfigured: Boolean(token && owner && repo)
};