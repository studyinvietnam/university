const { app } = require('../src/app');
const connectDB = require('../src/config/database');

let dbPromise = null;

module.exports = async (req, res) => {
    try {
        if (!dbPromise) {
            dbPromise = connectDB().catch((error) => {
                dbPromise = null;
                throw error;
            });
        }

        await dbPromise;

        return app(req, res);
    } catch (error) {
        console.error('❌ Vercel API ERROR:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};