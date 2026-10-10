const h = require('./harness'); const assert = require('assert'); const R = h.ROOT;
const store = require(R + '/services/githubStore'); const Lesson = require(R + '/models/Lesson');
(async () => {
  const sid = new h.ObjectId().toHexString(); const id = new h.ObjectId().toHexString(); const pid = new h.ObjectId().toHexString();
  const l = await Lesson.create({ _id: id, subjectId: sid, title: 'x' });
  assert.ok(typeof l.subjectId.toHexString === 'function', 'create ép id');
  const d = await Lesson.findById(id); d.promptId = pid; d.analysisAiKeyIds = [pid]; await d.save();
  const r = await Lesson.findById(id).lean();
  assert.ok(typeof r.promptId.equals === 'function' && typeof r.analysisAiKeyIds[0].toHexString === 'function', 'save ép id');
  await Lesson.updateOne({ _id: id }, { $set: { aiKeyId: pid } });
  assert.ok(typeof (await Lesson.findById(id).lean()).aiKeyId.toHexString === 'function', 'updateOne ép id');
  assert.strictEqual((await Lesson.find({ promptId: pid })).length, 1, 'lọc theo chuỗi khớp ObjectId');
  console.log('cast id: đạt');
})().catch((e) => { console.error(e); process.exit(1); });
