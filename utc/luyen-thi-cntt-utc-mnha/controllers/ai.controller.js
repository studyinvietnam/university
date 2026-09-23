// ============================================================
// AI CONTROLLER - Gemini
// ============================================================

const {
    checkWritingByGemini,
    runCustomPrompt,
    testGeminiConnection,
    createWritingPrompt,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    getSafeModel,
} = require("../services/aiService");

const { writeJsonFile } = require("../services/githubService");

const ModelComparison = (() => {
    try { return require("../models/ModelComparison"); } catch (_) { return null; }
})();
const GradingPrompt = (() => {
    try { return require("../models/GradingPrompt"); } catch (_) { return null; }
})();
const promptService = (() => {
    try { return require("../services/promptService"); } catch (_) { return null; }
})();

// ============================================================
// HELPERS
// ============================================================

function safeStr(v) { return typeof v === "string" ? v : ""; }

function clampTimeout(v, fb = 45000) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return fb;
    return Math.min(120000, n);
}

async function measure(fn) {
    const t0 = Date.now();
    try {
        return { data: await fn(), latencyMs: Date.now() - t0, error: null };
    } catch (e) {
        return { data: null, latencyMs: Date.now() - t0, error: e.message || String(e) };
    }
}

function pickModels(body) {
    const { models, model } = body || {};
    if (Array.isArray(models) && models.length) {
        const filtered = models.map((m) => String(m).trim()).filter((m) => SUPPORTED_MODELS.includes(m));
        return filtered.length ? filtered : [DEFAULT_MODEL];
    }
    if (models === "all") return [...SUPPORTED_MODELS];
    if (model) return [getSafeModel(model)];
    return [DEFAULT_MODEL];
}

// ============================================================
// 1. CHECK WRITING
// POST /ai/check  hoặc  POST /api/ai/check
// ============================================================

async function checkWriting(req, res) {
    try {
        const topic = safeStr(req.body?.topic || req.body?.prompt).trim();
        const essay = safeStr(req.body?.essay || req.body?.answer).trim();
        const model = getSafeModel(req.body?.model);
        const timeout = clampTimeout(req.body?.timeoutMs, 45000);

        if (!essay) return res.status(400).json({ success: false, message: "Bài viết đang trống." });

        console.log(`🤖 [ai.checkWriting] model=${model}`);
        const { data, latencyMs, error } = await measure(() =>
            checkWritingByGemini(topic, essay, timeout, model)
        );
        if (error) return res.status(502).json({ success: false, model, message: error });

        return res.json({ success: true, model, latencyMs, result: data });
    } catch (error) {
        console.error("❌ checkWriting:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 2. COMPARE MODELS
// POST /ai/compare
// ============================================================

async function compareModels(req, res) {
    try {
        const topic = safeStr(req.body?.topic).trim();
        const essay = safeStr(req.body?.essay).trim();
        const timeout = clampTimeout(req.body?.timeoutMs, 45000);
        const saveComp = Boolean(req.body?.saveComparison);
        const studentName = safeStr(req.body?.studentName).trim() || null;

        if (!essay) return res.status(400).json({ success: false, message: "Bài viết đang trống." });

        const modelsToRun = pickModels(req.body);
        console.log(`🤖 [ai.compareModels] ${modelsToRun.length} models`);

        const results = [];
        for (const m of modelsToRun) {
            const { data, latencyMs, error } = await measure(() =>
                checkWritingByGemini(topic, essay, timeout, m)
            );
            results.push({
                model: m,
                score: data?.score ?? null,
                wordCount: data?.wordCount ?? null,
                grammarScore: data?.grammar?.score ?? null,
                vocabularyScore: data?.vocabulary?.score ?? null,
                coherenceScore: data?.coherence?.score ?? null,
                contentScore: data?.content?.score ?? null,
                overallComment: data?.overall_comment ?? "",
                strengths: data?.strengths ?? [],
                weaknesses: data?.weaknesses ?? [],
                improvements: data?.improvements ?? [],
                grammarErrors: data?.grammar?.errors ?? [],
                latencyMs, error, success: !error,
            });
            await new Promise((r) => setTimeout(r, 400));
        }

        const successCount = results.filter((r) => r.success).length;

        let comparisonId = null;
        if (saveComp && ModelComparison) {
            try {
                const doc = await ModelComparison.create({
                    topic: topic || null, essay, studentName,
                    promptSnapshot: createWritingPrompt(topic, essay),
                    results: results.map((r) => ({
                        model: r.model, score: r.score, latencyMs: r.latencyMs,
                        feedback: r.overallComment, error: r.error,
                    })),
                    createdBy: req.session?.user?._id || req.user?._id || null,
                });
                comparisonId = doc._id;
            } catch (e) {
                console.warn("⚠️ Không lưu ModelComparison:", e.message);
            }
        }

        return res.json({
            success: true,
            totalModels: modelsToRun.length,
            successCount,
            failedCount: modelsToRun.length - successCount,
            comparisonId,
            results,
        });
    } catch (error) {
        console.error("❌ compareModels:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 3. TEST CONNECTION
// GET /ai/test?model=...
// ============================================================

async function testConnection(req, res) {
    try {
        const model = req.query?.model || req.body?.model || null;
        const timeout = clampTimeout(req.query?.timeoutMs, 15000);
        const selectedModel = getSafeModel(model);

        const { data, latencyMs, error } = await measure(() =>
            testGeminiConnection(selectedModel, timeout)
        );
        if (error) return res.status(502).json({ success: false, model: selectedModel, connected: false, message: error });

        return res.json({
            success: true, connected: true, model: selectedModel, latencyMs,
            response: data?.response || "OK",
        });
    } catch (error) {
        return res.status(500).json({ success: false, connected: false, message: error.message });
    }
}

// ============================================================
// 4. TEST ALL
// GET /ai/test-all
// ============================================================

async function testAllConnections(req, res) {
    try {
        const timeout = clampTimeout(req.query?.timeoutMs, 15000);
        const results = [];
        for (const m of SUPPORTED_MODELS) {
            const { data, latencyMs, error } = await measure(() =>
                testGeminiConnection(m, timeout)
            );
            results.push({ model: m, connected: !error, latencyMs, response: data?.response || null, error });
            await new Promise((r) => setTimeout(r, 250));
        }
        const connectedCount = results.filter((r) => r.connected).length;
        return res.json({
            success: true,
            total: SUPPORTED_MODELS.length,
            connectedCount,
            failedCount: SUPPORTED_MODELS.length - connectedCount,
            results,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 5. LIST MODELS
// GET /ai/models
// ============================================================

async function listModels(_req, res) {
    return res.json({
        success: true,
        defaultModel: DEFAULT_MODEL,
        total: SUPPORTED_MODELS.length,
        models: SUPPORTED_MODELS,
    });
}

// ============================================================
// 6. PREVIEW PROMPT
// POST /ai/preview-prompt
// ============================================================

async function previewPrompt(req, res) {
    try {
        const topic = safeStr(req.body?.topic).trim();
        const essay = safeStr(req.body?.essay).trim();
        if (!essay) return res.status(400).json({ success: false, message: "Bài viết đang trống." });

        const prompt = createWritingPrompt(topic, essay);
        return res.json({ success: true, promptLength: prompt.length, prompt });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 7. SAVE TO GITHUB
// POST /ai/save-to-github
// ============================================================

async function saveToGithub(req, res) {
    try {
        const topic = safeStr(req.body?.topic).trim();
        const essay = safeStr(req.body?.essay).trim();
        const model = getSafeModel(req.body?.model);
        const result = req.body?.result || null;

        if (!essay || !result) {
            return res.status(400).json({ success: false, message: "Thiếu essay hoặc result." });
        }

        const user = req.session?.user || req.user;
        const userId = user?._id || "anonymous";
        const ts = Date.now();
        const path = `submissions/_adhoc/${userId}-${ts}.json`;

        const payload = {
            userId: String(userId),
            userName: user?.name || null,
            topic, essay,
            wordCount: result?.wordCount ?? 0,
            score: result?.score ?? null,
            model,
            submittedAt: new Date().toISOString(),
            feedback: result,
            promptSnapshot: createWritingPrompt(topic, essay),
        };

        const saved = await writeJsonFile(path, payload, `ai.check: ${userId} - ${result?.score ?? "?"}/10`);
        return res.json({ success: true, github: { path: saved.path, url: saved.url } });
    } catch (error) {
        console.error("❌ saveToGithub:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 8. TEST PROMPT (admin)
// POST /prompts/:id/test
// ============================================================

async function testPrompt(req, res) {
    try {
        if (!GradingPrompt) {
            return res.status(501).json({ success: false, message: "Chưa có model GradingPrompt." });
        }

        const promptId = req.params.id;
        const topic = safeStr(req.body?.topic).trim();
        const essay = safeStr(req.body?.essay).trim();
        const timeout = clampTimeout(req.body?.timeoutMs, 45000);
        const studentName = safeStr(req.body?.studentName).trim();
        const sampleSolution = safeStr(req.body?.sampleSolution).trim();

        if (!essay) return res.status(400).json({ success: false, message: "Bài viết đang trống." });

        const gp = await GradingPrompt.findById(promptId);
        if (!gp || gp.active === false) {
            return res.status(404).json({ success: false, message: "Prompt không tồn tại hoặc đã bị vô hiệu hoá." });
        }

        let renderedContent;
        if (promptService && typeof promptService.renderPromptTemplate === "function") {
            renderedContent = promptService.renderPromptTemplate(gp, {
                topic, essay, studentName, sampleSolution,
            });
        } else {
            renderedContent = String(gp.content || "")
                .replace(/\{đề_bài\}/g, topic || "(Không có đề bài)")
                .replace(/\{bài_làm\}/g, essay)
                .replace(/\{max_score\}/g, String(gp.maxScore ?? 10))
                .replace(/\{strictness\}/g, gp.strictness || "normal")
                .replace(/\{rubric\}/g, JSON.stringify(gp.rubric || [], null, 2));
        }

        const runAll = req.body?.models === "all";
        const modelsToRun = runAll ? [...SUPPORTED_MODELS] : pickModels(req.body);

        const results = [];
        for (const m of modelsToRun) {
            const { data, latencyMs, error } = await measure(() =>
                runCustomPrompt(renderedContent, m, timeout)
            );
            results.push({
                model: m,
                score: data?.score ?? null,
                feedback: data?.feedback ?? data?.overall_comment ?? data?.raw ?? "",
                breakdown: data?.breakdown ?? [],
                latencyMs, error, success: !error,
            });
            await new Promise((r) => setTimeout(r, 400));
        }

        let comparisonId = null;
        if (runAll && ModelComparison) {
            try {
                const doc = await ModelComparison.create({
                    promptId: gp._id,
                    promptSnapshot: renderedContent,
                    topic: topic || null,
                    essay,
                    results: results.map((r) => ({
                        model: r.model, score: r.score, latencyMs: r.latencyMs,
                        feedback: r.feedback, error: r.error,
                    })),
                    createdBy: req.session?.user?._id || req.user?._id || null,
                });
                comparisonId = doc._id;
            } catch (e) {
                console.warn("⚠️ Lưu ModelComparison:", e.message);
            }
        }

        return res.json({
            success: true,
            promptId: gp._id,
            promptName: gp.name,
            version: gp.version,
            renderedPreview: renderedContent.slice(0, 1000),
            comparisonId,
            results,
        });
    } catch (error) {
        console.error("❌ testPrompt:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// 9. LỊCH SỬ SO SÁNH
// ============================================================

async function getComparison(req, res) {
    try {
        if (!ModelComparison) {
            return res.status(501).json({ success: false, message: "Chưa có model ModelComparison." });
        }
        const doc = await ModelComparison.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy." });
        return res.json({ success: true, comparison: doc });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function listComparisons(req, res) {
    try {
        if (!ModelComparison) {
            return res.status(501).json({ success: false, message: "Chưa có model ModelComparison." });
        }
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const docs = await ModelComparison.find({}).sort({ createdAt: -1 }).limit(limit).lean();
        return res.json({ success: true, total: docs.length, comparisons: docs });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    checkWriting,
    compareModels,
    testConnection,
    testAllConnections,
    listModels,
    previewPrompt,
    saveToGithub,
    testPrompt,
    getComparison,
    listComparisons,
};