const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');
const publicDir = path.join(projectRoot, 'public');

console.log('🚀 Chuẩn bị frontend cho Vercel...');

if (!fs.existsSync(frontendDir)) {
    console.error('❌ Không tìm thấy thư mục frontend:');
    console.error(frontendDir);
    process.exit(1);
}

// Xóa public cũ nếu có
if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, {
        recursive: true,
        force: true
    });
}

// Copy nguyên frontend → public
fs.cpSync(frontendDir, publicDir, {
    recursive: true
});

console.log('✅ Frontend đã được copy vào public/');
console.log(`📁 Source : ${frontendDir}`);
console.log(`📁 Output : ${publicDir}`);
console.log('✅ api-client.js được giữ nguyên dạng ES Module.');