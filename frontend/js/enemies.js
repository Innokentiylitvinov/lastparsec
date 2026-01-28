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
    
    // 🔥 Интервал в КАДРАХ (как в оригинале)
    getSpawnInterval(score) {
        return Math.max(30, 120 - score * 1.5);
    }
    
    // 🔥 Скорость в пикселях за КАДР
    getEnemySpeed(score) {
        return 1.5 + (score * 0.05);
    }
    
    // 🔥 НОВЫЙ метод — по кадрам
    updateFixed(score, playerBounds, onScoreChange, onGameOver) {
        // Спавн врагов
        this.spawnTimer++;
        if (this.spawnTimer > this.getSpawnInterval(score)) {
            this.spawnEnemy(score);
            this.spawnTimer = 0;
        }
        
        // Спавн астероидов
        this.asteroidTimer++;
        if (this.asteroidTimer > this.getSpawnInterval(score) * 10) {
            this.spawnAsteroid();
            this.asteroidTimer = 0;
        }
        
        this.updateEnemiesFixed(playerBounds, onScoreChange, onGameOver);
        this.updateAsteroidsFixed(playerBounds, onScoreChange, onGameOver);
        this.updateEnemyBulletsFixed(playerBounds, onGameOver);
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
            enemy.shootTimer = 60;  // Первый выстрел быстрее
            enemy.shootInterval = 120;
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
            speed: 1.5 + Math.random(),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05
        });
    }
    
    enemyShoot(enemy) {
        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            prevY: enemy.y + enemy.height / 2,
            width: 6,
            height: 15,
            speed: 4  // 🔥 Как в оригинале
        });
    }
    
    updateEnemiesFixed(playerBounds, onScoreChange, onGameOver) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed;  // 🔥 Без deltaTime!
            
            if (enemy.type === 4 && enemy.canShoot) {
                enemy.shootTimer++;
                if (enemy.shootTimer >= enemy.shootInterval) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = 0;
                }
            }
            
            if (enemy.y > this.canvas.height + 40) {
                this.enemies.splice(i, 1);
                const newScore = onScoreChange(-1);
                if (newScore < 0) {
                    onGameOver('Too many enemies escaped!');
                    return;
                }
                continue;
            }
            
            if (this.checkCollision(playerBounds, enemy)) {
                onGameOver('You crashed into an enemy!');
                return;
            }
        }
    }
    
    updateAsteroidsFixed(playerBounds, onScoreChange, onGameOver) {
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.y += asteroid.speed;  // 🔥 Без deltaTime!
            asteroid.rotation += asteroid.rotationSpeed;
            
            if (asteroid.y > this.canvas.height + 50) {
                this.asteroids.splice(i, 1);
                const newScore = onScoreChange(-1);
                if (newScore < 0) {
                    onGameOver('Too many objects escaped!');
                    return;
                }
                continue;
            }
            
            if (this.checkCollision(playerBounds, asteroid)) {
                onGameOver('You crashed into an asteroid!');
                return;
            }
        }
    }
    
    updateEnemyBulletsFixed(playerBounds, onGameOver) {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.prevY = bullet.y;
            bullet.y += bullet.speed;  // 🔥 Без deltaTime!
            
            if (bullet.y > this.canvas.height + bullet.height) {
                this.enemyBullets.splice(i, 1);
                continue;
            }
            
            if (this.checkBulletCollision(bullet, playerBounds)) {
                onGameOver('You were shot by an enemy!');
                return;
            }
        }
    }
    
    // Старый метод для совместимости
    update(score, playerBounds, onScoreChange, onGameOver, deltaTime) {
        this.updateFixed(score, playerBounds, onScoreChange, onGameOver);
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
        for (let i = bullets.length - 1; i >= 0; i--) {
            let hit = false;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkBulletCollision(bullets[i], this.enemies[j])) {
                    this.enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    onScoreChange(1);
                    hit = true;
                    break;
                }
            }
            
            if (hit) continue;
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                if (this.checkBulletCollision(bullets[i], this.asteroids[j])) {
                    this.asteroids.splice(j, 1);
                    bullets.splice(i, 1);
                    onScoreChange(1);
                    break;
                }
            }
        }
    }
    
    draw(ctx) {
        // Враги
        this.enemies.forEach(enemy => {
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
            ctx.shadowBlur = 0;
        });
        
        // Астероиды
        this.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * asteroid.width / 2;
                const y = Math.sin(angle) * asteroid.height / 2;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        
        // Пули врагов
        ctx.fillStyle = '#FF00FF';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF00FF';
        this.enemyBullets.forEach(bullet => {
            ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        });
        ctx.shadowBlur = 0;
    }
    
    reset() {
        this.enemies = [];
        this.asteroids = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.asteroidTimer = 0;
    }
}
