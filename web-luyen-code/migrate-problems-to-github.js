// migrate-problem-to-github.js
require('dotenv').config();
const mongoose = require('mongoose');
const { Octokit } = require('@octokit/rest');
const Problem = require('./src/models/Problem');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH;

async function createOrUpdateFile(path, content) {
  try {
    let sha = null;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      sha = data.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Migrate problem ${path}`,
      content: encoded,
      sha,
      branch,
    });
    console.log(`✅ Created/Updated: ${path}`);
  } catch (e) {
    console.error(`❌ Error with ${path}:`, e.message);
  }
}

async function migrateProblem(problemId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const problem = await Problem.findById(problemId);
    if (!problem) {
      console.error('❌ Problem not found');
      return;
    }

    console.log(`📦 Migrating: ${problem.name} (${problem._id})`);

    const problemIdStr = problem._id.toString();
    const basePath = `problems/${problemIdStr}`;

    // 1. Tạo problem.json
    const meta = {
      name: problem.name,
      code: problem.code,
      languages: problem.languages || ['cpp'],
      score: problem.score || 10,
      status: problem.status || 'draft',
      gradingRequirements: problem.gradingRequirements || '',
      subjectId: problem.subjectId.toString(),
      chapterId: problem.chapterId.toString(),
    };
    await createOrUpdateFile(`${basePath}/problem.json`, JSON.stringify(meta, null, 2));

    // 2. statement.md
    await createOrUpdateFile(`${basePath}/statement.md`, problem.statement || '');

    // 3. examples/input.txt
    await createOrUpdateFile(`${basePath}/examples/input.txt`, problem.exampleInput || '');

    // 4. examples/output.txt
    await createOrUpdateFile(`${basePath}/examples/output.txt`, problem.exampleOutput || '');

    // 5. Cập nhật MongoDB
    problem.githubPath = basePath;
    // Xóa nội dung statement, exampleInput, exampleOutput (tùy chọn)
    // Nếu bạn muốn chỉ lưu githubPath và xóa nội dung cũ để tiết kiệm
    // problem.statement = '';
    // problem.exampleInput = '';
    // problem.exampleOutput = '';
    await problem.save();

    console.log(`✅ Migrated ${problem.name} to GitHub: ${basePath}`);
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Thay ID bài của bạn
const problemId = '6a9c21cc21804635026550f4';
migrateProblem(problemId);