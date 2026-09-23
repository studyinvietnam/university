// ============================================================
// SYNC QUEUE - In-memory queue + retry cho GitHub sync
// Quy mô nhỏ dùng được ngay, không cần Redis.
// ============================================================

const { writeJsonFile } = require("./githubService");

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

let _isProcessing = false;
const _queue = [];

function enqueue(job) {
    _queue.push({
        id: Date.now() + Math.random().toString(36).slice(2, 8),
        payload: job,
        attempts: 0,
        createdAt: new Date(),
    });
    processNext();
}

function size() { return _queue.length; }

async function processNext() {
    if (_isProcessing || _queue.length === 0) return;
    _isProcessing = true;

    const job = _queue.shift();
    job.attempts += 1;

    try {
        await writeJsonFile(job.payload.path, job.payload.data, job.payload.commitMessage);
        if (job.payload.onSuccess) await job.payload.onSuccess();
        console.log(`✅ [syncQueue] ${job.id} OK (attempt ${job.attempts})`);
    } catch (e) {
        console.warn(`❌ [syncQueue] ${job.id} fail (attempt ${job.attempts}): ${e.message}`);
        if (job.attempts < MAX_ATTEMPTS) {
            setTimeout(() => {
                _queue.push(job);
                processNext();
            }, RETRY_DELAY_MS * job.attempts);
        } else if (job.payload.onFinalFail) {
            await job.payload.onFinalFail(e);
        }
    } finally {
        _isProcessing = false;
        setImmediate(processNext);
    }
}

module.exports = { enqueue, size };