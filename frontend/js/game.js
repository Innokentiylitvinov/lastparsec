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
let lastFrameTime = performance.now();

// ====== ФУНКЦИИ ИГРЫ ======
function changeScore(delta) {
    score += delta;
    ui.updateScore(score);
    return score;
}

// ✅ Game Over с isNewRecord
async function gameOver(reason) {
    window.gameRunning = false;
    
    const result = await api.endGame(score);
    
    if (result.valid) {
        // Передаём isNewRecord в AuthUI
        if (typeof AuthUI !== 'undefined') {
            AuthUI.setGameResult(api.lastSessionId, score, result.isNewRecord);
        }
        
        // Показываем разную информацию в зависимости от рекорда
        let extra = `Время: ${result.gameTime}с`;
        if (result.isNewRecord) {
            extra = `🏆 Новый рекорд! (${result.gameTime}с)`;
        }
        
        ui.showGameOver(reason, score, extra);
    } else {
        ui.showGameOver(reason, score, `⚠️ Результат не засчитан`);
        console.warn('Score rejected:', result.reason);
    }
}

async function startGame() {
    ui.hideStartScreen();
    
    if (controls.isMobile && controls.gyroPermissionNeeded && !controls.gyroEnabled) {
        const granted = await controls.requestGyroPermission();
        if (!granted) {
            ui.showStartScreen();
            renderer.startMenuLoop();  // ✅ Возобновляем звёзды в меню
            return;
        }
    }
    
    const sessionId = await api.startGame();
    if (!sessionId) {
        alert('Ошибка подключения к серверу');
        ui.showStartScreen();
        renderer.startMenuLoop();  // ✅ Возобновляем звёзды в меню
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
    lastFrameTime = performance.now();
    
    // ✅ Запускаем игровой цикл
    requestAnimationFrame(gameLoop);
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
    renderer.startMenuLoop();  // ✅ Возобновляем звёзды в меню
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

// ====== ИГРОВОЙ ЦИКЛ ======
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    // Ограничиваем deltaTime (защита от лагов)
    const dt = Math.min(deltaTime, 0.1);
    
    renderer.clear();
    renderer.updateStars(dt);
    renderer.drawStars();
    
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
        
        renderer.drawBullets(bullets);
        enemyManager.draw(renderer.getContext());
        player.draw(renderer.getContext());
    } else if (gameStarted) {
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
    
    // Запускаем цикл меню (звёзды)
    renderer.startMenuLoop();
    
    // Игровой цикл запустится при старте игры
}

// Экспортируем функции для auth.js
window.backToMenu = backToMenu;
window.startGame = startGame;

init();