// backend/src/services/ai/deepseekProvider.js

const fetch = require('node-fetch');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function reviewCode({ problem, code, input, output, language, gradingCriteria, gradingRequirements, modelName }) {
    const model = modelName || process.env.AI_MODEL || 'deepseek-chat';
    console.log(`🔮 DeepSeek: using model ${model}`);

    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('Missing DEEPSEEK_API_KEY in .env');
    }

    const prompt = buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements });

    console.log(`⏳ DeepSeek: calling API...`);
    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'Bạn là giáo viên lập trình.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        }),
    });
    console.log(`✅ DeepSeek: API responded`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('⚠️ DeepSeek response not JSON, using fallback');
        return fallbackResult();
    }
}

function buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements }) {
    let prompt = `
Đề bài: ${problem}
Ngôn ngữ: ${language}
Code: ${code}
Input: ${input}
Output: ${output}
Tiêu chí: ${JSON.stringify(gradingCriteria)}
`;
    if (gradingRequirements) prompt += `\nYêu cầu đặc biệt: ${gradingRequirements}`;
    prompt += `\nTrả về JSON: { score, correctness, quality, performance, edgeCases, customRequirements, strengths, weaknesses, improvements, overallComment }`;
    return prompt;
}

function fallbackResult() {
    return {
        score: 5,
        correctness: 5,
        quality: 5,
        performance: 5,
        edgeCases: 5,
        customRequirements: [],
        strengths: [],
        weaknesses: [],
        improvements: [],
        overallComment: 'Chưa có đánh giá.'
    };
}

module.exports = { reviewCode };