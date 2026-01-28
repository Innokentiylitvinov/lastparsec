let cleanupCounter = 0;
import { ControlSystem } from './input.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { API } from './api.js';

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

async function gameOver(reason) {
    window.gameRunning = false;
    
    const result = await api.endGame(score);
    
    if (result.valid) {
        if (typeof AuthUI !== 'undefined') {
            AuthUI.setGameResult(api.lastSessionId, score, result.isNewRecord);
        }
        
        let extra = `time: ${result.gameTime}с`;
        if (result.isNewRecord) {
            extra = `🏆 record Set! (${result.gameTime}с)`;
        }
        
        ui.showGameOver(reason, score, extra);
    } else {
        ui.showGameOver(reason, score, `⚠️ score rejected`);
        console.warn('Score rejected:', result.reason);
    }
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

function restart() {
    startGame();
}

function backToMenu() {
    window.gameRunning = false;
    gameStarted = false;
    
    bullets.length = 0;
    player.reset();
    enemyManager.reset();
    
    ui.hideGameOver();
    document.getElementById('saveScoreScreen')?.classList.add('hidden');
    document.getElementById('leaderboardScreen')?.classList.add('hidden');
    document.getElementById('afterSaveButtons')?.classList.add('hidden');
    
    ui.showStartScreen();
}

// ====== ОБНОВЛЕНИЕ ПУЛЬ ======
function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].prevY = bullets[i].y;
        bullets[i].y -= BULLET_SPEED * deltaTime;
        if (bullets[i].y < -bullets[i].height) {
            bullets.splice(i, 1);
        }
    }
}

// ====== ОДИН ВЕЧНЫЙ ИГРОВОЙ ЦИКЛ ======
function gameLoop(currentTime) {
    // Первый кадр
    if (lastFrameTime === 0) {
        lastFrameTime = currentTime;
    }
    
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    // Защита от больших скачков
    const dt = Math.min(deltaTime, 0.1);
    
    // Всегда рисуем фон и звёзды
    renderer.clear();
    if (!window.gameRunning) {
        // Звёзды только в меню!
        renderer.updateStars(dt);
        renderer.drawStars();
    }
    
    // Игровая логика только когда игра запущена
    if (window.gameRunning) {
        player.update(controls, dt);
        updateBullets(dt);
        
        enemyManager.update(
            score,
            player.getBounds(),
            changeScore,
            gameOver,
            dt
        );
        
        enemyManager.checkPlayerBullets(bullets, changeScore);
        
        // ✅ Очистка пуль игрока
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].dead) {
                bullets.splice(i, 1);
            }
        }

        // ✅ Очистка мёртвых объектов каждые 60 кадров
        cleanupCounter++;
        if (cleanupCounter >= 60) {
            enemyManager.cleanup();
            cleanupCounter = 0;
        }

        renderer.drawBullets(bullets);
        enemyManager.draw(renderer.getContext());
        player.draw(renderer.getContext());
    } else if (gameStarted) {
        // Game Over — показываем последний кадр
        renderer.drawBullets(bullets);
        enemyManager.draw(renderer.getContext());
        player.draw(renderer.getContext());
    }
    
    requestAnimationFrame(gameLoop);
}

// ====== ОБРАБОТЧИКИ UI ======
ui.onPlay(startGame);
ui.onRestart(restart);
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
    
    // Запускаем единственный цикл
    requestAnimationFrame(gameLoop);
}

window.backToMenu = backToMenu;
window.startGame = startGame;

init();
