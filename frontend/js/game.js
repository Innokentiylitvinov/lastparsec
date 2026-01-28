import { ControlSystem } from './input.js';
import { UI } from './ui.js';
import { API } from './api.js';

// ====== CANVAS ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ====== МОДУЛИ ======
const ui = new UI();
const api = new API();

function shoot() {
    if (!gameRunning) return;
    bullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        prevY: player.y - player.height / 2,
        width: 4,
        height: 15
    });
}

const controls = new ControlSystem(shoot);

// ====== СОСТОЯНИЕ (как в оригинале) ======
let score = 0;
let gameRunning = false;
window.gameRunning = false;
let lastFrameTime = Date.now();  // КАК В ОРИГИНАЛЕ!

// ====== ЗВЁЗДЫ ======
const stars = [];
for (let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2,
        speed: Math.random() * 2 + 0.5
    });
}

// ====== ИГРОК ======
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 40,
    height: 40,
    speed: 5,
    color: '#FF0000'
};

// ====== ПУЛИ ======
const bullets = [];
const BULLET_SPEED = 7;

const enemyBullets = [];
const ENEMY_BULLET_SPEED = 4;

// ====== ВРАГИ ======
const enemies = [];
const ENEMY_COLORS = ['#0044FF', '#0066FF', '#0088FF', '#00AAFF', '#9B30FF'];

// ====== АСТЕРОИДЫ ======
const asteroids = [];

// ====== ТАЙМЕРЫ (КАДРЫ, как в оригинале!) ======
let enemySpawnTimer = 0;
let asteroidSpawnTimer = 0;

// ====== ФУНКЦИИ СЛОЖНОСТИ ======
function getEnemySpawnRate() {
    return Math.max(30, 120 - score * 1.5);
}

function getEnemySpeed() {
    return 1.5 + (score * 0.05);
}

// ====== ОТРИСОВКА ======
function drawStars() {
    ctx.fillStyle = '#FFF';
    for (let i = 0; i < stars.length; i++) {
        ctx.beginPath();
        ctx.arc(stars[i].x, stars[i].y, stars[i].radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateStars() {
    for (let i = 0; i < stars.length; i++) {
        stars[i].y += stars[i].speed;
        if (stars[i].y > canvas.height) {
            stars[i].y = 0;
            stars[i].x = Math.random() * canvas.width;
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();
}

function updatePlayer(deltaTime) {
    const gyroSpeed = controls.getPlayerSpeed(canvas.width, deltaTime);
    if (gyroSpeed !== null) {
        player.x += gyroSpeed;
    }
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
}

function drawBullets() {
    ctx.fillStyle = '#FFFF00';
    for (let i = 0; i < bullets.length; i++) {
        ctx.fillRect(bullets[i].x - bullets[i].width / 2, bullets[i].y, bullets[i].width, bullets[i].height);
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].prevY = bullets[i].y;
        bullets[i].y -= BULLET_SPEED;  // КАДРОВАЯ СКОРОСТЬ!
        if (bullets[i].y < -bullets[i].height) {
            bullets.splice(i, 1);
        }
    }
}

function drawEnemyBullets() {
    ctx.fillStyle = '#FF00FF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF00FF';
    for (let i = 0; i < enemyBullets.length; i++) {
        ctx.fillRect(enemyBullets[i].x - 3, enemyBullets[i].y, 6, 15);
    }
    ctx.shadowBlur = 0;
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].prevY = enemyBullets[i].y;
        enemyBullets[i].y += ENEMY_BULLET_SPEED;
        
        if (enemyBullets[i].y > canvas.height + 15) {
            enemyBullets.splice(i, 1);
            continue;
        }
        
        if (checkBulletCollision(enemyBullets[i], player)) {
            gameOver('shot down');
            return;
        }
    }
}

function spawnEnemy() {
    const type = Math.floor(Math.random() * 5);
    const enemy = {
        x: Math.random() * (canvas.width - 40) + 20,
        y: -40,
        width: 35,
        height: 35,
        speed: getEnemySpeed(),
        type: type,
        color: ENEMY_COLORS[type]
    };
    
    if (type === 4) {
        enemy.shootTimer = 0;
        enemy.shootInterval = 120;
        enemy.canShoot = true;
    }
    
    enemies.push(enemy);
}

function enemyShoot(enemy) {
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        prevY: enemy.y + enemy.height / 2
    });
}

function drawEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        ctx.fillStyle = enemy.color;
        
        if (enemy.type === 4) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.color;
        }
        
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
        ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        if (enemy.type === 4) {
            ctx.shadowBlur = 0;
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        
        if (enemies[i].type === 4 && enemies[i].canShoot) {
            enemies[i].shootTimer++;
            if (enemies[i].shootTimer >= enemies[i].shootInterval) {
                enemyShoot(enemies[i]);
                enemies[i].shootTimer = 0;
            }
        }
        
        if (enemies[i].y > canvas.height + 40) {
            enemies.splice(i, 1);
            continue;
        }
        
        if (checkCollision(player, enemies[i])) {
            gameOver('hit by enemy');
            return;
        }
    }
}

function spawnAsteroid() {
    asteroids.push({
        x: Math.random() * (canvas.width - 50) + 25,
        y: -50,
        width: 50,
        height: 50,
        speed: 1.5 + Math.random(),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

function drawAsteroids() {
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation);
        
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
            const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * asteroid.width / 2;
            const y = Math.sin(angle) * asteroid.height / 2;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        asteroids[i].y += asteroids[i].speed;
        asteroids[i].rotation += asteroids[i].rotationSpeed;
        
        if (asteroids[i].y > canvas.height + 50) {
            asteroids.splice(i, 1);
            continue;
        }
        
        if (checkCollision(player, asteroids[i])) {
            gameOver('hit by asteroid');
            return;
        }
    }
}

// ====== КОЛЛИЗИИ ======
function checkCollision(obj1, obj2) {
    return obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
           obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
           obj1.y + obj1.height / 2 > obj2.y - obj2.height / 2 &&
           obj1.y - obj1.height / 2 < obj2.y + obj2.height / 2;
}

function checkBulletCollision(bullet, target) {
    const bL = bullet.x - bullet.width / 2, bR = bullet.x + bullet.width / 2;
    const bT = bullet.y, bB = bullet.y + bullet.height;
    const tL = target.x - target.width / 2, tR = target.x + target.width / 2;
    const tT = target.y - target.height / 2, tB = target.y + target.height / 2;
    
    if (bR > tL && bL < tR && bB > tT && bT < tB) return true;
    
    if (bullet.prevY !== undefined) {
        if (bR > tL && bL < tR && 
            ((bullet.prevY + bullet.height >= tT && bT <= tB) ||
             (bB >= tT && bullet.prevY <= tB))) return true;
    }
    return false;
}

function checkBulletCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let hit = false;
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkBulletCollision(bullets[i], enemies[j])) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score++;
                ui.updateScore(score);
                hit = true;
                break;
            }
        }
        
        if (hit) continue;
        
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (checkBulletCollision(bullets[i], asteroids[j])) {
                asteroids.splice(j, 1);
                bullets.splice(i, 1);
                score++;
                ui.updateScore(score);
                break;
            }
        }
    }
}

// ====== GAME OVER / START ======
async function gameOver(reason) {
    gameRunning = false;
    window.gameRunning = false;
    
    const result = await api.endGame(score);
    ui.showGameOver(reason, score, result.valid ? `time: ${result.gameTime}s` : '⚠️ rejected');
}

async function startGame() {
    ui.hideStartScreen();
    
    if (controls.isMobile && controls.gyroPermissionNeeded && !controls.gyroEnabled) {
        const granted = await controls.requestGyroPermission();
        if (!granted) { ui.showStartScreen(); return; }
    }
    
    const sessionId = await api.startGame();
    if (!sessionId) { alert('server error'); ui.showStartScreen(); return; }
    
    score = 0;
    ui.updateScore(score);
    ui.hideGameOver();
    
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    asteroids.length = 0;
    enemySpawnTimer = 0;
    asteroidSpawnTimer = 0;
    
    gameRunning = true;
    window.gameRunning = true;
}

function restart() { startGame(); }
function backToMenu() {
    gameRunning = false;
    window.gameRunning = false;
    ui.hideGameOver();
    ui.showStartScreen();
}

// ====== GAME LOOP (КАК В ОРИГИНАЛЕ!) ======
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updateStars();
    drawStars();
    
    if (gameRunning) {
        updatePlayer(deltaTime);
        
        enemySpawnTimer++;
        if (enemySpawnTimer > getEnemySpawnRate()) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
        
        asteroidSpawnTimer++;
        if (asteroidSpawnTimer > getEnemySpawnRate() * 10) {
            spawnAsteroid();
            asteroidSpawnTimer = 0;
        }
        
        updateBullets();
        updateEnemyBullets();
        updateEnemies();
        updateAsteroids();
        checkBulletCollisions();
        
        drawBullets();
        drawEnemyBullets();
        drawEnemies();
        drawAsteroids();
        drawPlayer();
    }
    
    requestAnimationFrame(gameLoop);
}

// ====== INIT ======
ui.onPlay(startGame);
ui.onRestart(restart);
ui.onMenu(backToMenu);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

async function init() {
    ui.showStartScreen();
    await controls.init();
    requestAnimationFrame(gameLoop);
}

window.backToMenu = backToMenu;
window.startGame = startGame;

init();
