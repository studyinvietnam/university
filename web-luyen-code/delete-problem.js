require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./src/models/Problem');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Problem.findByIdAndDelete('6a9c110ca96c6f9ef4486452');
    if (result) {
      console.log('✅ Đã xóa bài:', result.name);
    } else {
      console.log('❌ Không tìm thấy bài');
    }
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();