// backend/src/services/githubService.js
// Giả định file cấu hình nằm ở backend/src/config/github.js
// (nếu bạn đặt ở chỗ khác, sửa lại đường dẫn require bên dưới)
const { octokit, owner, repo, branch } = require('../config/github');

/**
 * Lấy sha của 1 file (cần khi update/xóa file qua GitHub API)
 * Trả về null nếu file không tồn tại
 */
async function getFileSha(filePath) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });
    if (Array.isArray(data)) return null; // là thư mục, không phải file
    return data.sha;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Đọc nội dung 1 file text từ GitHub
 * Trả về string nội dung, hoặc null nếu file không tồn tại
 */
async function readFile(filePath) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });

    if (Array.isArray(data)) {
      throw new Error(`${filePath} là một thư mục, không phải file`);
    }

    // GitHub trả content dạng base64
    const content = Buffer.from(data.content, data.encoding || 'base64').toString('utf-8');
    return content;
  } catch (err) {
    if (err.status === 404) {
      return null; // file chưa tồn tại -> để nơi gọi tự fallback
    }
    throw err;
  }
}

/**
 * Tạo mới hoặc cập nhật (nếu đã tồn tại) 1 file text trên GitHub
 */
async function saveFile(filePath, content) {
  const sha = await getFileSha(filePath);

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    branch,
    message: sha ? `Update ${filePath}` : `Create ${filePath}`,
    content: Buffer.from(content ?? '', 'utf-8').toString('base64'),
    sha: sha || undefined, // bắt buộc phải có sha nếu file đã tồn tại
  });
}

/**
 * Liệt kê file/thư mục con trong 1 thư mục trên GitHub
 * Trả về mảng [{ name, path, type, sha }], hoặc [] nếu thư mục không tồn tại
 */
async function listFiles(dirPath) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: dirPath,
      ref: branch,
    });

    if (!Array.isArray(data)) return []; // path trỏ tới 1 file, không phải thư mục

    return data.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type, // 'file' | 'dir'
      sha: item.sha,
    }));
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
}

/**
 * Xóa 1 file trên GitHub (không lỗi nếu file không tồn tại)
 */
async function deleteFile(filePath) {
  const sha = await getFileSha(filePath);
  if (!sha) return; // không tồn tại thì bỏ qua, coi như đã xóa

  await octokit.repos.deleteFile({
    owner,
    repo,
    path: filePath,
    branch,
    message: `Delete ${filePath}`,
    sha,
  });
}

module.exports = { readFile, saveFile, listFiles, deleteFile };
