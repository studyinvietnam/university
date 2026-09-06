require('dotenv').config();

const { server } = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
);

if (missing.length > 0) {
    console.error(
        `❌ Missing required environment variables: ${missing.join(', ')}`
    );
    process.exit(1);
}

connectDB();

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 WebSocket enabled`);

    const provider = process.env.AI_PROVIDER || 'gemini';

    const apiKeyMap = {
        gemini: process.env.GEMINI_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
        claude: process.env.CLAUDE_API_KEY,
    };

    console.log(`🤖 AI Provider mặc định: ${provider}`);
    console.log(
        `🔑 API Key ${provider}: ${
            apiKeyMap[provider]
                ? '✅ Đã cấu hình'
                : '❌ Chưa cấu hình'
        }`
    );

    console.log('\n📋 Danh sách AI Providers:');

    Object.keys(apiKeyMap).forEach((p) => {
        console.log(
            `   ${p}: ${
                apiKeyMap[p]
                    ? '✅ Key available'
                    : '❌ Missing key'
            }`
        );
    });

    console.log('');
});