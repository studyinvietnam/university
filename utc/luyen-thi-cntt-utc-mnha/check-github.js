// check-github.js
require("dotenv").config();

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO  = process.env.GITHUB_REPO;

console.log("");
console.log("========== GITHUB CONFIG ==========");
console.log("GITHUB_TOKEN :", TOKEN ? `${TOKEN.slice(0, 7)}...${TOKEN.slice(-4)} (len=${TOKEN.length})` : "❌ THIẾU");
console.log("GITHUB_OWNER :", OWNER || "❌ THIẾU");
console.log("GITHUB_REPO  :", REPO  || "❌ THIẾU");
console.log("===================================");

if (!TOKEN || !OWNER || !REPO) {
    console.log("");
    console.log("❌ Chưa đủ 3 biến GITHUB_* trong .env");
    console.log("→ Mở file .env và thêm:");
    console.log("");
    console.log("   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx");
    console.log("   GITHUB_OWNER=ten-github-cua-ban");
    console.log("   GITHUB_REPO=ten-repo");
    console.log("");
    process.exit(1);
}

// ============ TEST GỌI API GITHUB THẬT ============
(async () => {
    const { Octokit } = require("@octokit/rest");
    const octokit = new Octokit({ auth: TOKEN });

    console.log("");
    console.log("🔍 Đang gọi GitHub API kiểm tra...");

    // 1. Check token
    try {
        const me = await octokit.users.getAuthenticated();
        console.log(`✅ Token hợp lệ. User: ${me.data.login}`);
    } catch (e) {
        console.log(`❌ Token không hợp lệ: ${e.message}`);
        return;
    }

    // 2. Check repo tồn tại + quyền
    try {
        const repo = await octokit.repos.get({ owner: OWNER, repo: REPO });
        console.log(`✅ Repo OK: ${repo.data.full_name}`);
        console.log(`   - Private    : ${repo.data.private}`);
        console.log(`   - Default br : ${repo.data.default_branch}`);
        console.log(`   - Permissions:`, repo.data.permissions);
    } catch (e) {
        console.log(`❌ Không truy cập được repo: ${e.message}`);
        console.log("   → Kiểm tra GITHUB_OWNER / GITHUB_REPO đúng chưa");
        console.log("   → Token phải có scope 'repo' (classic) hoặc quyền Contents: Read+Write (fine-grained)");
        return;
    }

    // 3. Check quyền ghi thử
    const testPath = `submissions/_test/${Date.now()}.json`;
    try {
        const content = Buffer.from(JSON.stringify({ test: true, at: new Date() }), "utf8").toString("base64");
        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER, repo: REPO, path: testPath,
            message: "test: check github config",
            content,
        });
        console.log(`✅ Có quyền ghi file. Test path: ${testPath}`);
    } catch (e) {
        console.log(`❌ Không có quyền ghi: ${e.message}`);
        return;
    }

    console.log("");
    console.log("🎉 GitHub config OK — submission sẽ lưu được lên GitHub!");
})();