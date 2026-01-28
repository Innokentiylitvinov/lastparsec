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
            color: ENEMY_COLORS[type]
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
            rotationSpeed: (Math.random() - 0.5) * 2
        });
    }
    
    enemyShoot(enemy) {
        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            prevY: enemy.y + enemy.height / 2,
            width: 6,
            height: 15,
            speed: 240
        });
    }
    
    updateEnemies(playerBounds, onScoreChange, onGameOver, dt) {
        const height = this.canvas.height;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed * dt;
            
            // Стрельба (тип 4)
            if (enemy.canShoot) {
                enemy.shootTimer -= dt;
                if (enemy.shootTimer <= 0) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = enemy.shootInterval;
                }
            }
            
            // Вышел за экран
            if (enemy.y > height + 50) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            // Столкновение с игроком
            if (this.checkCollision(enemy, playerBounds)) {
                onGameOver('hit by enemy');
                return;
            }
        }
    }
    
    updateAsteroids(playerBounds, onScoreChange, onGameOver, dt) {
        const height = this.canvas.height;
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.y += asteroid.speed * dt;
            asteroid.rotation += asteroid.rotationSpeed * dt;
            
            // Вышел за экран
            if (asteroid.y > height + 60) {
                this.asteroids.splice(i, 1);
                continue;
            }
            
            // Столкновение с игроком
            if (this.checkCollision(asteroid, playerBounds)) {
                onGameOver('hit by asteroid');
                return;
            }
        }
    }
    
    updateEnemyBullets(playerBounds, onGameOver, dt) {
        const height = this.canvas.height;
        
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.prevY = bullet.y;
            bullet.y += bullet.speed * dt;
            
            // Вышла за экран
            if (bullet.y > height + 20) {
                this.enemyBullets.splice(i, 1);
                continue;
            }
            
            // Попадание в игрока
            if (this.checkCollision(bullet, playerBounds)) {
                onGameOver('shot down');
                return;
            }
        }
    }
    
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    checkPlayerBullets(bullets, onScoreChange) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Проверяем врагов
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(bullet, this.enemies[j])) {
                    this.enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    onScoreChange(1);
                    break;
                }
            }
            
            // Проверяем астероиды (пуля НЕ уничтожает астероид)
            // Просто пролетает сквозь
        }
    }
    
    // ====== ОТРИСОВКА БЕЗ ТЕНЕЙ! ======
    draw(ctx) {
        // Враги
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y - enemy.height / 2);
            ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Астероиды (простые круги вместо вращения!)
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            ctx.beginPath();
            ctx.arc(asteroid.x, asteroid.y, asteroid.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Пули врагов (без теней!)
        ctx.fillStyle = '#FF0000';
        
        for (let i = 0; i < this.enemyBullets.length; i++) {
            const bullet = this.enemyBullets[i];
            ctx.fillRect(
                bullet.x - bullet.width / 2,
                bullet.y,
                bullet.width,
                bullet.height
            );
        }
    }
    
    reset() {
        this.enemies.length = 0;
        this.asteroids.length = 0;
        this.enemyBullets.length = 0;
        this.spawnTimer = 0;
        this.asteroidTimer = 0;
    }
}
