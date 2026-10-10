// Harness: giả mongoose / config/github / githubService / Subject để chạy githubStore + githubModel offline
const Module = require('module');
const path = require('path');
const crypto = require('crypto');
const ROOT = '/home/claude/proj/luyen-thi-cntt-utc-mnha';

class ObjectId {
  constructor(v) { this.h = v ? String(v.h || v) : crypto.randomBytes(12).toString('hex'); }
  toHexString() { return this.h; }
  toString() { return this.h; }
  equals(o) { return String(o) === this.h; }
  toJSON() { return this.h; }
}
const fakeModels = {};
const mongooseStub = { Types: { ObjectId }, model: (n) => { if (!fakeModels[n]) throw new Error('no model ' + n); return fakeModels[n]; } };

// ---------- GitHub giả ----------
const repo = { files: new Map(), head: 'h0', calls: { graphql: 0, tree: 0, readFile: 0, write: 0, headReq: 0 }, writes: [] };
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
function put(p, obj) { const t = JSON.stringify(obj, null, 2); repo.files.set(p, { text: t, sha: sha(t) }); repo.head = 'h' + (parseInt(repo.head.slice(1)) + 1); }
function del(p) { repo.files.delete(p); repo.head = 'h' + (parseInt(repo.head.slice(1)) + 1); }

const cfg = {
  owner: 'o', repo: 'r', branch: 'main', isConfigured: true,
  octokit: { async request(route, params) {
    if (route === 'POST /graphql') {
      repo.calls.graphql++;
      const repoObj = {};
      const re = /(f\d+): object\(expression: "main:([^"]+)"\)/g; let m;
      while ((m = re.exec(params.query))) { const f = repo.files.get(JSON.parse('"' + m[2] + '"')); repoObj[m[1]] = f ? { oid: f.sha, text: f.text, isTruncated: false } : null; }
      return { data: { data: { repository: repoObj } } };
    }
    if (route.startsWith('GET /repos/{owner}/{repo}/git/ref')) {
      repo.calls.headReq++;
      const etag = '"' + repo.head + '"';
      if (params.headers && params.headers['if-none-match'] === etag) { const e = new Error('not modified'); e.status = 304; throw e; }
      return { headers: { etag }, data: { object: { sha: repo.head } } };
    }
    throw new Error('route ' + route);
  } },
};
const svc = {
  isConfigured: true,
  async getRepoTree() { repo.calls.tree++; return { files: new Map([...repo.files].map(([p, f]) => [p, f.sha])), truncated: false }; },
  async readJsonFileWithSha(p) { repo.calls.readFile++; const f = repo.files.get(p); return f ? { data: JSON.parse(f.text), sha: f.sha } : null; },
  async updateJsonFile(p, fn, msg) { const f = repo.files.get(p); const next = await fn(JSON.parse(f.text)); repo.calls.write++; repo.writes.push({ p, msg }); put(p, next); return { path: p, sha: repo.files.get(p).sha }; },
};
const subjects = [];
fakeModels.Subject = { find: () => ({ select() { return this; }, lean: async () => subjects.slice() }) };
fakeModels.User = { find(f) { const ids = (f._id.$in || []).map(String); return { select() { return this; }, lean: async () => ids.map((id) => ({ _id: new ObjectId(id), name: 'U-' + id.slice(-4), email: id.slice(-4) + '@x' })) }; } };

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (req === 'mongoose') return '/virtual/mongoose.js';
  return origResolve.call(this, req, parent, ...rest);
};
require.cache['/virtual/mongoose.js'] = { id: '/virtual/mongoose.js', filename: '/virtual/mongoose.js', loaded: true, exports: mongooseStub };
const inject = (rel, exp) => { const f = path.join(ROOT, rel); require.cache[f] = { id: f, filename: f, loaded: true, exports: exp }; };
inject('config/github.js', cfg);
inject('services/githubService.js', svc);
inject('models/Subject.js', fakeModels.Subject);
inject('config/aiModels.js', { formatAiLabel: (p, n) => `${p}:${n || 'default'}` });

module.exports = { ROOT, ObjectId, repo, put, del, subjects, fakeModels, mongooseStub };
