// backend/src/services/ai/openaiProvider.js

const OpenAI = require('openai');

async function reviewCode({ problem, code, input, output, language, gradingCriteria, gradingRequirements, modelName }) {
    const model = modelName || process.env.AI_MODEL || 'gpt-4o-mini';
    console.log(`🔮 OpenAI: using model ${model}`);

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY in .env');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements });

    console.log(`⏳ OpenAI: generating completion...`);
    const response = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: 'Bạn là giáo viên lập trình, hãy đánh giá code của học sinh.' },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
    });
    console.log(`✅ OpenAI: received response`);

    const text = response.choices[0].message.content;
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('⚠️ OpenAI response not JSON, using fallback');
        return fallbackResult();
    }
}

function buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements }) {
    let prompt = `
Đề bài: ${problem}
Ngôn ngữ: ${language}
Code: ${code}
Input mẫu: ${input}
Output mong đợi: ${output}
Tiêu chí chấm: ${JSON.stringify(gradingCriteria)}
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
        strengths: ['Chưa có đánh giá'],
        weaknesses: ['Chưa có đánh giá'],
        improvements: ['Chưa có đánh giá'],
        overallComment: 'Không thể đánh giá tự động.'
    };
}

module.exports = { reviewCode };