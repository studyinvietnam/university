// backend/fix-test-problem-names.js
// Chạy: node fix-test-problem-names.js

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB');

  const db = mongoose.connection.db;

  const updates = [
    {
      id: '6a9c21cc21804635026550f4',
      name: 'Xây dựng lớp Phân số',
      code: '000001',
    },
    {
      id: '6a9c110ca96c6f9ef4486452',
      name: 'Bài test GitHub 2',
      code: '000002',
    },
  ];

  for (const u of updates) {
    const _id = new mongoose.Types.ObjectId(u.id);
    const result = await db.collection('problems').updateOne(
      { _id },
      { $set: { name: u.name, code: u.code } }
    );
    console.log(`${u.id} -> matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
  }

  const all = await db.collection('problems').find({}).toArray();
  console.log('\n📋 Danh sách problems sau khi update:');
  console.log(JSON.stringify(all, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
