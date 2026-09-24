// cleanup-failed.js
// Chạy: node cleanup-failed.js
// Xoá tất cả submission có status = "failed"

require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');

const Submission = require('./models/Submission');

const DRY_RUN = process.env.CLEAN_FAILED_DRY !== '0';

function ask(q) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim().toLowerCase()); }));
}

(async () => {
    try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  XOÁ SUBMISSION FAILED KHỎI MONGODB');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
        console.log(`   Chế độ: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 CHẠY THẬT'}`);
        console.log('');

        // Đếm theo status
        const stats = await Submission.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, avgLen: { $avg: { $strLenCP: '$answerHtml' } } } }
        ]);

        console.log('📊 Thống kê submission theo status:');
        console.log('');
        console.log('┌──────────────────┬──────────┬──────────────────┐');
        console.log('│ Status           │ Số lượng │ answerHtml (TB)  │');
        console.log('├──────────────────┼──────────┼──────────────────┤');
        stats.forEach((s) => {
            const st = String(s._id || 'unknown').padEnd(16);
            const cnt = String(s.count).padStart(8);
            const avg = Math.round(s.avgLen || 0);
            console.log(`│ ${st} │ ${cnt} │ ${String(avg + ' ký tự').padStart(16)} │`);
        });
        console.log('└──────────────────┴──────────┴──────────────────┘');
        console.log('');

        const failed = await Submission.find({ status: 'failed' })
            .select('answerHtml')
            .lean();

        if (failed.length === 0) {
            console.log('✅ Không có submission failed nào.');
            process.exit(0);
        }

        const totalBytes = failed.reduce((sum, s) => sum + Buffer.byteLength(s.answerHtml || '', 'utf8'), 0);

        console.log(`🗑️  Sẽ xoá ${failed.length} submission failed`);
        console.log(`💾 Tiết kiệm ~${(totalBytes / 1024).toFixed(2)} KB`);
        console.log('');

        if (DRY_RUN) {
            console.log('💡 Chạy thật:');
            console.log('   set CLEAN_FAILED_DRY=0');
            console.log('   node cleanup-failed.js');
            process.exit(0);
        }

        const ans = await ask('Chắc chắn XOÁ? Gõ "yes": ');
        if (ans !== 'yes') {
            console.log('❌ Đã huỷ.');
            process.exit(0);
        }

        console.log('');
        const del = await Submission.deleteMany({ status: 'failed' });
        console.log(`✅ Đã xoá ${del.deletedCount} submission failed`);
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('❌ LỖI:', err.message);
        process.exit(1);
    }
})();