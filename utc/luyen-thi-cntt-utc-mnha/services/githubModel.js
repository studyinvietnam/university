// ============================================================
// GITHUB MODEL — "Mongoose giả" chạy trên dữ liệu đọc từ GitHub
// ------------------------------------------------------------
// Lesson / GradingPrompt / Submission KHÔNG còn nằm trong MongoDB.
// Dữ liệu là các file JSON trên GitHub; services/githubStore.js nạp chúng
// vào RAM, còn file này cho phép controller dùng NGUYÊN API Mongoose cũ:
//
//   Model.find / findOne / findById / countDocuments / distinct / exists
//   Model.create / updateOne / updateMany / findOneAndUpdate / deleteOne / deleteMany
//   Model.aggregate([$match, $group, $sort, $limit, $skip, $unwind])
//   query.select / sort / skip / limit / populate / lean / distinct / exec
//   doc.save() / doc.toObject() / virtual getters
//
// Toán tử lọc: $eq $ne $in $nin $gt $gte $lt $lte $exists $regex/$options
//              $not $or $and $nor $elemMatch $size, đường dẫn "a.b", mảng.
// Toán tử cập nhật: $set $unset $inc $push $pull $addToSet.
//
// Ghi: cập nhật RAM ngay (đọc-lại-ghi của chính mình luôn nhất quán) rồi gọi
// hook `persist` để ghi PHẦN CHỈ MỤC xuống file JSON trên GitHub (chỉ commit
// khi thật sự khác file hiện có).
// ============================================================

const mongoose = require('mongoose');

// ------------------------------------------------------------
// ObjectId & so sánh giá trị
// ------------------------------------------------------------
const HEX24 = /^[a-f0-9]{24}$/i;

function newId() {
    return new mongoose.Types.ObjectId();
}

function isIdLike(v) {
    return v != null && typeof v === 'object' && typeof v.toHexString === 'function';
}

function toObjectId(v) {
    if (v == null || v === '') return null;
    if (isIdLike(v)) return v;
    if (typeof v === 'object') v = v._id || v.id || v.$oid || null;
    if (v == null) return null;
    if (isIdLike(v)) return v;
    const s = String(v);
    return HEX24.test(s) ? new mongoose.Types.ObjectId(s) : null;
}

// Chuẩn hoá để so sánh: ObjectId → chuỗi hex, Date → số ms.
function norm(v) {
    if (v == null) return v;
    if (isIdLike(v)) return v.toHexString();
    if (v instanceof Date) return v.getTime();
    return v;
}

function clone(v) {
    if (v == null || typeof v !== 'object') return v;
    if (isIdLike(v)) return v;
    if (v instanceof Date) return new Date(v.getTime());
    if (Array.isArray(v)) return v.map(clone);
    const out = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
}

function getPath(obj, path) {
    const parts = String(path).split('.');
    let cur = [obj];
    for (const p of parts) {
        const next = [];
        for (const c of cur) {
            if (c == null) continue;
            if (Array.isArray(c) && !/^\d+$/.test(p)) {
                for (const el of c) if (el != null && typeof el === 'object') next.push(el[p]);
            } else {
                next.push(c[p]);
            }
        }
        cur = next;
    }
    return cur.length === 1 ? cur[0] : cur;
}

function setPath(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
}

function unsetPath(obj, path) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) return;
        cur = cur[parts[i]];
    }
    delete cur[parts[parts.length - 1]];
}

// ------------------------------------------------------------
// Bộ so khớp filter kiểu Mongo
// ------------------------------------------------------------
function eqValue(actual, expected) {
    if (expected instanceof RegExp) {
        const test = (x) => typeof x === 'string' && expected.test(x);
        return Array.isArray(actual) ? actual.some(test) : test(actual);
    }
    const e = norm(expected);
    if (Array.isArray(actual)) {
        if (e === null) return actual.length === 0 || actual.some((x) => norm(x) == null);
        return actual.some((x) => norm(x) === e);
    }
    const a = norm(actual);
    if (e === null) return a == null; // null khớp cả field thiếu
    return a === e;
}

function cmp(a, b) {
    a = norm(a); b = norm(b);
    if (a == null || b == null) return null;
    if (typeof a !== typeof b) return null;
    return a < b ? -1 : a > b ? 1 : 0;
}

function matchOperator(actual, op, arg, opts) {
    switch (op) {
        case '$eq': return eqValue(actual, arg);
        case '$ne': return !eqValue(actual, arg);
        case '$in': return (arg || []).some((x) => eqValue(actual, x));
        case '$nin': return !(arg || []).some((x) => eqValue(actual, x));
        case '$exists': return (actual !== undefined) === Boolean(arg);
        case '$gt': { const c = cmp(actual, arg); return c !== null && c > 0; }
        case '$gte': { const c = cmp(actual, arg); return c !== null && c >= 0; }
        case '$lt': { const c = cmp(actual, arg); return c !== null && c < 0; }
        case '$lte': { const c = cmp(actual, arg); return c !== null && c <= 0; }
        case '$size': return Array.isArray(actual) && actual.length === arg;
        case '$regex': {
            const re = arg instanceof RegExp ? arg : new RegExp(arg, opts.$options || '');
            const test = (x) => typeof x === 'string' && re.test(x);
            return Array.isArray(actual) ? actual.some(test) : test(actual);
        }
        case '$options': return true; // xử lý cùng $regex
        case '$not': return !matchCondition(actual, arg);
        case '$elemMatch':
            return Array.isArray(actual) && actual.some((el) =>
                (el && typeof el === 'object' && !isIdLike(el)) ? matchDoc(el, arg) : matchCondition(el, arg));
        default:
            throw new Error(`[githubModel] Toán tử chưa hỗ trợ: ${op}`);
    }
}

function isOperatorObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v) && !isIdLike(v) &&
        !(v instanceof Date) && !(v instanceof RegExp) &&
        Object.keys(v).length > 0 && Object.keys(v).every((k) => k.startsWith('$'));
}

function matchCondition(actual, cond) {
    if (isOperatorObject(cond)) {
        return Object.keys(cond).every((op) => matchOperator(actual, op, cond[op], cond));
    }
    return eqValue(actual, cond);
}

function matchDoc(doc, filter) {
    if (!filter) return true;
    for (const key of Object.keys(filter)) {
        const cond = filter[key];
        if (key === '$or') {
            if (!cond.some((f) => matchDoc(doc, f))) return false;
        } else if (key === '$and') {
            if (!cond.every((f) => matchDoc(doc, f))) return false;
        } else if (key === '$nor') {
            if (cond.some((f) => matchDoc(doc, f))) return false;
        } else {
            if (!matchCondition(getPath(doc, key), cond)) return false;
        }
    }
    return true;
}

// ------------------------------------------------------------
// Sắp xếp / chọn field
// ------------------------------------------------------------
function compareForSort(a, b) {
    a = norm(a); b = norm(b);
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'vi');
    return a < b ? -1 : a > b ? 1 : 0;
}

function parseSort(sort) {
    if (!sort) return [];
    if (typeof sort === 'string') {
        return sort.split(/\s+/).filter(Boolean).map((s) => s.startsWith('-') ? [s.slice(1), -1] : [s.replace(/^\+/, ''), 1]);
    }
    if (sort instanceof Map) return [...sort.entries()].map(([k, v]) => [k, Number(v) < 0 || v === 'desc' ? -1 : 1]);
    return Object.keys(sort).map((k) => [k, Number(sort[k]) < 0 || sort[k] === 'desc' || sort[k] === 'descending' ? -1 : 1]);
}

function sortDocs(docs, sort) {
    const keys = parseSort(sort);
    if (!keys.length) return docs;
    return docs.slice().sort((x, y) => {
        for (const [k, dir] of keys) {
            const c = compareForSort(getPath(x, k), getPath(y, k));
            if (c) return c * dir;
        }
        return 0;
    });
}

function parseSelect(sel) {
    if (!sel) return null;
    let include = []; let exclude = [];
    const add = (k) => (k.startsWith('-') ? exclude.push(k.slice(1)) : include.push(k.replace(/^\+/, '')));
    if (typeof sel === 'string') sel.split(/\s+/).filter(Boolean).forEach(add);
    else Object.keys(sel).forEach((k) => (sel[k] ? include.push(k) : exclude.push(k)));
    return { include, exclude };
}

function applySelect(doc, sel) {
    if (!sel) return doc;
    const out = {};
    if (sel.include.length) {
        out._id = doc._id;
        for (const k of sel.include) {
            const v = getPath(doc, k);
            if (v !== undefined) setPath(out, k, clone(v));
        }
    } else {
        Object.assign(out, clone(doc));
    }
    for (const k of sel.exclude) unsetPath(out, k);
    return out;
}

// ------------------------------------------------------------
// Cập nhật kiểu Mongo
// ------------------------------------------------------------
function applyUpdate(rec, update) {
    const ops = Object.keys(update).some((k) => k.startsWith('$')) ? update : { $set: update };
    for (const op of Object.keys(ops)) {
        const spec = ops[op];
        switch (op) {
            case '$set': for (const k of Object.keys(spec)) setPath(rec, k, clone(spec[k])); break;
            case '$setOnInsert': break;
            case '$unset': for (const k of Object.keys(spec)) unsetPath(rec, k); break;
            case '$inc': for (const k of Object.keys(spec)) setPath(rec, k, (Number(getPath(rec, k)) || 0) + spec[k]); break;
            case '$push': for (const k of Object.keys(spec)) {
                const arr = Array.isArray(getPath(rec, k)) ? getPath(rec, k) : [];
                const v = spec[k];
                if (v && typeof v === 'object' && Array.isArray(v.$each)) arr.push(...clone(v.$each)); else arr.push(clone(v));
                setPath(rec, k, arr);
            } break;
            case '$addToSet': for (const k of Object.keys(spec)) {
                const arr = Array.isArray(getPath(rec, k)) ? getPath(rec, k) : [];
                const vals = spec[k] && typeof spec[k] === 'object' && Array.isArray(spec[k].$each) ? spec[k].$each : [spec[k]];
                for (const v of vals) if (!arr.some((x) => norm(x) === norm(v))) arr.push(clone(v));
                setPath(rec, k, arr);
            } break;
            case '$pull': for (const k of Object.keys(spec)) {
                const arr = getPath(rec, k);
                if (!Array.isArray(arr)) continue;
                const cond = spec[k];
                setPath(rec, k, arr.filter((el) => !(
                    (cond && typeof cond === 'object' && !isIdLike(cond) && !Array.isArray(cond) && !(cond instanceof Date))
                        ? (isOperatorObject(cond) ? matchCondition(el, cond) : matchDoc(el, cond))
                        : eqValue(el, cond))));
            } break;
            default: throw new Error(`[githubModel] Toán tử cập nhật chưa hỗ trợ: ${op}`);
        }
    }
}

// ------------------------------------------------------------
// aggregate — chỉ các stage dự án đang dùng
// ------------------------------------------------------------
function resolveExpr(doc, expr) {
    if (typeof expr === 'string' && expr.startsWith('$')) return getPath(doc, expr.slice(1));
    return expr;
}

function runAggregate(docs, pipeline) {
    let rows = docs;
    for (const stage of pipeline) {
        const [op] = Object.keys(stage);
        const arg = stage[op];
        if (op === '$match') rows = rows.filter((d) => matchDoc(d, arg));
        else if (op === '$sort') rows = sortDocs(rows, arg);
        else if (op === '$limit') rows = rows.slice(0, arg);
        else if (op === '$skip') rows = rows.slice(arg);
        else if (op === '$count') rows = [{ [arg]: rows.length }];
        else if (op === '$unwind') {
            const path = (typeof arg === 'string' ? arg : arg.path).replace(/^\$/, '');
            const out = [];
            for (const d of rows) {
                const v = getPath(d, path);
                if (Array.isArray(v)) v.forEach((el) => { const c = clone(d); setPath(c, path, el); out.push(c); });
            }
            rows = out;
        } else if (op === '$group') {
            const groups = new Map();
            for (const d of rows) {
                const key = resolveExpr(d, arg._id);
                const nk = JSON.stringify(norm(key) === undefined ? null : norm(key));
                if (!groups.has(nk)) groups.set(nk, { _id: key === undefined ? null : key, __rows: [] });
                groups.get(nk).__rows.push(d);
            }
            rows = [...groups.values()].map((g) => {
                const out = { _id: g._id };
                for (const f of Object.keys(arg)) {
                    if (f === '_id') continue;
                    const [acc] = Object.keys(arg[f]);
                    const e = arg[f][acc];
                    const vals = g.__rows.map((r) => resolveExpr(r, e));
                    if (acc === '$sum') out[f] = vals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
                    else if (acc === '$avg') { const n = vals.filter((v) => typeof v === 'number'); out[f] = n.length ? n.reduce((s, v) => s + v, 0) / n.length : null; }
                    else if (acc === '$max') out[f] = vals.reduce((m, v) => (m == null || cmp(v, m) > 0 ? v : m), null);
                    else if (acc === '$min') out[f] = vals.reduce((m, v) => (m == null || cmp(v, m) < 0 ? v : m), null);
                    else if (acc === '$first') out[f] = vals[0];
                    else if (acc === '$last') out[f] = vals[vals.length - 1];
                    else if (acc === '$push') out[f] = vals;
                    else if (acc === '$addToSet') out[f] = [...new Map(vals.map((v) => [JSON.stringify(norm(v)), v])).values()];
                    else throw new Error(`[githubModel] Accumulator chưa hỗ trợ: ${acc}`);
                }
                return out;
            });
        } else {
            throw new Error(`[githubModel] Stage aggregate chưa hỗ trợ: ${op}`);
        }
    }
    return rows;
}

// ------------------------------------------------------------
// Registry các model GitHub (để populate chéo lẫn nhau)
// ------------------------------------------------------------
const registry = new Map();

function resolveModel(name) {
    if (registry.has(name)) return registry.get(name);
    try { return mongoose.model(name); } catch (_) { return null; }
}

// ------------------------------------------------------------
// Tạo model
// ------------------------------------------------------------
/**
 * @param {object} cfg
 * @param {string} cfg.name           tên model ('Lesson'…)
 * @param {object} cfg.store          { all(): Promise<record[]>, byId(id), upsert(rec), remove(rec), persist(rec) }
 * @param {object} cfg.defaults       { field: value | () => value } áp khi tạo mới
 * @param {object} cfg.refs           { field: 'ModelName' } cho populate
 * @param {object} cfg.virtuals       { name: (rec) => value }
 * @param {object} cfg.statics        hàm static thêm vào model
 * @param {string[]} cfg.fields       danh sách field của schema (cho Model.schema.path)
 */
function createModel(cfg) {
    const { name, store, defaults = {}, refs = {}, virtuals = {}, statics = {}, fields = [] } = cfg;
    const fieldSet = new Set(['_id', ...fields]);

    // ---------- Document ----------
    function wrap(rec) {
        if (!rec) return null;
        const doc = clone(rec);
        const define = (k, v) => Object.defineProperty(doc, k, { value: v, enumerable: false, writable: true, configurable: true });
        define('id', String(rec._id));
        define('__isGithubDoc', true);
        for (const v of Object.keys(virtuals)) {
            Object.defineProperty(doc, v, { get: () => virtuals[v](doc), enumerable: false, configurable: true });
        }
        define('toObject', () => plain(doc));
        define('toJSON', () => plain(doc));
        define('markModified', () => {});
        define('populated', () => undefined);
        define('save', async () => {
            const current = store.byId(doc._id);
            const next = castRecord(plain(doc));
            next.updatedAt = new Date();
            if (current) Object.assign(current, next); else store.upsert(next);
            const target = current || next;
            for (const k of Object.keys(target)) if (!(k in next)) delete target[k];
            await store.persist(target);
            doc.updatedAt = target.updatedAt;
            return doc;
        });
        return doc;
    }

    function plain(doc) {
        const out = {};
        for (const k of Object.keys(doc)) out[k] = clone(doc[k]);
        return out;
    }

    // ---------- Populate ----------
    async function populateOne(items, spec) {
        const path = typeof spec === 'string' ? spec.split(/\s+/)[0] : spec.path;
        const select = typeof spec === 'string' ? null : spec.select;
        const modelName = (spec && spec.model && (typeof spec.model === 'string' ? spec.model : spec.model.modelName)) || refs[path];
        const Ref = modelName ? resolveModel(modelName) : null;
        if (!Ref) return;

        const ids = new Set();
        for (const it of items) {
            const v = it[path];
            (Array.isArray(v) ? v : [v]).forEach((x) => { if (x != null && (isIdLike(x) || typeof x === 'string')) ids.add(String(norm(x))); });
        }
        if (!ids.size) return;
        let q = Ref.find({ _id: { $in: [...ids].map(toObjectId).filter(Boolean) } });
        if (select) q = q.select(select);
        const found = await q.lean();
        const map = new Map(found.map((f) => [String(f._id), f]));
        const pick = (x) => (x != null && (isIdLike(x) || typeof x === 'string') && map.has(String(norm(x))) ? map.get(String(norm(x))) : (x != null && (isIdLike(x) || typeof x === 'string') ? null : x));
        for (const it of items) {
            const v = it[path];
            it[path] = Array.isArray(v) ? v.map(pick).filter((x) => x != null) : pick(v);
        }
    }

    // ---------- Query ----------
    class Query {
        constructor(kind, filter, opts = {}) {
            this.kind = kind; // 'find' | 'findOne'
            this.filter = filter || {};
            this._sort = null; this._skip = 0; this._limit = 0;
            this._select = null; this._populate = []; this._lean = false;
            this._distinct = null;
            this._pre = opts.pre || null;
        }
        select(s) { this._select = parseSelect(s); return this; }
        sort(s) { this._sort = s; return this; }
        skip(n) { this._skip = Number(n) || 0; return this; }
        limit(n) { this._limit = Number(n) || 0; return this; }
        lean() { this._lean = true; return this; }
        session() { return this; }
        read() { return this; }
        maxTimeMS() { return this; }
        hint() { return this; }
        populate(path, select) {
            if (Array.isArray(path)) path.forEach((p) => this._populate.push(p));
            else if (typeof path === 'string' && select) this._populate.push({ path, select });
            else this._populate.push(path);
            return this;
        }
        distinct(field) { this._distinct = field; return this; }
        countDocuments() { this._count = true; return this; }
        exec() { return this.then((v) => v); }

        async run() {
            let recs = (await store.all()).filter((r) => matchDoc(r, this.filter));
            if (this._count) return recs.length;
            recs = sortDocs(recs, this._sort);
            if (this._distinct) {
                const seen = new Map();
                for (const r of recs) {
                    const v = getPath(r, this._distinct);
                    (Array.isArray(v) ? v : [v]).forEach((x) => { if (x !== undefined && x !== null) seen.set(JSON.stringify(norm(x)), x); });
                }
                return [...seen.values()];
            }
            if (this.kind === 'findOne') recs = recs.slice(this._skip, this._skip + 1);
            else {
                if (this._skip) recs = recs.slice(this._skip);
                if (this._limit) recs = recs.slice(0, this._limit);
            }
            let out = recs.map((r) => applySelect(r, this._select));
            out = out.map((r) => (this._select ? r : clone(r)));
            for (const p of this._populate) await populateOne(out, p);
            if (!this._lean) out = out.map((r) => wrap(r));
            return this.kind === 'findOne' ? (out[0] || null) : out;
        }
        then(res, rej) { return this.run().then(res, rej); }
        catch(rej) { return this.run().catch(rej); }
    }

    // ---------- Model ----------
    const Model = {
        modelName: name,
        schema: { path: (p) => (fieldSet.has(p) ? { path: p } : undefined) },
        find: (f) => new Query('find', f),
        findOne: (f) => new Query('findOne', f),
        findById: (id) => {
            const oid = toObjectId(id);
            return new Query('findOne', { _id: oid || '__invalid__' });
        },
        countDocuments: (f) => new Query('find', f).countDocuments(),
        estimatedDocumentCount: () => new Query('find', {}).countDocuments(),
        distinct: (field, f) => new Query('find', f).distinct(field),
        exists: async (f) => {
            const r = (await store.all()).find((x) => matchDoc(x, f));
            return r ? { _id: r._id } : null;
        },
        aggregate: async (pipeline) => runAggregate((await store.all()).map(clone), pipeline),

        async create(data) {
            if (Array.isArray(data)) return Promise.all(data.map((d) => Model.create(d)));
            const rec = buildRecord(data);
            store.upsert(rec);
            await store.persist(rec);
            return wrap(rec);
        },

        async updateOne(filter, update, options = {}) {
            const rec = (await store.all()).find((r) => matchDoc(r, filter));
            if (!rec) return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
            applyUpdate(rec, update); castRecord(rec);
            if (options.timestamps !== false) rec.updatedAt = new Date();
            await store.persist(rec);
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
        },

        async updateMany(filter, update, options = {}) {
            const recs = (await store.all()).filter((r) => matchDoc(r, filter));
            for (const rec of recs) {
                applyUpdate(rec, update); castRecord(rec);
                if (options.timestamps !== false) rec.updatedAt = new Date();
                await store.persist(rec);
            }
            return { acknowledged: true, matchedCount: recs.length, modifiedCount: recs.length };
        },

        findOneAndUpdate(filter, update, options = {}) {
            const q = new Query('findOne', filter);
            const origRun = q.run.bind(q);
            q.run = async () => {
                const rec = (await store.all()).find((r) => matchDoc(r, filter));
                if (!rec) return null;
                const before = clone(rec);
                applyUpdate(rec, update); castRecord(rec);
                if (options.timestamps !== false) rec.updatedAt = new Date();
                await store.persist(rec);
                const snapshot = options.new || options.returnDocument === 'after' ? clone(rec) : before;
                const out = applySelect(snapshot, q._select);
                for (const p of q._populate) await populateOne([out], p);
                return q._lean ? out : wrap(out);
            };
            void origRun;
            return q;
        },
        findByIdAndUpdate(id, update, options) {
            return Model.findOneAndUpdate({ _id: toObjectId(id) || '__invalid__' }, update, options);
        },

        async deleteOne(filter) {
            const rec = (await store.all()).find((r) => matchDoc(r, filter));
            if (!rec) return { acknowledged: true, deletedCount: 0 };
            await store.remove(rec);
            return { acknowledged: true, deletedCount: 1 };
        },
        async deleteMany(filter) {
            const recs = (await store.all()).filter((r) => matchDoc(r, filter));
            for (const rec of recs) await store.remove(rec);
            return { acknowledged: true, deletedCount: recs.length };
        },
        async findByIdAndDelete(id) {
            const rec = store.byId(toObjectId(id));
            if (!rec) return null;
            const copy = clone(rec);
            await store.remove(rec);
            return wrap(copy);
        },

        // `new Model(data)` không dùng nữa → dùng Model.build(data).save()
        build(data) {
            const rec = buildRecord(data);
            const doc = wrap(rec);
            Object.defineProperty(doc, 'save', {
                value: async () => {
                    store.upsert(plain(doc));
                    await store.persist(store.byId(doc._id));
                    return doc;
                },
                enumerable: false, configurable: true, writable: true
            });
            return doc;
        },

        // Dùng nội bộ
        __wrap: wrap,
        __store: store
    };

    // Controller hay gán id dạng chuỗi (req.body…) → ép về ObjectId như Mongoose từng làm
    function castRecord(rec) {
        for (const k of Object.keys(rec)) {
            const v = rec[k];
            const idKey = k.endsWith('Id') || k === 'userKey' || k === 'createdBy' || k === 'updatedBy' || k === 'deletedBy' || k === 'approvedBy';
            const idsKey = k.endsWith('Ids') || k.endsWith('Keys');
            if (idKey && typeof v === 'string' && HEX24.test(v)) rec[k] = toObjectId(v);
            else if (idsKey && Array.isArray(v)) rec[k] = v.map((x) => (typeof x === 'string' && HEX24.test(x) ? toObjectId(x) : x));
        }
        return rec;
    }

    function buildRecord(data) {
        const rec = {};
        for (const k of Object.keys(defaults)) {
            const d = defaults[k];
            rec[k] = clone(typeof d === 'function' ? d() : d);
        }
        for (const k of Object.keys(data || {})) {
            if (data[k] !== undefined) rec[k] = clone(data[k]);
        }
        rec._id = toObjectId(rec._id) || newId();
        for (const k of Object.keys(rec)) {
            if (k.endsWith('Id') || k === 'createdBy' || k === 'updatedBy' || k === 'deletedBy' || k === 'userKey') {
                const v = rec[k];
                if (v != null && !Array.isArray(v) && !(typeof v === 'object' && !isIdLike(v))) rec[k] = toObjectId(v) || v;
            }
        }
        const now = new Date();
        if (!rec.createdAt) rec.createdAt = now;
        if (!rec.updatedAt) rec.updatedAt = now;
        return rec;
    }

    Object.assign(Model, statics);
    registry.set(name, Model);
    return Model;
}

module.exports = {
    createModel,
    // xuất để test
    matchDoc, applyUpdate, runAggregate, sortDocs, parseSelect, applySelect,
    toObjectId, newId, norm, clone
};
