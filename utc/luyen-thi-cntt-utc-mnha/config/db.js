// config/db.js
const mongoose = require('mongoose');

/**
 * Kết nối MongoDB bằng MONGO_URI trong .env
 * - Tự động retry khi mất kết nối (Mongoose >= 6 có sẵn cơ chế)
 * - Log rõ trạng thái để dễ debug
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ Thiếu MONGO_URI trong .env');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      // Tùy chọn hợp lý cho dev + prod nhỏ
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== 'production' // prod nên tắt autoIndex
    });

    console.log('✅ MongoDB connected:', mongoose.connection.host);

    // Log sự kiện
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    return mongoose.connection;
  } catch (err) {
    console.error('❌ Không thể kết nối MongoDB:', err.message);
    process.exit(1);
  }
}

/**
 * Ngắt kết nối an toàn (dùng khi shutdown server)
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (err) {
    console.error('Lỗi khi đóng MongoDB:', err.message);
  }
}

module.exports = { connectDB, disconnectDB };