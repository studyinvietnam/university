// scripts/delete-orphan-submissions.js
// Xoá các file bài nộp "mồ côi" (không còn bài học tương ứng) khỏi GitHub.
//   Xem trước (mặc định, KHÔNG xoá):  node scripts/delete-orphan-submissions.js
//   Xoá thật:                          node scripts/delete-orphan-submissions.js --yes
// Cần .env có GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO. NÊN sao lưu repo trước.
require('dotenv').config();
const github = require('../services/githubService');

const PATHS = [
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-1-20260925-chua1asm/6ab3d694415010bf620349e5-2026-09-30T16-20-11-190Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-1-20260925-chua1asm/6ab3d694415010bf620349e5-2026-09-30T16-21-57-842Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-1-20260925-chua1asm/6ab3d694415010bf620349e5-2026-09-30T16-23-18-013Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-2-20260925-chua2asm/6ab3d694415010bf620349e5-2026-10-01T18-22-29-416Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-2-20260925-chua2asm/6ab3d694415010bf620349e5-2026-10-01T18-23-52-647Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-2-20260925-chua2asm/6ab3d694415010bf620349e5-2026-10-01T18-24-56-750Z.json',
  'submissions/kien-truc-va-to-chuc-may-tinh-1-1-26n06/phan-tich-8086-de-2-20260925-chua2asm/6ab3d694415010bf620349e5-2026-10-01T18-25-49-811Z.json',
  'submissions/lap-trinh-huong-doi-tuong-1-1-26n04/kiem-tra-ngan-oop-c-de-2-05102026/6ab3d694415010bf620349e5-2026-10-05T15-31-49-212Z.json',
];

(async () => {
  const really = process.argv.includes('--yes');
  console.log(really ? 'XOÁ THẬT' : 'XEM TRƯỚC (thêm --yes để xoá)', `- ${PATHS.length} file`);
  for (const p of PATHS) {
    if (!(await github.fileExists(p))) { console.log('  (không còn)', p); continue; }
    if (!really) { console.log('  sẽ xoá  ', p); continue; }
    await github.deleteFile(p, 'Dọn bài nộp mồ côi (không còn bài học)');
    console.log('  đã xoá  ', p);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
