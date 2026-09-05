// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.redirect('/pages/login.html');
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const problemRoutes = require('./routes/problemRoutes');
const codeRoutes = require('./routes/codeRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);

const errorMiddleware = require('./middlewares/errorMiddleware');
app.use(errorMiddleware);

// ============================================================
// WEBSOCKET SERVER
// ============================================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Lấy interactiveSessions từ codeController
const codeController = require('./controllers/codeController');
const interactiveSessions = codeController.getInteractiveSessions ? codeController.getInteractiveSessions() : new Map();

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('interactive:join', ({ sessionId }) => {
        const session = interactiveSessions.get(sessionId);
        if (!session) {
            socket.emit('interactive:error', 'Session not found');
            return;
        }

        socket.sessionId = sessionId;
        socket.join(sessionId);

        const runner = session.runner;

        const onOutput = (data) => {
            io.to(sessionId).emit('interactive:output', data);
        };
        const onError = (data) => {
            io.to(sessionId).emit('interactive:error', data);
        };
        const onExit = (code) => {
            io.to(sessionId).emit('interactive:exit', code);
            interactiveSessions.delete(sessionId);
        };

        runner.on('output', onOutput);
        runner.on('error', onError);
        runner.on('exit', onExit);

        socket._listeners = { onOutput, onError, onExit };

        socket.emit('interactive:ready', { message: 'Connected to interactive session' });
    });

    socket.on('interactive:input', ({ input }) => {
        const sessionId = socket.sessionId;
        if (!sessionId) return;
        const session = interactiveSessions.get(sessionId);
        if (session) {
            try {
                session.runner.sendInput(input);
            } catch (err) {
                socket.emit('interactive:error', err.message);
            }
        }
    });

    socket.on('interactive:kill', () => {
        const sessionId = socket.sessionId;
        if (!sessionId) return;
        const session = interactiveSessions.get(sessionId);
        if (session) {
            session.runner.kill();
            interactiveSessions.delete(sessionId);
        }
    });

    socket.on('disconnect', () => {
        const sessionId = socket.sessionId;
        if (sessionId) {
            const session = interactiveSessions.get(sessionId);
            if (session) {
                session.runner.kill();
                interactiveSessions.delete(sessionId);
            }
        }
        console.log('🔌 Client disconnected:', socket.id);
    });
});

module.exports = { app, server, io };