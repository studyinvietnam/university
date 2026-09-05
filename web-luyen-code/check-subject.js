require('dotenv').config();
const mongoose = require('mongoose');

const Subject = mongoose.model(
  'Subject',
  new mongoose.Schema({ name: String, code: String, status: String }),
  'subjects'
);

(async () => {
  try {
    console.log('Connecting with URI:', process.env.MONGODB_URI ? '(found)' : '❌ MONGODB_URI is undefined!');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB:', mongoose.connection.name);

    const sub = await Subject.findOne({ code: 'IT1.108.3-1-1-26' });
    console.log('Subject found:', JSON.stringify(sub, null, 2));

    if (sub) {
      console.log('status value (raw):', JSON.stringify(sub.status));
      console.log('status === "published" ?', sub.status === 'published');
    }

    const allSubjects = await Subject.find({});
    console.log('Total documents in "subjects" collection:', allSubjects.length);
    console.log('All statuses:', allSubjects.map(s => ({ code: s.code, status: s.status })));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
