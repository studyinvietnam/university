// purge-answer-html.js
// Chạy: node purge-answer-html.js
//
// Mục đích:
//   1. Với mỗi submission có answerHtml trong MongoDB:
//      - Đẩy lên GitHub (nếu chưa committed)
//      - Sau khi đẩy thành công → XOÁ answerHtml khỏi MongoDB
//   2. Giữ lại MongoDB các field metadata (score, feedback, breakdown, ...)
//
// Chế độ:
//   - Mặc định: DRY RUN (không xoá gì)
//   - Chạy thật: set PURGE_DRY=0

require('dotenv').config();

const mongoose = require('mongoose');

const Submission = require('./models/Submission');
const Lesson = require('./models/Lesson');
const Subject = require('./models/Subject');
const User = require('./models/User');
const githubService = require('./services/githubService');

// ============================================================
// CONFIG
// ============================================================
const DRY_RUN = process.env.PURGE_DRY !== '0';
const DELAY_BETWEEN_MS = 600;

// ============================================================
// HELPERS
// ============================================================
function fmtDate(d) {
    return d ? new Date(d).toLocaleString('vi-VN') : '—';
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    try {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ĐẨY answerHtml LÊN GITHUB + XOÁ KHỎI MONGODB');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI chưa cấu hình trong .env');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Kiểm tra GitHub config
        console.log('');
        console.log('📡 GitHub config:');
        console.log(`   isConfigured : ${githubService.isConfigured}`);
        console.log(`   owner        : ${githubService.owner || '(trống)'}`);
        console.log(`   repo         : ${githubService.repo || '(trống)'}`);
        console.log(`   branch       : ${githubService.branch || '(trống)'}`);
        console.log('');

        if (!githubService.isConfigured) {
            console.log('⚠️  GitHub CHƯA cấu hình.');
            console.log('   → Script vẫn chạy nhưng KHÔNG đẩy lên GitHub.');
            console.log('   → Chỉ xoá answerHtml nếu force.');
            console.log('');
        }

        console.log(`   Chế độ: ${DRY_RUN ? '🧪 DRY RUN (không xoá)' : '🔴 CHẠY THẬT'}`);
        console.log('');

        // ============================================================
        // QUERY — chỉ lấy submission còn answerHtml
        // ============================================================
        const submissions = await Submission.find({
            answerHtml: { $ne: '', $exists: true },
            status: { $in: ['graded', 'failed', 'pending'] }
        })
            .populate('userId', 'name email')
            .populate('lessonId', 'title slug contentHtml sampleSolution duration')
            .populate('subjectId', 'name code slug')
            .sort({ createdAt: 1 })
            .lean();

        console.log(`📦 Tìm thấy ${submissions.length} submission còn answerHtml`);
        console.log('');

        if (submissions.length === 0) {
            console.log('✅ Không có gì cần làm.');
            process.exit(0);
        }

        // ============================================================
        // LOOP
        // ============================================================
        let pushedCount = 0;
        let clearedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;
        let totalBytesCleared = 0;

        for (let i = 0; i < submissions.length; i++) {
            const s = submissions[i];
            const idx = i + 1;

            const answerLen = (s.answerHtml || '').length;
            const answerBytes = Buffer.byteLength(s.answerHtml || '', 'utf8');

            console.log('─'.repeat(60));
            console.log(`[${idx}/${submissions.length}] ${s._id}`);
            console.log(`   User     : ${s.userId?.name || s.userId?.email || 'N/A'}`);
            console.log(`   Lesson   : ${s.lessonId?.title || 'N/A'}`);
            console.log(`   Status   : ${s.status} | syncStatus: ${s.syncStatus}`);
            console.log(`   answer   : ${answerLen} ký tự (${(answerBytes / 1024).toFixed(2)} KB)`);
            console.log(`   Ngày nộp : ${fmtDate(s.submittedAt || s.createdAt)}`);

            if (DRY_RUN) {
                console.log(`   🧪 DRY RUN — bỏ qua`);
                continue;
            }

            // ========================================================
            // Chuẩn bị path GitHub
            // ========================================================
            const subject = s.subjectId;
            const lesson = s.lessonId;

            const canPushGitHub =
                githubService.isConfigured &&
                subject &&
                subject.slug &&
                lesson &&
                lesson.slug;

            let githubFilePath = null;

            if (canPushGitHub) {
                if (typeof githubService.submissionPath === 'function') {
                    githubFilePath = githubService.submissionPath(
                        subject.slug,
                        lesson.slug,
                        String(s.userId?._id || s.userId),
                        s.submittedAt || s.createdAt
                    );
                } else {
                    const ts = new Date(s.submittedAt || s.createdAt)
                        .toISOString()
                        .replace(/[:.]/g, '-');
                    githubFilePath = `submissions/${subject.slug}/${lesson.slug}/${s.userId}-${ts}.json`;
                }
                console.log(`   Path     : ${githubFilePath}`);
            } else {
                console.log(`   ⏭ Không đẩy được GitHub (thiếu config hoặc slug)`);
            }

            // ========================================================
            // Đẩy lên GitHub (nếu cần)
            // ========================================================
            let pushOk = false;

            if (canPushGitHub && s.syncStatus !== 'committed') {
                const payload = {
                    // Metadata
                    submissionId: String(s._id),
                    submittedAt: s.submittedAt,
                    gradedAt: s.gradedAt,

                    // User
                    userId: String(s.userId?._id || s.userId),
                    userName: s.userId?.name || null,
                    userEmail: s.userId?.email || null,

                    // Môn học
                    subjectId: String(subject._id),
                    subjectName: subject.name || null,
                    subjectCode: subject.code || null,
                    subjectSlug: subject.slug || null,

                    // Bài học
                    lessonId: String(lesson._id),
                    lessonTitle: lesson.title || null,
                    lessonSlug: lesson.slug || null,
                    lessonDuration: lesson.duration || 20,
                    lessonContentHtml: lesson.contentHtml || '',
                    lessonSampleSolution: lesson.sampleSolution || '',

                    // Bài làm
                    answerHtml: s.answerHtml || '',

                    // Kết quả
                    score: s.score,
                    feedback: s.feedback || '',
                    breakdown: s.breakdown || [],
                    grammar: s.grammar || null,
                    sampleComparison: s.sampleComparison || null,

                    // AI
                    model: s.model || null,
                    aiKeyId: s.aiKeyId || null,
                    aiKeyName: s.aiKeyName || null,
                    latencyMs: s.latencyMs || null,

                    // Prompt snapshot
                    promptSnapshot: s.promptSnapshot || null,

                    // Trạng thái cũ (để trace)
                    originalStatus: s.status,
                    originalErrorMessage: s.errorMessage || null
                };

                try {
                    const result = await githubService.writeJsonFile(
                        githubFilePath,
                        payload,
                        `[Submission] ${lesson.title} - ${s.userId?.email || '?'} - ${s.score ?? "?"}/10`
                    );
                    console.log(`   📤 Đã đẩy: ${result.url}`);
                    pushOk = true;
                    pushedCount++;
                } catch (err) {
                    console.log(`   ❌ Đẩy fail: ${err.message}`);
                    failedCount++;
                    // Không xoá answerHtml nếu đẩy fail
                    continue;
                }

                // Delay tránh rate limit
                await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
            } else if (s.syncStatus === 'committed') {
                console.log(`   ℹ️  Đã committed từ trước — chỉ xoá answerHtml`);
                pushOk = true;
            } else if (!canPushGitHub) {
                console.log(`   ⏭ Bỏ qua đẩy GitHub — CHỈ xoá nếu force`);
                // Nếu không có GitHub → vẫn xoá? → Không, vì sẽ mất data
                skippedCount++;
                continue;
            }

            // ========================================================
            // XOÁ answerHtml khỏi MongoDB (chỉ khi đã đẩy thành công)
            // ========================================================
            if (pushOk) {
                try {
                    await Submission.updateOne(
                        { _id: s._id },
                        {
                            $set: {
                                answerHtml: '',
                                syncStatus: 'committed',
                                githubFile: githubFilePath,
                                syncedAt: new Date()
                            }
                        }
                    );
                    console.log(`   🗑️  Đã xoá answerHtml (${(answerBytes / 1024).toFixed(2)} KB) khỏi DB`);
                    clearedCount++;
                    totalBytesCleared += answerBytes;
                } catch (err) {
                    console.log(`   ❌ Xoá fail: ${err.message}`);
                    failedCount++;
                }
            }
        }

        // ============================================================
        // TỔNG KẾT
        // ============================================================
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  📊 TỔNG KẾT');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   📤 Đã đẩy GitHub      : ${pushedCount}`);
        console.log(`   🗑️  Đã xoá answerHtml : ${clearedCount}`);
        console.log(`   💾 Dung lượng giải phóng: ${(totalBytesCleared / 1024).toFixed(2)} KB`);
        console.log(`   ❌ Thất bại           : ${failedCount}`);
        console.log(`   ⏭ Bỏ qua              : ${skippedCount}`);
        console.log(`   📦 Tổng cộng          : ${submissions.length}`);
        console.log('');

        if (DRY_RUN) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('  💡 ĐỂ CHẠY THẬT');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            console.log('   set PURGE_DRY=0');
            console.log('   node purge-answer-html.js');
            console.log('');
        }

        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ LỖI:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();