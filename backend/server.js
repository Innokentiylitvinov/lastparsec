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

async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                nickname VARCHAR(20) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(64) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
            );
            
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                score INTEGER NOT NULL,
                game_time REAL NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        `);
        console.log('✅ Database tables ready');
    } catch (error) {
        console.error('❌ Database init error:', error);
    }
}


// ====== ХЕШИРОВАНИЕ ПАРОЛЯ ======
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}


// ====== АНТИЧИТ ======
const gameSessions = new Map();

const VALIDATION = {
    MAX_SCORE_PER_SECOND: 150,
    MIN_GAME_TIME: 3,
    SESSION_TIMEOUT: 60 * 60 * 1000
};

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

// ====== MIDDLEWARE: Получить юзера по токену ======
async function getUserFromToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.slice(7);
    
    // Ищем токен в БД
    const sessionResult = await pool.query(
        'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
        [token]
    );
    
    if (sessionResult.rows.length === 0) return null;
    
    const userId = sessionResult.rows[0].user_id;
    const result = await pool.query('SELECT id, nickname FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
}


// ====== API: HEALTH ======
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// ====== API: AUTH ======

// Проверить, занят ли ник
app.post('/api/auth/check-nickname', async (req, res) => {
    const { nickname } = req.body;
    
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ error: 'Nickname must be 2-20 characters' });
    }
    
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE LOWER(nickname) = LOWER($1)',
            [nickname]
        );
        res.json({ available: result.rows.length === 0 });
    } catch (error) {
        console.error('Check nickname error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    const { nickname, password } = req.body;
    
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
        return res.status(400).json({ error: 'Nickname must be 2-20 characters' });
    }
    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    try {
        const passwordHash = hashPassword(password);
        const result = await pool.query(
            'INSERT INTO users (nickname, password_hash) VALUES ($1, $2) RETURNING id, nickname',
            [nickname, passwordHash]
        );
        
        const user = result.rows[0];
        const token = generateToken();
        authTokens.set(token, user.id);
        
        console.log(`👤 New user: ${nickname}`);
        res.json({ token, nickname: user.nickname });
    } catch (error) {
        if (error.code === '23505') { // unique violation
            return res.status(400).json({ error: 'Nickname already taken' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    const { nickname, password } = req.body;
    
    if (!nickname || !password) {
        return res.status(400).json({ error: 'Nickname and password required' });
    }
    
    try {
        const passwordHash = hashPassword(password);
        const result = await pool.query(
            'SELECT id, nickname FROM users WHERE LOWER(nickname) = LOWER($1) AND password_hash = $2',
            [nickname, passwordHash]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid nickname or password' });
        }
        
        const user = result.rows[0];
        const token = generateToken();
        
        // Сохраняем токен в БД
        await pool.query(
            'INSERT INTO sessions (user_id, token) VALUES ($1, $2)',
            [user.id, token]
        );
        
        console.log(`🔑 User logged in: ${user.nickname}`);
        res.json({ token, nickname: user.nickname });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});


// Кто я?
app.get('/api/auth/me', async (req, res) => {
    const user = await getUserFromToken(req);
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Получаем лучший результат
    const bestScore = await pool.query(
        'SELECT MAX(score) as best FROM scores WHERE user_id = $1',
        [user.id]
    );
    
    res.json({
        nickname: user.nickname,
        bestScore: bestScore.rows[0]?.best || 0
    });
});

// ====== API: GAME ======

app.post('/api/game/start', (req, res) => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    gameSessions.set(sessionId, {
        startTime: Date.now(),
        validated: false
    });
    
    console.log(`🎮 Game started: ${sessionId}`);
    res.json({ sessionId });
});

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
    
    res.json({ 
        valid: true, 
        score, 
        gameTime: gameTime.toFixed(1),
        sessionId // возвращаем для сохранения результата
    });
});

// ====== API: SCORES ======

// Сохранить результат
app.post('/api/scores', async (req, res) => {
    const { sessionId } = req.body;
    const user = await getUserFromToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const session = gameSessions.get(sessionId);
    if (!session || !session.validated) {
        return res.status(400).json({ error: 'Invalid or unvalidated session' });
    }
    
    try {
        await pool.query(
            'INSERT INTO scores (user_id, score, game_time) VALUES ($1, $2, $3)',
            [user.id, session.finalScore, session.gameTime]
        );
        
        gameSessions.delete(sessionId);
        
        // Получаем место в рейтинге
        const rank = await pool.query(
            'SELECT COUNT(*) + 1 as rank FROM scores WHERE score > $1',
            [session.finalScore]
        );
        
        console.log(`💾 Score saved: ${user.nickname} - ${session.finalScore}`);
        res.json({ 
            saved: true, 
            score: session.finalScore,
            rank: parseInt(rank.rows[0].rank)
        });
    } catch (error) {
        console.error('Save score error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ====== API: LEADERBOARD ======

app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 256;
        const offset = parseInt(req.query.offset) || 0;
        
        const result = await pool.query(`
            SELECT u.nickname, s.score, s.game_time, s.created_at
            FROM scores s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.score DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        res.json(result.rows);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});


// ====== FALLBACK ======
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ====== START ======
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${frontendPath}`);
    await initDatabase();
});
