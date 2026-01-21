const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ====== БАЗА ДАННЫХ ======
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Создание таблиц при старте
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nickname VARCHAR(20) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                score INTEGER NOT NULL,
                game_time REAL NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
        `);
        console.log('✅ Database tables ready');
    } catch (error) {
        console.error('❌ Database init error:', error);
    }
}

// ====== АНТИЧИТ ======
const gameSessions = new Map();

const VALIDATION = {
    MAX_SCORE_PER_SECOND: 150,
    MIN_GAME_TIME: 3,
    SESSION_TIMEOUT: 60 * 60 * 1000
};

// Очистка старых сессий
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of gameSessions) {
        if (now - session.startTime > VALIDATION.SESSION_TIMEOUT) {
            gameSessions.delete(sessionId);
        }
    }
}, 10 * 60 * 1000);

// ====== FRONTEND ======
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('Frontend path:', frontendPath);
app.use(express.static(frontendPath));

// ====== API ======

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Начало игры
app.post('/api/game/start', (req, res) => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    gameSessions.set(sessionId, {
        startTime: Date.now(),
        validated: false
    });
    
    console.log(`🎮 Game started: ${sessionId}`);
    res.json({ sessionId });
});

// Конец игры
app.post('/api/game/end', (req, res) => {
    const { sessionId, score } = req.body;
    
    const session = gameSessions.get(sessionId);
    if (!session) {
        return res.status(400).json({ valid: false, reason: 'Invalid session' });
    }
    
    if (session.validated) {
        return res.status(400).json({ valid: false, reason: 'Session already used' });
    }
    
    const gameTime = (Date.now() - session.startTime) / 1000;
    
    if (gameTime < VALIDATION.MIN_GAME_TIME) {
        gameSessions.delete(sessionId);
        return res.status(400).json({ valid: false, reason: 'Game too short' });
    }
    
    const maxPossibleScore = gameTime * VALIDATION.MAX_SCORE_PER_SECOND;
    if (score > maxPossibleScore) {
        console.log(`❌ Cheater: ${score} in ${gameTime}s`);
        gameSessions.delete(sessionId);
        return res.status(400).json({ valid: false, reason: 'Score too high' });
    }
    
    session.validated = true;
    session.finalScore = score;
    session.gameTime = gameTime;
    
    console.log(`✅ Valid: ${score} pts in ${gameTime.toFixed(1)}s`);
    gameSessions.delete(sessionId);
    
    res.json({ valid: true, score, gameTime: gameTime.toFixed(1) });
});

// ====== ЛИДЕРБОРД ======

// Получить топ-10
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.nickname, s.score, s.game_time, s.created_at
            FROM scores s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.score DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Всё остальное → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ====== СТАРТ ======
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${frontendPath}`);
    await initDatabase();
});
