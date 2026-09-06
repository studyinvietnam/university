// backend/insert-test-problems.js
// Chạy: node insert-test-problems.js
// (đặt file này trong thư mục backend, cùng cấp với package.json, để nó đọc được .env và node_modules)

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Không tìm thấy MONGODB_URI trong file .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB');

  const db = mongoose.connection.db;

  const ids = [
    '6a9c21cc21804635026550f4',
    '6a9c110ca96c6f9ef4486452',
  ];

  for (const idStr of ids) {
    const _id = new mongoose.Types.ObjectId(idStr);
    const existing = await db.collection('problems').findOne({ _id });

    if (existing) {
      console.log(`⚠️  Đã tồn tại, bỏ qua: ${idStr}`);
      continue;
    }

    await db.collection('problems').insertOne({
      _id,
      code: `GH-${idStr}`, // unique, tránh trùng index code_1
      languages: ['c', 'cpp', 'java', 'python'],
    });
    console.log(`✅ Đã thêm: ${idStr}`);
  }

  // Fix document cũ (nếu có) đang bị code: null do lần chạy trước
  await db.collection('problems').updateMany(
    { code: null },
    [{ $set: { code: { $concat: ['GH-', { $toString: '$_id' }] } } }]
  );

  const all = await db.collection('problems').find({}).toArray();
  console.log('\n📋 Danh sách problems hiện có:');
  console.log(all);

  await mongoose.disconnect();
  console.log('\n✅ Hoàn tất, đã ngắt kết nối.');
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
