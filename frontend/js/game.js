import { ControlSystem } from './input.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { API } from './api.js';
import { Renderer } from './renderer.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Controls } from './controls.js';
import { API } from './api.js';
import { AuthUI } from './auth.js';  // Добавить этот импорт


// ====== СОСТОЯНИЕ ИГРЫ ======
window.gameRunning = false;
let gameStarted = false;

const canvas = document.getElementById('gameCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ====== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ ======
const ui = new UI();
const renderer = new Renderer(canvas);
const player = new Player(canvas);
const enemyManager = new EnemyManager(canvas);
const api = new API();

// Пули игрока
const bullets = [];
const BULLET_SPEED = 420;

function shoot() {
    if (!window.gameRunning) return;
    bullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        prevY: player.y - player.height / 2,
        width: 4,
        height: 15
    });
}

const controls = new ControlSystem(shoot);

// ====== ИГРОВЫЕ ПЕРЕМЕННЫЕ ======
let score = 0;
let lastFrameTime = 0;

// ====== ФУНКЦИИ ИГРЫ ======
function changeScore(delta) {
    score += delta;
    ui.updateScore(score);
    return score;
}

async function gameOver(reason = '') {
    if (isGameOver) return;
    isGameOver = true;
    
    cancelAnimationFrame(animationId);
    
    // Отправляем результат на сервер
    const result = await api.endGame(score);
    
    // === ИСПРАВЛЕННЫЙ КОД ===
    // Безопасно уведомляем AuthUI о результате
    if (window.AuthUI?.setGameResult) {
        window.AuthUI.setGameResult(api.lastSessionId, score, result.isNewRecord);
    }
    // === КОНЕЦ ИСПРАВЛЕНИЯ ===
    
    // Показываем экран Game Over
    const gameOverScreen = document.getElementById('gameOver');
    const finalScore = document.getElementById('finalScore');
    const validationStatus = document.getElementById('validationStatus');
    
    finalScore.textContent = `Score: ${score}`;
    
    if (result.valid) {
        validationStatus.textContent = result.isNewRecord 
            ? '🏆 New Record!' 
            : '✓ Result verified';
        validationStatus.className = 'validation-success';
    } else {
        validationStatus.textContent = `⚠ ${result.reason || 'Verification failed'}`;
        validationStatus.className = 'validation-error';
    }
    
    gameOverScreen.style.display = 'flex';
}


async function startGame() {
    ui.hideStartScreen();
    
    if (controls.isMobile && controls.gyroPermissionNeeded && !controls.gyroEnabled) {
        const granted = await controls.requestGyroPermission();
        if (!granted) {
            ui.showStartScreen();
            return;
        }
    }
    
    const sessionId = await api.startGame();
    if (!sessionId) {
        alert('server connection error');
        ui.showStartScreen();
        return;
    }
    
    score = 0;
    ui.updateScore(score);
    ui.hideGameOver();
    
    player.reset();
    enemyManager.reset();
    bullets.length = 0;
    
    controls.mouseX = canvas.width / 2;
    
    if (!controls.isMobile) {
        canvas.requestPointerLock();
    }
    
    window.gameRunning = true;
    gameStarted = true;
}

function backToMenu() {
    window.gameRunning = false;
    gameStarted = false;
    
    bullets.length = 0;
    player.reset();
    enemyManager.reset();
    
    ui.hideGameOver();
    
    // Скрываем все оверлеи
    ['saveScoreScreen', 'leaderboardScreen', 'afterSaveButtons'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    
    ui.showStartScreen();
}

// ====== ОБНОВЛЕНИЕ ПУЛЬ ======
function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.prevY = bullet.y;
        bullet.y -= BULLET_SPEED * dt;
        
        if (bullet.y < -bullet.height) {
            bullets.splice(i, 1);
        }
    }
}

// ====== ИГРОВОЙ ЦИКЛ ======
function gameLoop(currentTime) {
    if (lastFrameTime === 0) lastFrameTime = currentTime;
    
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    const dt = Math.min(deltaTime, 0.1);
    
    renderer.clear();
    renderer.updateStars(dt);
    renderer.drawStars();
    
    if (window.gameRunning) {
        player.update(controls, dt);
        updateBullets(dt);
        enemyManager.update(score, player.getBounds(), changeScore, gameOver, dt);
        enemyManager.checkPlayerBullets(bullets, changeScore);
        
        renderer.drawBullets(bullets);
        enemyManager.draw(renderer.getContext());
        player.draw(renderer.getContext());
    }
    
    requestAnimationFrame(gameLoop);
}

// ====== ОБРАБОТЧИКИ UI ======
ui.onPlay(startGame);
ui.onRestart(startGame);
ui.onMenu(backToMenu);

// ====== ОБРАБОТЧИКИ ======
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ====== ИНИЦИАЛИЗАЦИЯ ======
async function init() {
    ui.showStartScreen();
    await controls.init();
    requestAnimationFrame(gameLoop);
}

window.backToMenu = backToMenu;
window.startGame = startGame;

init();
