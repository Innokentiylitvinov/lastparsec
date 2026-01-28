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
    MAX_SCORE_PER_SECOND: 20,
    MIN_GAME_TIME: 3,
    SESSION_TIMEOUT: 60 * 60 * 1000,
    NICKNAME_MIN: 2,
    NICKNAME_MAX: 17,
    PASSWORD_MIN: 4
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
    
    try {
        const sessionResult = await pool.query(
            'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
            [token]
        );
        
        if (sessionResult.rows.length === 0) return null;
        
        const userId = sessionResult.rows[0].user_id;
        const result = await pool.query('SELECT id, nickname FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Token validation error:', error);
        return null;
    }
}

// ====== ВАЛИДАЦИЯ ======
function validateNickname(nickname) {
    if (!nickname) return 'Nickname required';
    if (nickname.length < VALIDATION.NICKNAME_MIN) return `Nickname must be at least ${VALIDATION.NICKNAME_MIN} characters`;
    if (nickname.length > VALIDATION.NICKNAME_MAX) return `Nickname must be at most ${VALIDATION.NICKNAME_MAX} characters`;
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) return 'Nickname can only contain letters, numbers, and underscores';
    return null;
}

function validatePassword(password) {
    if (!password) return 'Password required';
    if (password.length < VALIDATION.PASSWORD_MIN) return `Password must be at least ${VALIDATION.PASSWORD_MIN} characters`;
    return null;
}

// ====== API: HEALTH ======
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// ====== API: AUTH ======

// Проверить, занят ли ник
app.get('/api/auth/check/:nickname', async (req, res) => {
    const { nickname } = req.params;
    
    const error = validateNickname(nickname);
    if (error) {
        return res.json({ exists: false, valid: false, error });
    }
    
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE LOWER(nickname) = LOWER($1)',
            [nickname]
        );
        res.json({ 
            exists: result.rows.length > 0,
            valid: true
        });
    } catch (error) {
        console.error('Check nickname error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    const { nickname, password } = req.body;
    
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
        return res.status(400).json({ error: nicknameError });
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }
    
    try {
        const passwordHash = hashPassword(password);
        const result = await pool.query(
            'INSERT INTO users (nickname, password_hash) VALUES ($1, $2) RETURNING id, nickname',
            [nickname, passwordHash]
        );
        
        const user = result.rows[0];
        const token = generateToken();
        
        await pool.query(
            'INSERT INTO sessions (user_id, token) VALUES ($1, $2)',
            [user.id, token]
        );
        
        console.log(`👤 New user: ${nickname}`);
        res.json({ 
            token, 
            nickname: user.nickname,
            bestScore: 0
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Nickname already taken' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    const { nickname, password } = req.body;
    
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
        return res.status(400).json({ error: nicknameError });
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
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
        
        await pool.query(
            'INSERT INTO sessions (user_id, token) VALUES ($1, $2)',
            [user.id, token]
        );
        
        // Получаем лучший результат
        const bestResult = await pool.query(
            'SELECT MAX(score) as best FROM scores WHERE user_id = $1',
            [user.id]
        );
        const bestScore = bestResult.rows[0]?.best || 0;
        
        console.log(`🔑 User logged in: ${user.nickname} (best: ${bestScore})`);
        res.json({ 
            token, 
            nickname: user.nickname,
            bestScore
        });
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
    
    try {
        const bestScore = await pool.query(
            'SELECT MAX(score) as best FROM scores WHERE user_id = $1',
            [user.id]
        );
        
        res.json({
            nickname: user.nickname,
            bestScore: bestScore.rows[0]?.best || 0
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Выход
app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    res.json({ success: true });
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

app.post('/api/game/end', async (req, res) => {
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
    
    // Проверяем, новый ли это рекорд
    let isNewRecord = true;
    const user = await getUserFromToken(req);
    
    if (user) {
        try {
            const best = await pool.query(
                'SELECT MAX(score) as best FROM scores WHERE user_id = $1',
                [user.id]
            );
            const bestScore = best.rows[0]?.best || 0;
            isNewRecord = score > bestScore;
        } catch (error) {
            console.error('Check best score error:', error);
        }
    }
    
    console.log(`✅ Valid: ${score} pts in ${gameTime.toFixed(1)}s (record: ${isNewRecord})`);
    
    res.json({ 
        valid: true, 
        score, 
        gameTime: gameTime.toFixed(1),
        sessionId,
        isNewRecord
    });
});

// ====== API: SCORES ======

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
        // Проверяем текущий лучший результат
        const current = await pool.query(
            'SELECT id, score FROM scores WHERE user_id = $1 ORDER BY score DESC LIMIT 1',
            [user.id]
        );
        
        let isNewRecord = false;
        
        if (current.rows.length === 0) {
            // Первый результат — вставляем
            await pool.query(
                'INSERT INTO scores (user_id, score, game_time) VALUES ($1, $2, $3)',
                [user.id, session.finalScore, session.gameTime]
            );
            isNewRecord = true;
        } else if (session.finalScore > current.rows[0].score) {
            // Новый рекорд — обновляем
            await pool.query(
                'UPDATE scores SET score = $1, game_time = $2, created_at = NOW() WHERE id = $3',
                [session.finalScore, session.gameTime, current.rows[0].id]
            );
            isNewRecord = true;
        }
        
        gameSessions.delete(sessionId);
        
        // Получаем место в рейтинге
        const rank = await pool.query(`
            SELECT COUNT(*) + 1 as rank 
            FROM (
                SELECT user_id, MAX(score) as best_score
                FROM scores
                GROUP BY user_id
                HAVING MAX(score) > $1
            ) as better_players
        `, [session.finalScore]);
        
        if (isNewRecord) {
            console.log(`💾 New record: ${user.nickname} - ${session.finalScore}`);
        } else {
            console.log(`📊 Score not saved (not a record): ${user.nickname} - ${session.finalScore}`);
        }
        
        res.json({ 
            saved: isNewRecord, 
            score: session.finalScore,
            rank: parseInt(rank.rows[0].rank),
            isNewRecord
        });
    } catch (error) {
        console.error('Save score error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ====== API: LEADERBOARD ======

app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        const result = await pool.query(`
            SELECT u.nickname, MAX(s.score) as score
            FROM scores s
            JOIN users u ON s.user_id = u.id
            GROUP BY u.id, u.nickname
            ORDER BY score DESC
            LIMIT $1
        `, [limit]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ====== API: PROFILE ======

app.get('/api/profile/:nickname', async (req, res) => {
    try {
        const { nickname } = req.params;
        
        const userResult = await pool.query(
            'SELECT id, nickname, created_at FROM users WHERE LOWER(nickname) = LOWER($1)',
            [nickname]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Лучший результат
        const bestResult = await pool.query(
            'SELECT MAX(score) as best FROM scores WHERE user_id = $1',
            [user.id]
        );
        const bestScore = bestResult.rows[0]?.best || 0;
        
        // Ранг
        const rankResult = await pool.query(`
            SELECT COUNT(*) + 1 as rank 
            FROM (
                SELECT user_id, MAX(score) as best_score
                FROM scores
                GROUP BY user_id
                HAVING MAX(score) > $1
            ) as better_players
        `, [bestScore]);
        
        // Количество игр
        const gamesResult = await pool.query(
            'SELECT COUNT(*) as games FROM scores WHERE user_id = $1',
            [user.id]
        );
        
        res.json({
            nickname: user.nickname,
            bestScore,
            rank: parseInt(rankResult.rows[0].rank),
            gamesPlayed: parseInt(gamesResult.rows[0].games),
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Profile error:', error);
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
