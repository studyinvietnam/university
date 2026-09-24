// sync-failed.js
// Chạy: node sync-failed.js
// Đẩy tất cả submission có status "failed" hoặc "pending" lên GitHub

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
const FILTER_STATUS = process.env.SYNC_FILTER || 'failed,pending';
const DRY_RUN = process.env.SYNC_DRY === '1'; // =1 chỉ in, không đẩy

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
        console.log('  ĐẨY SUBMISSION LÊN GITHUB');
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
            throw new Error(
                'GitHub chưa cấu hình. Thêm GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO vào .env'
            );
        }

        // Parse filter
        const statusList = FILTER_STATUS.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`🔎 Tìm submission có status: ${statusList.join(', ')}`);
        console.log(`   DRY RUN: ${DRY_RUN ? 'CÓ (chỉ in, không đẩy)' : 'KHÔNG'}`);
        console.log('');

        // Query submissions
        const submissions = await Submission.find({
            status: { $in: statusList }
        })
            .populate('userId', 'name email')
            .populate('lessonId', 'title slug githubFile duration contentHtml sampleSolution')
            .populate('subjectId', 'name code slug')
            .sort({ createdAt: 1 })
            .lean();

        console.log(`📦 Tìm thấy ${submissions.length} submission`);
        console.log('');

        if (submissions.length === 0) {
            console.log('✅ Không có submission nào cần đẩy.');
            process.exit(0);
        }

        // Loop
        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < submissions.length; i++) {
            const s = submissions[i];
            const idx = i + 1;

            console.log('─'.repeat(60));
            console.log(`[${idx}/${submissions.length}] Submission ${s._id}`);
            console.log(`   User   : ${s.userId?.name || s.userId?.email || 'N/A'}`);
            console.log(`   Lesson : ${s.lessonId?.title || 'N/A'}`);
            console.log(`   Status : ${s.status}`);
            console.log(`   Score  : ${s.score !== null && s.score !== undefined ? s.score : '—'}`);
            console.log(`   Time   : ${fmtDate(s.submittedAt || s.createdAt)}`);

            // Kiểm tra có subject.slug và lesson.slug không
            const subject = s.subjectId;
            const lesson = s.lessonId;

            if (!subject || !subject.slug) {
                console.log(`   ⏭ BỎ QUA — Thiếu subject.slug`);
                skippedCount++;
                continue;
            }
            if (!lesson || !lesson.slug) {
                console.log(`   ⏭ BỎ QUA — Thiếu lesson.slug`);
                skippedCount++;
                continue;
            }

            // Tạo path
            const filePath = githubService.submissionPath(
                subject.slug,
                lesson.slug,
                String(s.userId?._id || s.userId),
                s.submittedAt || s.createdAt
            );

            console.log(`   Path   : ${filePath}`);

            // Payload
            const payload = {
                submissionId: String(s._id),
                submittedAt: s.submittedAt,
                gradedAt: s.gradedAt,

                userId: String(s.userId?._id || s.userId),
                userName: s.userId?.name || null,
                userEmail: s.userId?.email || null,

                subjectId: String(subject._id),
                subjectName: subject.name || null,
                subjectCode: subject.code || null,
                subjectSlug: subject.slug || null,

                lessonId: String(lesson._id),
                lessonTitle: lesson.title || null,
                lessonSlug: lesson.slug || null,
                lessonDuration: lesson.duration || 20,
                lessonContentHtml: lesson.contentHtml || '',
                lessonSampleSolution: lesson.sampleSolution || '',

                answerHtml: s.answerHtml || '',

                score: s.score,
                feedback: s.feedback || '',
                breakdown: s.breakdown || [],
                grammar: s.grammar || null,
                sampleComparison: s.sampleComparison || null,

                model: s.model || null,
                aiKeyId: s.aiKeyId || null,
                aiKeyName: s.aiKeyName || null,
                latencyMs: s.latencyMs || null,

                promptSnapshot: s.promptSnapshot || null,

                // Metadata lỗi (nếu có)
                status: s.status,
                errorMessage: s.errorMessage || null
            };

            if (DRY_RUN) {
                console.log(`   🧪 DRY RUN — Bỏ qua đẩy`);
                continue;
            }

            // Đẩy lên GitHub
            try {
                const result = await githubService.writeJsonFile(
                    filePath,
                    payload,
                    `[Submission] ${lesson.title} - ${s.userId?.email || '?'} - ${s.score ?? "?"}/10`
                );

                console.log(`   ✅ Đã đẩy: ${result.url}`);

                // Cập nhật MongoDB
                await Submission.updateOne(
                    { _id: s._id },
                    {
                        $set: {
                            syncStatus: 'committed',
                            githubFile: filePath,
                            syncedAt: new Date()
                        }
                    }
                );

                successCount++;
            } catch (err) {
                console.log(`   ❌ Lỗi: ${err.message}`);
                failCount++;

                // Cập nhật syncStatus failed
                try {
                    await Submission.updateOne(
                        { _id: s._id },
                        {
                            $set: {
                                syncStatus: 'failed',
                                syncError: err.message
                            }
                        }
                    );
                } catch (_) {}
            }

            // Delay nhẹ tránh rate limit
            await new Promise(r => setTimeout(r, 500));
        }

        // Tổng kết
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  📊 TỔNG KẾT');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   ✅ Thành công : ${successCount}`);
        console.log(`   ❌ Thất bại   : ${failCount}`);
        console.log(`   ⏭ Bỏ qua      : ${skippedCount}`);
        console.log(`   📦 Tổng cộng  : ${submissions.length}`);
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ LỖI:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
})();