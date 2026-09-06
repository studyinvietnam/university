// src/config/database.js

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI chưa được cấu hình');
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        isConnected = true;

        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);

        // QUAN TRỌNG:
        // Không được process.exit(1) trên Vercel
        throw err;
    }
};

module.exports = connectDB;