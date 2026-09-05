// backend/src/services/ai/geminiProvider.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function reviewCode({ problem, code, input, output, language, gradingCriteria, gradingRequirements, modelName }) {
    const model = modelName || process.env.AI_MODEL || 'gemini-3.6-flash';
    console.log(`🔮 Gemini: using model ${model}`);

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY in .env');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const generativeModel = genAI.getGenerativeModel({ model });

    const prompt = buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements });

    console.log(`⏳ Gemini: generating content...`);
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log(`✅ Gemini: received response`);

    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('⚠️ Gemini response not JSON, using fallback');
        return fallbackResult();
    }
}

function buildPrompt({ problem, code, input, output, language, gradingCriteria, gradingRequirements }) {
    let prompt = `
Bạn là một giáo viên lập trình. Hãy đánh giá bài làm của học sinh.

Đề bài:
${problem}

Ngôn ngữ: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Input mẫu:
${input}

Output mong đợi:
${output}

Tiêu chí chấm cơ bản:
${JSON.stringify(gradingCriteria, null, 2)}
`;
    if (gradingRequirements) {
        prompt += `\nYêu cầu chấm đặc biệt:\n${gradingRequirements}\n`;
    }
    prompt += `
Hãy trả về JSON có cấu trúc:
{
    "score": number (0-10),
    "correctness": number (0-10),
    "quality": number (0-10),
    "performance": number (0-10),
    "edgeCases": number (0-10),
    "customRequirements": [
        { "requirementId": "R001", "passed": true/false, "comment": "..." }
    ],
    "strengths": ["..."],
    "weaknesses": ["..."],
    "improvements": ["..."],
    "overallComment": "..."
}
`;
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
        strengths: ['Code đã được gửi đi'],
        weaknesses: ['Chưa có đánh giá chi tiết'],
        improvements: ['Cần cải thiện'],
        overallComment: 'Đánh giá tự động chưa hoàn chỉnh.'
    };
}

module.exports = { reviewCode };