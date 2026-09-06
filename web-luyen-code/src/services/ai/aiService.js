// backend/src/services/ai/aiService.js

const geminiProvider = require('./geminiProvider');
const openaiProvider = require('./openaiProvider');
const deepseekProvider = require('./deepseekProvider');
const claudeProvider = require('./claudeProvider');

const providerMap = {
    gemini: geminiProvider,
    openai: openaiProvider,
    deepseek: deepseekProvider,
    claude: claudeProvider,
};

/**
 * Đánh giá code sử dụng AI
 * @param {Object} params
 * @param {string} params.problem - Đề bài
 * @param {string} params.code - Source code
 * @param {string} params.input - Input mẫu
 * @param {string} params.output - Output mong đợi hoặc thực tế
 * @param {string} params.language - Ngôn ngữ
 * @param {Object} params.gradingCriteria - Tiêu chí chấm (từ gradingService)
 * @param {string} params.gradingRequirements - Yêu cầu chấm đặc biệt (từ Problem)
 * @param {string} params.providerName - Tên provider (mặc định từ env)
 * @param {string} params.modelName - Tên model (mặc định từ env hoặc null)
 * @returns {Promise<Object>} Kết quả đánh giá chuẩn
 */
async function reviewCode({
    problem,
    code,
    input,
    output,
    language,
    gradingCriteria,
    gradingRequirements = '',
    providerName = process.env.AI_PROVIDER || 'gemini',
    modelName = process.env.AI_MODEL || null,
}) {
    console.log(`🧠 reviewCode: provider = ${providerName}, model = ${modelName || 'default'}`);

    const provider = providerMap[providerName];
    if (!provider) {
        console.error(`❌ Unsupported AI provider: ${providerName}`);
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }

    // Kiểm tra API key tương ứng
    const keyName = `${providerName.toUpperCase()}_API_KEY`;
    const apiKey = process.env[keyName];
    if (!apiKey) {
        console.error(`❌ Missing API key for ${providerName} (${keyName})`);
        throw new Error(`Missing API key for ${providerName}. Please set ${keyName} in .env`);
    }

    console.log(`✅ Provider ${providerName} có API key. Đang gọi...`);

    const result = await provider.reviewCode({
        problem,
        code,
        input,
        output,
        language,
        gradingCriteria,
        gradingRequirements,
        modelName, // 👈 thêm
    });

    console.log(`✅ Provider ${providerName} trả về kết quả.`);

    // Chuẩn hóa kết quả
    return {
        score: result.score || 0,
        correctness: result.correctness || 0,
        quality: result.quality || 0,
        performance: result.performance || 0,
        edgeCases: result.edgeCases || 0,
        customRequirements: result.customRequirements || [],
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        improvements: result.improvements || [],
        overallComment: result.overallComment || '',
    };
}

module.exports = { reviewCode };