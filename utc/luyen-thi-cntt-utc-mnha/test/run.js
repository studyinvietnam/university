const h = require('./harness');
const assert = require('assert');
const { ObjectId, repo, put, del, subjects } = h;
const R = h.ROOT;
const store = require(R + '/services/githubStore');
const Lesson = require(R + '/models/Lesson');
const Prompt = require(R + '/models/GradingPrompt');
const Sub = require(R + '/models/Submission');
const sync = require(R + '/services/githubSyncService');
const hex = () => new ObjectId().toHexString();

let pass = 0; const t = async (name, fn) => { try { await fn(); pass++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.stack.split('\n').slice(0, 4).join('\n    ')); process.exitCode = 1; } };

const subjId = hex(), subj2 = hex(), uk = hex(), u1 = hex(), u2 = hex(), adm = hex();
subjects.push({ _id: new ObjectId(subjId), slug: 'ctdl-1', userKey: new ObjectId(uk) }, { _id: new ObjectId(subj2), slug: 'oop-1' });
const L1 = hex(), L2 = hex(), P1 = hex(), S1 = hex(), S2 = hex();

put('subjects/ctdl-1/lessons/de-1.json', { lessonId: L1, title: 'Đề 1', slug: 'de-1', description: 'mô tả', duration: 30, content: 'NẶNG', promptId: P1, createdBy: adm, createdAt: '2026-01-01T00:00:00Z' });
put('subjects/ctdl-1/lessons/de-2.json', { title: 'Đề 2 (không có id)', isPublished: false });
put('subjects/oop-1/lessons/de-3.json', { title: 'OOP', type: 'quiz', quiz: { parts: { mcq: { questions: [1, 2, 3] } } } });
put('subjects/khong-co/lessons/x.json', { title: 'môn không tồn tại' });
put('prompts/aaa.json', { promptId: P1, name: 'Prompt A', kind: 'essay', strictness: 'strict', maxScore: 10, isDefault: true });
put('submissions/ctdl-1/de-1/' + u1 + '-1.json', { submissionId: S1, userId: u1, lessonId: L1, score: 8, status: 'graded', model: 'gemini', submittedAt: '2026-02-01T00:00:00Z', grammar: { errors: [1, 2] } });
put('submissions/ctdl-1/de-1/' + u2 + '-2.json', { submissionId: S2, userId: u2, score: 5, submittedAt: '2026-02-02T00:00:00Z' }); // không lessonId → tra theo slug
put('submissions/ctdl-1/de-1/bad.json', { score: 1 });                // thiếu userId → bỏ qua

(async () => {
  console.log('Nạp lần đầu');
  await t('nạp được lessons/prompts/submissions, bỏ qua file lỗi', async () => {
    const r = await sync.syncKinds(['lessons', 'prompts', 'submissions']);
    assert.strictEqual(r[0].files, 4); assert.strictEqual(await Lesson.countDocuments({}), 3);
    assert.strictEqual(await Prompt.countDocuments({}), 1); assert.strictEqual(await Sub.countDocuments({}), 2);
    assert.strictEqual(repo.calls.graphql >= 3, true);
  });
  await t('findById / lean / field mapping', async () => {
    const l = await Lesson.findById(L1).lean();
    assert.strictEqual(l.title, 'Đề 1'); assert.strictEqual(l.duration, 30); assert.strictEqual(String(l.userKey), uk);
    assert.strictEqual(l.content, undefined, 'không giữ nội dung nặng trong RAM');
    assert.strictEqual(l.isDeleted, false);
  });
  await t('id ổn định cho file không có id (nạp lại ra cùng id)', async () => {
    const a = (await Lesson.findOne({ title: /không có id/ }).lean())._id.toHexString();
    store._reset(); await sync.syncKinds(null);
    const b = (await Lesson.findOne({ title: /không có id/ }).lean())._id.toHexString();
    assert.strictEqual(a, b);
  });
  await t('lọc: $in, $ne, $or, regex, sort, skip, limit, select', async () => {
    assert.strictEqual((await Lesson.find({ subjectId: { $in: [new ObjectId(subjId)] }, isDeleted: false })).length, 2);
    assert.strictEqual((await Lesson.find({ isPublished: { $ne: false } })).length, 2);
    assert.strictEqual((await Lesson.find({ $or: [{ title: /OOP/i }, { slug: 'de-1' }] })).length, 2);
    const s = await Lesson.find({}).sort({ title: 1 }).skip(1).limit(1).select('title').lean();
    assert.deepStrictEqual(Object.keys(s[0]).sort(), ['_id', 'title']);
    assert.strictEqual((await Lesson.find({ userKey: new ObjectId(uk) }).distinct('_id')).length, 2);
  });
  await t('aggregate đếm bài theo môn', async () => {
    const rows = await Lesson.aggregate([{ $match: { subjectId: { $in: [new ObjectId(subjId), new ObjectId(subj2)] }, isDeleted: false } }, { $group: { _id: '$subjectId', count: { $sum: 1 } } }]);
    const m = Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
    assert.strictEqual(m[subjId], 2); assert.strictEqual(m[subj2], 1);
  });
  await t('bài nộp: khớp lesson theo slug, populate lesson + user', async () => {
    const s = await Sub.findById(S2).populate('lessonId', 'title slug').populate('userId', 'name').lean();
    assert.strictEqual(s.lessonId.title, 'Đề 1'); assert.strictEqual(s.userId.name, 'U-' + u2.slice(-4));
    assert.strictEqual((await Sub.findById(S1)).errorCount, 2);
  });
  await t('lịch sử theo user + sort + prompt default', async () => {
    const h2 = await Sub.find({ userId: new ObjectId(u1), lessonId: new ObjectId(L1) }).sort({ createdAt: -1 }).lean();
    assert.strictEqual(h2.length, 1);
    assert.strictEqual((await Prompt.findOne({ kind: 'essay', isDefault: true, active: { $ne: false } }).lean()).name, 'Prompt A');
  });

  console.log('Webhook');
  await t('push: sửa + thêm + xoá chỉ đọc đúng file đổi', async () => {
    store._state.checkedAt = Date.now();
    const before = repo.calls.tree;
    put('subjects/ctdl-1/lessons/de-1.json', { lessonId: L1, title: 'Đề 1 (đã sửa)', slug: 'de-1' });
    put('subjects/ctdl-1/lessons/de-4.json', { title: 'Đề 4 mới' });
    del('subjects/oop-1/lessons/de-3.json');
    const r = await store.applyPush({ ref: 'refs/heads/main', after: repo.head, commits: [
      { added: ['subjects/ctdl-1/lessons/de-4.json'], modified: ['subjects/ctdl-1/lessons/de-1.json'], removed: ['subjects/oop-1/lessons/de-3.json'] }] });
    assert.deepStrictEqual([r.imported, r.updated, r.removed], [1, 1, 1]);
    assert.strictEqual(repo.calls.tree, before, 'không phải lấy lại cây thư mục');
    assert.strictEqual((await Lesson.findById(L1).lean()).title, 'Đề 1 (đã sửa)');
    assert.strictEqual(await Lesson.countDocuments({}), 3);
  });
  await t('push cho nhánh khác bị bỏ qua', async () => {
    const r = await store.applyPush({ ref: 'refs/heads/dev', commits: [] }); assert.ok(r.ignored);
  });
  await t('tạo bài nộp mới bằng webhook (slug môn/bài từ đường dẫn)', async () => {
    const id = hex(); const p = 'submissions/ctdl-1/de-1/' + u1 + '-9.json';
    put(p, { submissionId: id, userId: u1, score: 9, status: 'graded' });
    await store.applyPush({ ref: 'refs/heads/main', after: repo.head, commits: [{ added: [p] }] });
    const s = await Sub.findById(id).lean(); assert.strictEqual(s.score, 9); assert.strictEqual(String(s.lessonId), L1);
  });

  console.log('Lưới an toàn (instance không nhận webhook)');
  await t('đổi trên GitHub, không webhook → request sau tự bắt kịp', async () => {
    put('subjects/ctdl-1/lessons/de-5.json', { title: 'Đề 5 (thêm tay)' });
    store._state.checkedAt = 0;
    await sync.syncKinds(['lessons']);
    assert.ok(await Lesson.findOne({ title: /Đề 5/ }));
    del('subjects/ctdl-1/lessons/de-5.json'); store._state.checkedAt = 0;
    await sync.syncKinds(['lessons']);
    assert.strictEqual(await Lesson.findOne({ title: /Đề 5/ }), null);
  });
  await t('không có thay đổi → chỉ 1 request đầu nhánh (304), không đọc cây', async () => {
    await sync.syncKinds(null); store._state.checkedAt = 0;
    const before = { ...repo.calls }; await sync.syncKinds(null);
    assert.strictEqual(repo.calls.tree, before.tree); assert.strictEqual(repo.calls.graphql, before.graphql);
  });

  console.log('Ghi');
  await t('create sau khi controller đã ghi JSON → KHÔNG commit thừa', async () => {
    const id = hex(); const p = 'subjects/ctdl-1/lessons/moi.json';
    put(p, { lessonId: id, title: 'Mới', slug: 'moi', isDeleted: false, isPublished: true, duration: 20, order: 0, type: 'essay', description: '', sampleSolution: '', analysisAiKeyIds: [] });
    const w = repo.calls.write;
    await Lesson.create({ _id: id, subjectId: new ObjectId(subjId), title: 'Mới', slug: 'moi', githubFile: p, githubSha: repo.files.get(p).sha, type: 'essay' });
    assert.strictEqual(repo.calls.write, w);
    assert.ok(await Lesson.findById(id));
  });
  await t('updateOne đổi chỉ mục → commit patch vào JSON, giữ nguyên nội dung nặng', async () => {
    const w = repo.calls.write;
    await Lesson.updateOne({ _id: L1 }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: new ObjectId(adm) } });
    assert.strictEqual(repo.calls.write, w + 1);
    const json = JSON.parse(repo.files.get('subjects/ctdl-1/lessons/de-1.json').text);
    assert.strictEqual(json.isDeleted, true); assert.strictEqual(json.deletedBy, adm);
    await Lesson.updateOne({ _id: L1 }, { $set: { isDeleted: true } });        // không đổi → không commit
    assert.strictEqual(repo.calls.write, w + 1);
  });
  await t('doc.save() (document không lean)', async () => {
    const d = await Lesson.findById(L1); d.isDeleted = false; d.deletedAt = null; d.deletedBy = null; d.title = 'Đề 1 v3';
    await d.save();
    assert.strictEqual(JSON.parse(repo.files.get('subjects/ctdl-1/lessons/de-1.json').text).title, 'Đề 1 v3');
    assert.strictEqual((await Lesson.findById(L1).lean()).title, 'Đề 1 v3');
  });
  await t('bài nộp pending/grading KHÔNG ghi GitHub; graded có file thì khớp', async () => {
    const w = repo.calls.write, r0 = repo.calls.readFile;
    const sub = await Sub.create({ userId: new ObjectId(u1), lessonId: new ObjectId(L1), subjectId: new ObjectId(subjId), status: 'pending' });
    await Sub.updateOne({ _id: sub._id }, { $set: { status: 'grading' } });
    assert.strictEqual(repo.calls.write, w); assert.strictEqual(repo.calls.readFile, r0);
    assert.strictEqual((await Sub.findById(sub._id).lean()).status, 'grading');
    const upd = await Sub.findOneAndUpdate({ _id: S1 }, { $inc: { analysisCount: 1 }, $set: { lastAnalyzedAt: new Date() } }, { new: true });
    assert.strictEqual(upd.analysisCount, 1);
  });
  await t('nhận xét giáo viên được ghi vào JSON', async () => {
    const p = 'submissions/ctdl-1/de-1/' + u1 + '-1.json';
    await Sub.updateOne({ _id: S1 }, { $set: { teacherComment: { content: 'Tốt', commentedBy: new ObjectId(adm), commentedByName: 'GV', commentedAt: new Date() } } });
    assert.strictEqual(JSON.parse(repo.files.get(p).text).teacherComment.content, 'Tốt');
  });
  await t('deleteOne gỡ khỏi RAM', async () => {
    await Lesson.deleteOne({ _id: L1 }); assert.strictEqual(await Lesson.findById(L1), null);
  });
  await t('Model.schema.path / modelName / exists / static', async () => {
    assert.ok(Lesson.schema.path('userKey')); assert.ok(Lesson.schema.path('createdBy')); assert.strictEqual(Lesson.modelName, 'Lesson');
    assert.ok(await Prompt.exists({ name: 'Prompt A' })); assert.strictEqual(Lesson.getAiLabel(null), 'gemini:default');
  });

  console.log(`\n${pass} test đạt`);
})();
