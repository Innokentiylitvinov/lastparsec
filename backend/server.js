// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Определяем путь к frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('Frontend path:', frontendPath);

// Раздаём frontend
app.use(express.static(frontendPath));

// ====== АНТИЧИТ: Хранилище сессий ======
const gameSessions = new Map();

// Настройки валидации
const VALIDATION = {
    MAX_SCORE_PER_SECOND: 150,  // Максимум очков в секунду
    MIN_GAME_TIME: 3,           // Минимум секунд игры
    SESSION_TIMEOUT: 60 * 60 * 1000  // 1 час
};

// Очистка старых сессий каждые 10 минут
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of gameSessions) {
        if (now - session.startTime > VALIDATION.SESSION_TIMEOUT) {
            gameSessions.delete(sessionId);
        }
    }
}, 10 * 60 * 1000);

// ====== API ======

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Начало игры — создаём сессию
app.post('/api/game/start', (req, res) => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    gameSessions.set(sessionId, {
        startTime: Date.now(),
        validated: false
    });
    
    console.log(`🎮 Game started: ${sessionId}`);
    
    res.json({ sessionId });
});

// Конец игры — валидируем результат
app.post('/api/game/end', (req, res) => {
    const { sessionId, score } = req.body;
    
    // Проверяем наличие сессии
    const session = gameSessions.get(sessionId);
    if (!session) {
        console.log(`❌ Invalid session: ${sessionId}`);
        return res.status(400).json({ 
            valid: false, 
            reason: 'Invalid session' 
        });
    }
    
    // Проверяем, не использована ли сессия
    if (session.validated) {
        console.log(`❌ Session already used: ${sessionId}`);
        return res.status(400).json({ 
            valid: false, 
            reason: 'Session already used' 
        });
    }
    
    // Считаем время игры
    const gameTime = (Date.now() - session.startTime) / 1000;
    
    // Проверка минимального времени
    if (gameTime < VALIDATION.MIN_GAME_TIME) {
        console.log(`❌ Too fast: ${gameTime}s for ${score} points`);
        gameSessions.delete(sessionId);
        return res.status(400).json({ 
            valid: false, 
            reason: 'Game too short' 
        });
    }
    
    // Проверка максимальных очков за время
    const maxPossibleScore = gameTime * VALIDATION.MAX_SCORE_PER_SECOND;
    if (score > maxPossibleScore) {
        console.log(`❌ Cheater detected: ${score} points in ${gameTime}s (max: ${maxPossibleScore})`);
        gameSessions.delete(sessionId);
        return res.status(400).json({ 
            valid: false, 
            reason: 'Score too high for game duration' 
        });
    }
    
    // Всё ок — помечаем сессию как использованную
    session.validated = true;
    session.finalScore = score;
    session.gameTime = gameTime;
    
    console.log(`✅ Valid game: ${score} points in ${gameTime.toFixed(1)}s`);
    
    // Удаляем сессию (или сохраняем для лидерборда)
    gameSessions.delete(sessionId);
    
    res.json({ 
        valid: true, 
        score,
        gameTime: gameTime.toFixed(1)
    });
});

// Всё остальное → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${frontendPath}`);
});
