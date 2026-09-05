const githubService = require('./githubService');
const defaultGradingCriteria = require('../config/gradingCriteria');

/**
 * Lấy tiêu chí chấm cho một bài
 * - Nếu có grading.json và enabled = true → merge custom + default
 * - Nếu không có hoặc enabled = false → dùng default
 * @param {string} problemId
 * @returns {Promise<Object>} { criteria: {...}, source: 'default'|'custom', sha: string|null }
 */
async function getGradingCriteria(problemId) {
    // 1. Thử đọc grading.json từ GitHub
    const grading = await githubService.getProblemGrading(problemId);

    // 2. Nếu không có hoặc bị disable → dùng default
    if (!grading || grading.enabled === false) {
        return {
            criteria: defaultGradingCriteria,
            source: 'default',
            sha: null,
        };
    }

    // 3. Merge default + custom requirements
    //    Lưu ý: default có cấu trúc { correctness, codeQuality, ... }
    //    Custom có cấu trúc { requirements: [...] }
    const merged = {
        ...defaultGradingCriteria,
        customRequirements: grading.requirements || [],
    };

    return {
        criteria: merged,
        source: 'custom',
        sha: grading._sha || null,
    };
}

module.exports = { getGradingCriteria };