// scripts/unsetLessonContentHtml.js
// ============================================================
// Xoá field `contentHtml` khỏi TẤT CẢ document trong collection `lessons`
// (chỉ bỏ field này — KHÔNG xoá bài học, KHÔNG đụng field khác).
//
// Cách chạy (từ thư mục gốc project):
//   node scripts/unsetLessonContentHtml.js            → chạy THỬ (dry-run): chỉ đếm + kiểm tra GitHub
//   node scripts/unsetLessonContentHtml.js --run      → XOÁ THẬT (chỉ với bài mà GitHub đã có đề)
//   node scripts/unsetLessonContentHtml.js --run --force → XOÁ THẬT cả bài GitHub thiếu đề (⚠️ mất dữ liệu)
//
// ✅ Khi chạy --run, script TỰ BACKUP (id + title + contentHtml) ra file
//   backup-lessons-contentHtml-<ngày>.json trong thư mục hiện tại → không cần mongodump.
// ⚠️ Deploy code mới (đọc đề từ GitHub) TRƯỚC khi chạy --run.
// ============================================================
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const lessonContentService = require('../services/lessonContentService');

const RUN = process.argv.includes('--run');
const FORCE = process.argv.includes('--force');

// Tự dò tên biến môi trường chứa chuỗi kết nối MongoDB (.env mỗi project đặt một kiểu)
function findMongoUri() {
    const names = ['MONGO_URI', 'MONGODB_URI', 'MONGO_URL', 'MONGODB_URL', 'MONGO_URI_ATLAS', 'DATABASE_URL', 'DB_URI', 'DB_URL', 'MONGO'];
    for (const n of names) if (process.env[n]) return { name: n, uri: process.env[n] };
    for (const [k, v] of Object.entries(process.env)) {
        if (/^mongodb(\+srv)?:\/\//.test(String(v || ''))) return { name: k, uri: v };
    }
    return null;
}

const fmt = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

(async () => {
    const found = findMongoUri();
    if (!found) {
        console.error('❌ Không tìm thấy chuỗi kết nối MongoDB trong .env.');
        console.error('   Mở file .env, xem biến nào bắt đầu bằng mongodb:// hoặc mongodb+srv:// rồi đặt tên đó vào mảng `names` ở hàm findMongoUri() trong script này.');
        console.error('   Các biến đang có trong .env:', Object.keys(process.env).filter((k) => /mongo|db|database|uri|url/i.test(k)).join(', ') || '(không có biến nào giống)');
        process.exit(1);
    }
    console.log(`Kết nối MongoDB bằng biến ${found.name}`);
    await mongoose.connect(found.uri);
    const lessons = mongoose.connection.collection('lessons');
    const subjects = mongoose.connection.collection('subjects');

    // Dùng collection gốc (không qua schema) vì model Lesson không còn field contentHtml
    const rows = await lessons
        .find({ contentHtml: { $exists: true } })
        .project({ title: 1, slug: 1, subjectId: 1, githubFile: 1, type: 1, contentHtml: 1 })
        .toArray();

    let bytes = 0;
    for (const r of rows) bytes += Buffer.byteLength(String(r.contentHtml || ''), 'utf8');
    console.log(`Số bài có field contentHtml: ${rows.length} (~${fmt(bytes)} nội dung)`);

    if (!rows.length) { await mongoose.disconnect(); return; }

    // ---- Kiểm tra GitHub đã có đề cho từng bài có nội dung trong Mongo ----
    const subjectDocs = await subjects
        .find({ _id: { $in: [...new Set(rows.map((r) => String(r.subjectId)))].map((id) => new mongoose.Types.ObjectId(id)) } })
        .project({ slug: 1 }).toArray();
    const slugOf = Object.fromEntries(subjectDocs.map((s) => [String(s._id), s.slug]));

    const safeIds = [];
    const problems = [];
    for (const r of rows) {
        const hasMongoContent = String(r.contentHtml || '').trim() !== '';
        if (!hasMongoContent) { safeIds.push(r._id); continue; }   // Mongo rỗng → xoá field không mất gì
        try {
            const json = await lessonContentService.getLessonContent(r, slugOf[String(r.subjectId)]);
            if (String(json.contentHtml || '').trim()) safeIds.push(r._id);
            else problems.push({ id: r._id, title: r.title, why: 'GitHub KHÔNG có contentHtml' });
        } catch (e) {
            problems.push({ id: r._id, title: r.title, why: `Không đọc được GitHub: ${e.message}` });
        }
    }

    console.log(`An toàn để xoá: ${safeIds.length} | Có vấn đề: ${problems.length}`);
    for (const p of problems) console.log(`  ⚠️  ${p.id}  "${p.title}"  → ${p.why}`);

    if (!RUN) {
        console.log('\n(Dry-run) Chưa xoá gì. Thêm --run để xoá thật.');
        await mongoose.disconnect(); return;
    }

    // ---- Tự backup trước khi xoá (không cần mongodump) ----
    const backupFile = `backup-lessons-contentHtml-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(
        backupFile,
        JSON.stringify(rows.map((r) => ({ _id: r._id, title: r.title, githubFile: r.githubFile, contentHtml: r.contentHtml })), null, 2),
        'utf8'
    );
    console.log(`💾 Đã backup ${rows.length} bài ra file: ${backupFile}`);

    const targetIds = FORCE ? rows.map((r) => r._id) : safeIds;
    if (FORCE && problems.length) console.log('⚠️  --force: sẽ xoá cả các bài "có vấn đề" ở trên!');

    const res = await lessons.updateMany(
        { _id: { $in: targetIds } },
        { $unset: { contentHtml: '' } }
    );
    console.log(`✅ Đã xoá contentHtml của ${res.modifiedCount} bài.`);

    const left = await lessons.countDocuments({ contentHtml: { $exists: true } });
    console.log(`Còn lại bài có contentHtml: ${left}${left ? ' (các bài có vấn đề ở trên — sửa GitHub rồi chạy lại)' : ''}`);

    await mongoose.disconnect();
})().catch((e) => { console.error('❌', e); process.exit(1); });
