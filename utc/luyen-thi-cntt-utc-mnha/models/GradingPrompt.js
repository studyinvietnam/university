// ============================================================
// GradingPrompt — KHÔNG còn lưu ở MongoDB. Dữ liệu nằm ở GitHub:
//   prompts/{file}.json
// ============================================================
const { createModel } = require('../services/githubModel');
const githubStore = require('../services/githubStore');

module.exports = createModel({
    name: 'GradingPrompt',
    store: githubStore.makeStore('prompts'),
    defaults: githubStore.KINDS.prompts.defaults(),
    fields: ['name', 'description', 'kind', 'strictness', 'maxScore', 'isDefault', 'scope', 'subjectId',
        'lessonIds', 'version', 'githubFile', 'githubSha', 'active', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'],
    refs: { subjectId: 'Subject', lessonIds: 'Lesson', createdBy: 'User', updatedBy: 'User' }
});
