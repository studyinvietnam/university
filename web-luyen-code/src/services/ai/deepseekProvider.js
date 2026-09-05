
// backend/src/services/ai/deepseekProvider.js

// ============================================================
// DEEPSEEK AI PROVIDER
// CommonJS + node-fetch@3 (ESM)
// ============================================================

const DEEPSEEK_API_URL =
    'https://api.deepseek.com/v1/chat/completions';

// ============================================================
// FETCH
// ============================================================

let fetchPromise = null;

function getFetch() {
    if (!fetchPromise) {
        fetchPromise = import('node-fetch')
            .then(({ default: fetch }) => fetch)
            .catch((error) => {
                fetchPromise = null;
                throw error;
            });
    }

    return fetchPromise;
}

// ============================================================
// REVIEW CODE
// ============================================================

async function reviewCode({
    problem,
    code,
    input,
    output,
    language,
    gradingCriteria,
    gradingRequirements,
    modelName
}) {
    const model =
        modelName ||
        process.env.AI_MODEL ||
        'deepseek-chat';

    console.log(
        `🔮 DeepSeek: using model ${model}`
    );

    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error(
            'Missing DEEPSEEK_API_KEY in environment variables'
        );
    }

    const prompt = buildPrompt({
        problem,
        code,
        input,
        output,
        language,
        gradingCriteria,
        gradingRequirements
    });

    console.log(
        '⏳ DeepSeek: calling API...'
    );

    const fetch = await getFetch();

    let response;

    try {
        response = await fetch(
            DEEPSEEK_API_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json',

                    'Authorization':
                        `Bearer ${process.env.DEEPSEEK_API_KEY}`
                },

                body: JSON.stringify({
                    model,

                    messages: [
                        {
                            role: 'system',
                            content:
                                'Bạn là giáo viên lập trình.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],

                    temperature: 0.3,

                    response_format: {
                        type: 'json_object'
                    }
                })
            }
        );
    } catch (error) {
        console.error(
            '❌ DeepSeek request error:',
            error
        );

        throw new Error(
            `DeepSeek API request failed: ${error.message}`
        );
    }

    console.log(
        `✅ DeepSeek: API responded (${response.status})`
    );

    let data;

    try {
        data = await response.json();
    } catch (error) {
        console.error(
            '❌ DeepSeek invalid JSON response:',
            error
        );

        throw new Error(
            'DeepSeek API returned invalid JSON'
        );
    }

    if (!response.ok) {
        console.error(
            '❌ DeepSeek API error:',
            JSON.stringify(data, null, 2)
        );

        const apiMessage =
            data?.error?.message ||
            data?.message ||
            `HTTP ${response.status}`;

        throw new Error(
            `DeepSeek API error: ${apiMessage}`
        );
    }

    const text =
        data?.choices?.[0]?.message?.content ||
        '{}';

    try {
        return JSON.parse(text);
    } catch (error) {
        console.warn(
            '⚠️ DeepSeek response not JSON, using fallback'
        );

        console.warn(
            'DeepSeek raw response:',
            text
        );

        return fallbackResult();
    }
}

// ============================================================
// BUILD PROMPT
// ============================================================

function buildPrompt({
    problem,
    code,
    input,
    output,
    language,
    gradingCriteria,
    gradingRequirements
}) {
    let prompt = `
Đề bài: ${problem}

Ngôn ngữ: ${language}

Code:
${code}

Input:
${input}

Output:
${output}

Tiêu chí:
${JSON.stringify(gradingCriteria)}
`;

    if (gradingRequirements) {
        prompt +=
            `\nYêu cầu đặc biệt: ${gradingRequirements}`;
    }

    prompt += `

Trả về JSON hợp lệ theo cấu trúc:

{
    "score": 0,
    "correctness": 0,
    "quality": 0,
    "performance": 0,
    "edgeCases": 0,
    "customRequirements": [],
    "strengths": [],
    "weaknesses": [],
    "improvements": [],
    "overallComment": ""
}

Các điểm số từ 0 đến 10.
Chỉ trả về JSON, không thêm Markdown.
`;

    return prompt;
}

// ============================================================
// FALLBACK RESULT
// ============================================================

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
        overallComment:
            'Chưa có đánh giá.'
    };
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    reviewCode
};

