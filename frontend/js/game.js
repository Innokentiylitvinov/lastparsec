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
let lastFrameTime = Date.now();

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
    const sessionId = await api.startGame();
    if (!sessionId) {
        alert('Ошибка подключения к серверу');
        return;
    }
    
    score = 0;
    ui.updateScore(score);
    ui.hideStartScreen();
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
    ui.showStartScreen();
    
    player.reset();
    enemyManager.reset();
    bullets.length = 0;
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
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    renderer.clear();
    renderer.updateStars(deltaTime);
    renderer.drawStars();
    
    if (window.gameRunning) {
        player.update(controls, deltaTime);
        updateBullets(deltaTime);
        
        enemyManager.update(
            score,
            player.getBounds(),
            changeScore,
            gameOver,
            deltaTime
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
    await controls.init();
    ui.showStartScreen();
    gameLoop();
}

init();
