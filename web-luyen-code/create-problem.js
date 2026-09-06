require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./src/models/Problem');

const data = {
  subjectId: new mongoose.Types.ObjectId('6a9c00047f441cf7a7a74bdf'),
  chapterId: new mongoose.Types.ObjectId('6a9c078b0a27bc35dbf55e96'),
  name: "Xây dựng lớp Phân số",
  code: "000001",
  statement: "Xây dựng lớp Phân số gồm các thuộc tính:\n\nTử số\nMẫu số\n\nVà các phương thức:\n- Tối giản phân số\n- Cộng, trừ, nhân, chia\n- So sánh hai phân số\n\nYêu cầu: Viết chương trình nhập vào hai phân số, thực hiện các phép toán và in kết quả.",
  exampleInput: "1 2 3 4",
  exampleOutput: "Phan so thu nhat: 1/2\nPhan so thu hai: 3/4\nTong: 5/4\nHieu: -1/4\nTich: 3/8\nThuong: 2/3",
  languages: ["cpp"],
  score: 10,
  status: "published",
  gradingRequirements: "Phải xây dựng lớp Phân số đúng cấu trúc.\nCác phép toán phải trả về phân số tối giản.\nKhông dùng thư viện ngoài.",
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const problem = new Problem(data);
    await problem.save();
    console.log('✅ Đã tạo bài mới:', problem.name);
    console.log('📌 ID:', problem._id);
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();