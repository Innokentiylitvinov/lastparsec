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
const BULLET_SPEED = 7;  // 🔥 Вернули как в оригинале!

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

// 🔥 FPS лимитер
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;
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
        
        let extra = `time: ${result.gameTime}s`;
        if (result.isNewRecord) {
            extra = `🏆 record set! (${result.gameTime}s)`;
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

// ====== ОБНОВЛЕНИЕ ПУЛЬ (по кадрам!) ======
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].prevY = bullets[i].y;
        bullets[i].y -= BULLET_SPEED;  // 🔥 Просто -7, без deltaTime!
        if (bullets[i].y < -bullets[i].height) {
            bullets.splice(i, 1);
        }
    }
}

// ====== ИГРОВОЙ ЦИКЛ С FPS ЛИМИТЕРОМ ======
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    
    // 🔥 FPS лимитер — пропускаем кадры если слишком быстро
    const elapsed = currentTime - lastFrameTime;
    if (elapsed < FRAME_DURATION) {
        return;
    }
    lastFrameTime = currentTime - (elapsed % FRAME_DURATION);
    
    // Всегда рисуем фон и звёзды
    renderer.clear();
    renderer.updateStarsFixed();  // 🔥 Новый метод без deltaTime
    renderer.drawStars();
    
    // Игровая логика только когда игра запущена
    if (window.gameRunning) {
        player.updateFixed(controls);  // 🔥 Новый метод без deltaTime
        updateBullets();
        
        enemyManager.updateFixed(  // 🔥 Новый метод без deltaTime
            score,
            player.getBounds(),
            changeScore,
            gameOver
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
}

// ====== ОБРАБОТЧИКИ UI ======
ui.onPlay(startGame);
ui.onRestart(restart);
ui.onMenu(backToMenu);

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
