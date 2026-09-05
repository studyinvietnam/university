// backend/src/services/ai/claudeProvider.js

const Anthropic = require('@anthropic-ai/sdk');

async function reviewCode({ problem, code, input, output, language, gradingCriteria, gradingRequirements, modelName }) {
    const model = modelName || process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
    console.log(`🔮 Claude: using model ${model}`);

    if (!process.env.CLAUDE_API_KEY) {
        throw new Error('Missing CLAUDE_API_KEY in .env');
    }

    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const prompt = buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements });

    console.log(`⏳ Claude: calling API...`);
    const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        temperature: 0.3,
        system: 'Bạn là giáo viên lập trình, hãy đánh giá code.',
        messages: [{ role: 'user', content: prompt }],
    });
    console.log(`✅ Claude: received response`);

    const text = response.content[0].text;
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('⚠️ Claude response not JSON, using fallback');
        return fallbackResult();
    }
}

function buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements }) {
    let prompt = `
Đề bài: ${problem}
Ngôn ngữ: ${language}
Code:
\`\`\`
${code}
\`\`\`
Input: ${input}
Output mong đợi: ${output}
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
        overallComment: 'Không thể đánh giá.'
    };
}

module.exports = { reviewCode };