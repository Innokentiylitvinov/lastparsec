const ENEMY_COLORS = ['#0044FF', '#0066FF', '#0088FF', '#00AAFF', '#9B30FF'];

export class EnemyManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.enemies = [];
        this.asteroids = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.asteroidTimer = 0;
    }
    
    getSpawnInterval(score) {
        return Math.max(0.5, 2 - score * 0.025);
    }
    
    getEnemySpeed(score) {
        return 90 + (score * 3);
    }
    
    getShootInterval(score) {
        return Math.max(0.5, 2 - score * 0.01);
    }

    update(score, playerBounds, onScoreChange, onGameOver, deltaTime) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > this.getSpawnInterval(score)) {
            this.spawnEnemy(score);
            this.spawnTimer = 0;
        }
        
        this.asteroidTimer += deltaTime;
        if (this.asteroidTimer > this.getSpawnInterval(score) * 5) {
            this.spawnAsteroid();
            this.asteroidTimer = 0;
        }
        
        this.updateEnemies(playerBounds, onScoreChange, onGameOver, deltaTime);
        this.updateAsteroids(playerBounds, onScoreChange, onGameOver, deltaTime);
        this.updateEnemyBullets(playerBounds, onGameOver, deltaTime);
    }
    
    spawnEnemy(score) {
        const type = Math.floor(Math.random() * 5);
        const enemy = {
            x: Math.random() * (this.canvas.width - 40) + 20,
            y: -40,
            width: 35,
            height: 35,
            speed: this.getEnemySpeed(score),
            type: type,
            color: ENEMY_COLORS[type],
            dead: false  // ✅ Флаг для удаления
        };
        
        if (type === 4) {
            const interval = this.getShootInterval(score);
            enemy.shootTimer = interval * 0.5;
            enemy.shootInterval = interval;
            enemy.canShoot = true;
        }
        
        this.enemies.push(enemy);
    }
    
    spawnAsteroid() {
        this.asteroids.push({
            x: Math.random() * (this.canvas.width - 50) + 25,
            y: -50,
            width: 50,
            height: 50,
            speed: 90 + Math.random() * 60,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 2,
            dead: false  // ✅ Флаг для удаления
        });
    }
    
    enemyShoot(enemy) {
        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            prevY: enemy.y + enemy.height / 2,
            width: 6,
            height: 15,
            speed: Math.max(300, enemy.speed + 150),
            dead: false  // ✅ Флаг для удаления
        });
    }
    
    // ✅ Оптимизировано — без splice внутри цикла
    updateEnemies(playerBounds, onScoreChange, onGameOver, deltaTime) {
        let gameOverReason = null;
        const canvasHeight = this.canvas.height;
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy.dead) continue;
            
            enemy.y += enemy.speed * deltaTime;
            
            if (enemy.type === 4 && enemy.canShoot) {
                enemy.shootTimer += deltaTime;
                if (enemy.shootTimer >= enemy.shootInterval) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = 0;
                }
            }
            
            if (enemy.y > canvasHeight + 40) {
                enemy.dead = true;
                const newScore = onScoreChange(-1);
                if (newScore < 0 && !gameOverReason) {
                    gameOverReason = 'Too many enemies escaped!';
                }
                continue;
            }
            
            if (!gameOverReason && this.checkCollision(playerBounds, enemy)) {
                gameOverReason = 'You crashed into an enemy!';
            }
        }
        
        if (gameOverReason) {
            onGameOver(gameOverReason);
        }
    }
    
    updateAsteroids(playerBounds, onScoreChange, onGameOver, deltaTime) {
        let gameOverReason = null;
        const canvasHeight = this.canvas.height;
        
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            if (asteroid.dead) continue;
            
            asteroid.y += asteroid.speed * deltaTime;
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;
            
            if (asteroid.y > canvasHeight + 50) {
                asteroid.dead = true;
                const newScore = onScoreChange(-1);
                if (newScore < 0 && !gameOverReason) {
                    gameOverReason = 'Too many objects escaped!';
                }
                continue;
            }
            
            if (!gameOverReason && this.checkCollision(playerBounds, asteroid)) {
                gameOverReason = 'You crashed into an asteroid!';
            }
        }
        
        if (gameOverReason) {
            onGameOver(gameOverReason);
        }
    }
    
    updateEnemyBullets(playerBounds, onGameOver, deltaTime) {
        let gameOverReason = null;
        const canvasHeight = this.canvas.height;
        
        for (let i = 0; i < this.enemyBullets.length; i++) {
            const bullet = this.enemyBullets[i];
            if (bullet.dead) continue;
            
            bullet.prevY = bullet.y;
            bullet.y += bullet.speed * deltaTime;
            
            if (bullet.y > canvasHeight + bullet.height) {
                bullet.dead = true;
                continue;
            }
            
            if (!gameOverReason && this.checkBulletCollision(bullet, playerBounds)) {
                gameOverReason = 'You were shot by an enemy!';
            }
        }
        
        if (gameOverReason) {
            onGameOver(gameOverReason);
        }
    }
    
    checkCollision(obj1, obj2) {
        return obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
               obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
               obj1.y + obj1.height / 2 > obj2.y - obj2.height / 2 &&
               obj1.y - obj1.height / 2 < obj2.y + obj2.height / 2;
    }
    
    checkBulletCollision(bullet, target) {
        const bulletLeft = bullet.x - bullet.width / 2;
        const bulletRight = bullet.x + bullet.width / 2;
        const bulletTop = bullet.y;
        const bulletBottom = bullet.y + bullet.height;
        
        const targetLeft = target.x - target.width / 2;
        const targetRight = target.x + target.width / 2;
        const targetTop = target.y - target.height / 2;
        const targetBottom = target.y + target.height / 2;
        
        if (bulletRight > targetLeft && bulletLeft < targetRight &&
            bulletBottom > targetTop && bulletTop < targetBottom) {
            return true;
        }
        
        if (bullet.prevY !== undefined) {
            const prevTop = bullet.prevY;
            if (bulletRight > targetLeft && bulletLeft < targetRight &&
                prevTop <= targetBottom && bulletBottom >= targetTop) {
                return true;
            }
        }
        
        return false;
    }
    
    checkPlayerBullets(bullets, onScoreChange) {
        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            if (bullet.dead) continue;
            
            // Проверка врагов
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                if (enemy.dead) continue;
                
                if (this.checkBulletCollision(bullet, enemy)) {
                    enemy.dead = true;
                    bullet.dead = true;
                    onScoreChange(1);
                    break;
                }
            }
            
            if (bullet.dead) continue;
            
            // Проверка астероидов
            for (let j = 0; j < this.asteroids.length; j++) {
                const asteroid = this.asteroids[j];
                if (asteroid.dead) continue;
                
                if (this.checkBulletCollision(bullet, asteroid)) {
                    asteroid.dead = true;
                    bullet.dead = true;
                    onScoreChange(1);
                    break;
                }
            }
        }
    }
    
    // ✅ Очистка мёртвых объектов — вызывать раз в N кадров
    cleanup() {
        this.enemies = this.enemies.filter(e => !e.dead);
        this.asteroids = this.asteroids.filter(a => !a.dead);
        this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
    }
    
    // ✅ БЕЗ shadowBlur — главная оптимизация!
    draw(ctx) {
        // Враги — простые треугольники без теней
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy.dead) continue;
            
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Астероиды — без save/restore, вращение через формулу
        ctx.fillStyle = '#00FF00';
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            if (asteroid.dead) continue;
            
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2 + asteroid.rotation;
                const px = asteroid.x + Math.cos(angle) * asteroid.width / 2;
                const py = asteroid.y + Math.sin(angle) * asteroid.height / 2;
                if (j === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();
        }
        
        // Пули врагов — без теней
        ctx.fillStyle = '#FF00FF';
        for (let i = 0; i < this.enemyBullets.length; i++) {
            const bullet = this.enemyBullets[i];
            if (bullet.dead) continue;
            ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        }
    }
    
    reset() {
        this.enemies = [];
        this.asteroids = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.asteroidTimer = 0;
    }
}
