// cleanup-db.js
// Chạy: node cleanup-db.js
// Dọn rác MongoDB, giữ data quan trọng

require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');

const Submission = require('./models/Submission');
const Session = require('mongoose').connection.collection('sessions');

// ============================================================
// CONFIG
// ============================================================
const DRY_RUN = process.env.CLEAN_DRY !== '0'; // mặc định DRY RUN

// ============================================================
// HELPERS
// ============================================================
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  DỌN RÁC MONGODB');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
        console.log(`   Database: ${mongoose.connection.name}`);
        console.log('');

        // ============================================================
        // SCAN — đếm trước khi xoá
        // ============================================================
        console.log('📊 Đang kiểm tra dữ liệu...');
        console.log('');

        const [totalSubs, failedSubs, pendingSubs, gradedSubs] = await Promise.all([
            Submission.countDocuments({}),
            Submission.countDocuments({ status: 'failed' }),
            Submission.countDocuments({ status: { $in: ['pending', 'grading'] } }),
            Submission.countDocuments({ status: 'graded' })
        ]);

        const sessionCount = await mongoose.connection
            .collection('sessions')
            .countDocuments({});

        // Đếm OTP cũ hơn 1 ngày
        let otpCount = 0;
        try {
            const OTP = require('./models/OTP');
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            otpCount = await OTP.countDocuments({ expiresAt: { $lt: oneDayAgo } });
        } catch (e) {
            console.log('   (Không có model OTP — bỏ qua)');
        }

        // Đếm notifications cũ hơn 30 ngày
        let oldNotifCount = 0;
        try {
            const Notification = require('./models/Notification');
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            oldNotifCount = await Notification.countDocuments({
                createdAt: { $lt: thirtyDaysAgo },
                isRead: true
            });
        } catch (e) {
            console.log('   (Không có model Notification — bỏ qua)');
        }

        // In bảng
        console.log('┌──────────────────────────────────────────┬──────────┐');
        console.log('│ Loại dữ liệu                             │ Số lượng │');
        console.log('├──────────────────────────────────────────┼──────────┤');
        console.log(`│ 📝 Submission - TOTAL                    │ ${String(totalSubs).padStart(8)} │`);
        console.log(`│ ❌ Submission - FAILED (rác)             │ ${String(failedSubs).padStart(8)} │`);
        console.log(`│ ⏳ Submission - PENDING/GRADING          │ ${String(pendingSubs).padStart(8)} │`);
        console.log(`│ ✅ Submission - GRADED (GIỮ)             │ ${String(gradedSubs).padStart(8)} │`);
        console.log(`│ 🔑 Sessions (đăng nhập cũ)               │ ${String(sessionCount).padStart(8)} │`);
        console.log(`│ 📧 OTP cũ hơn 1 ngày                     │ ${String(otpCount).padStart(8)} │`);
        console.log(`│ 🔔 Notifications cũ (đã đọc, >30 ngày)   │ ${String(oldNotifCount).padStart(8)} │`);
        console.log('└──────────────────────────────────────────┴──────────┘');
        console.log('');

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  KẾ HOẠCH DỌN DẸP');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('  ✅ GIỮ LẠI (không xoá):');
        console.log('     • Users, Subjects, Lessons');
        console.log('     • GradingPrompts, AIKeys');
        console.log('     • Submissions có status = "graded"');
        console.log('');
        console.log('  🗑️  XOÁ:');
        console.log(`     • ${failedSubs} submission status = "failed"`);
        console.log(`     • ${pendingSubs} submission status = "pending"/"grading" (bị treo)`);
        console.log(`     • ${sessionCount} session đăng nhập (sẽ logout hết)`);
        console.log(`     • ${otpCount} OTP đã hết hạn`);
        console.log(`     • ${oldNotifCount} notification cũ đã đọc`);
        console.log('');

        // ============================================================
        // EXECUTE
        // ============================================================
        let mode = DRY_RUN ? 'DRY RUN' : 'REAL';
        console.log(`⚠️  Chế độ: ${mode}`);
        console.log('');

        if (DRY_RUN) {
            console.log('💡 Để chạy thật, gõ lệnh:');
            console.log('   set CLEAN_DRY=0');
            console.log('   node cleanup-db.js');
            console.log('');
            console.log('👋 Chưa xoá gì cả. Thoát.');
            process.exit(0);
        }

        const answer = await ask('Bạn chắc chắn muốn XOÁ? Gõ "yes" để tiếp tục: ');
        if (answer !== 'yes') {
            console.log('');
            console.log('❌ Đã huỷ. Không xoá gì.');
            process.exit(0);
        }

        console.log('');
        console.log('🚀 Bắt đầu dọn dẹp...');
        console.log('');

        // 1. Xoá submission failed
        const delFailed = await Submission.deleteMany({ status: 'failed' });
        console.log(`   ✅ Xoá ${delFailed.deletedCount} submission failed`);

        // 2. Xoá submission pending/grading (bị treo)
        const delPending = await Submission.deleteMany({
            status: { $in: ['pending', 'grading'] }
        });
        console.log(`   ✅ Xoá ${delPending.deletedCount} submission pending/grading`);

        // 3. Xoá sessions
        const delSessions = await mongoose.connection
            .collection('sessions')
            .deleteMany({});
        console.log(`   ✅ Xoá ${delSessions.deletedCount} session`);

        // 4. Xoá OTP cũ
        if (otpCount > 0) {
            const OTP = require('./models/OTP');
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const delOtp = await OTP.deleteMany({ expiresAt: { $lt: oneDayAgo } });
            console.log(`   ✅ Xoá ${delOtp.deletedCount} OTP cũ`);
        }

        // 5. Xoá notifications cũ
        if (oldNotifCount > 0) {
            const Notification = require('./models/Notification');
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const delNotif = await Notification.deleteMany({
                createdAt: { $lt: thirtyDaysAgo },
                isRead: true
            });
            console.log(`   ✅ Xoá ${delNotif.deletedCount} notification cũ`);
        }

        // ============================================================
        // FINAL STATS
        // ============================================================
        console.log('');

        const finalSubs = await Submission.countDocuments({});
        const finalGraded = await Submission.countDocuments({ status: 'graded' });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✅ HOÀN TẤT');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   📝 Submission còn lại : ${finalSubs}`);
        console.log(`   ✅ Trong đó đã chấm    : ${finalGraded}`);
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ LỖI:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();