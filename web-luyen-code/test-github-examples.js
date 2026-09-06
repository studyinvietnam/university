// backend/test-github-examples.js
// Chạy: node test-github-examples.js

require('dotenv').config();

async function main() {
  const githubService = require('./src/services/githubService');

  const dirPath = 'problems/6a9c21cc21804635026550f4/examples';
  console.log(`📂 Liệt kê thư mục: ${dirPath}\n`);

  let files;
  try {
    files = await githubService.listFiles(dirPath);
  } catch (err) {
    console.error('❌ Lỗi khi liệt kê thư mục:', err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('⚠️ Thư mục rỗng hoặc không tồn tại.');
    return;
  }

  console.log(`✅ Tìm thấy ${files.length} mục:\n`);
  files.forEach(f => console.log(`  [${f.type}] ${f.name}  (path: ${f.path})`));
  console.log('\n---------------------------------------------\n');

  for (const f of files) {
    if (f.type !== 'file') continue;
    console.log(`📄 Nội dung file: ${f.name}`);
    console.log('---');
    try {
      const content = await githubService.readFile(f.path);
      console.log(JSON.stringify(content)); // in kèm dấu ngoặc kép để thấy rõ xuống dòng/khoảng trắng
    } catch (err) {
      console.log('❌ Lỗi đọc file này:', err.message);
    }
    console.log('---------------------------------------------\n');
  }
}

main();
