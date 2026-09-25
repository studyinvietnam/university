// scripts/migrate-lesson-isDeleted.js
//
// Chạy 1 LẦN DUY NHẤT sau khi deploy Lesson.js + lesson.controller.js mới:
//   node scripts/migrate-lesson-isDeleted.js
//
// Việc này cần thiết vì các document Lesson đã tồn tại trong MongoDB từ trước
// không tự có field `isDeleted` (Mongoose chỉ áp default khi tạo document mới).

require('dotenv').config();
const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    // 1) Các bài trước đây đã đánh dấu deletedForever = true
    //    → theo thiết kế mới, xoá vĩnh viễn = xoá thật khỏi DB.
    const hardDeleteResult = await Lesson.deleteMany({ deletedForever: true });
    console.log(`🗑️  Đã xoá thật ${hardDeleteResult.deletedCount} bài (trước đó deletedForever=true)`);

    // 2) Các bài còn lại: nếu có deletedAt (đã xoá mềm) → isDeleted = true
    const softDeleteResult = await Lesson.updateMany(
        { deletedAt: { $ne: null } },
        { $set: { isDeleted: true } }
    );
    console.log(`♻️  Đã set isDeleted=true cho ${softDeleteResult.modifiedCount} bài đang ở thùng rác`);

    // 3) Các bài chưa từng xoá → đảm bảo isDeleted = false (phòng trường hợp thiếu field)
    const activeResult = await Lesson.updateMany(
        { deletedAt: null, isDeleted: { $ne: false } },
        { $set: { isDeleted: false } }
    );
    console.log(`✅ Đã set isDeleted=false cho ${activeResult.modifiedCount} bài đang hoạt động`);

    // 4) Dọn field deletedForever không còn dùng
    const unsetResult = await Lesson.updateMany(
        { deletedForever: { $exists: true } },
        { $unset: { deletedForever: '' } }
    );
    console.log(`🧹 Đã xoá field deletedForever khỏi ${unsetResult.modifiedCount} document`);

    console.log('🎉 Migrate xong.');
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Migrate lỗi:', err);
    process.exit(1);
});
