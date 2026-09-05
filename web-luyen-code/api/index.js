const { app } = require('../src/app');
const connectDB = require('../src/config/database');

let dbPromise;

module.exports = async (req, res) => {
    try {
        if (!dbPromise) {
            dbPromise = connectDB();
        }

        await dbPromise;

        return app(req, res);
    } catch (error) {
        console.error('❌ Vercel API ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
};