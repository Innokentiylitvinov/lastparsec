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
        return 90 + score * 3;
    }
    
    getShootInterval(score) {
        return Math.max(0.55, 2 - score * 0.01);
    }

    update(score, playerBounds, onScoreChange, onGameOver, deltaTime) {
        this.spawnTimer += deltaTime;
        const spawnInterval = this.getSpawnInterval(score);
        
        if (this.spawnTimer > spawnInterval) {
            this.spawnEnemy(score);
            this.spawnTimer = 0;
        }
        
        this.asteroidTimer += deltaTime;
        if (this.asteroidTimer > spawnInterval * 5) {
            this.spawnAsteroid();
            this.asteroidTimer = 0;
        }
        
        this.updateEnemies(playerBounds, onScoreChange, onGameOver, deltaTime);
        this.updateAsteroids(playerBounds, onScoreChange, onGameOver, deltaTime);
        this.updateEnemyBullets(playerBounds, onGameOver, deltaTime);
    }
    
    spawnEnemy(score) {
        const type = Math.floor(Math.random() * 5);
        const canvasWidth = this.canvas.width;
        
        const enemy = {
            x: Math.random() * (canvasWidth - 40) + 20,
            y: -40,
            width: 35,
            height: 35,
            speed: this.getEnemySpeed(score),
            type,
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
        const canvasWidth = this.canvas.width;
        this.asteroids.push({
            x: Math.random() * (canvasWidth - 50) + 25,
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
            speed: Math.max(300, enemy.speed + 150)
        });
    }
    
    updateEnemies(playerBounds, onScoreChange, onGameOver, deltaTime) {
        const enemies = this.enemies;
        const canvasHeight = this.canvas.height;
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.y += enemy.speed * deltaTime;
            
            if (enemy.canShoot) {
                enemy.shootTimer += deltaTime;
                if (enemy.shootTimer >= enemy.shootInterval) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = 0;
                }
            }
            
            if (enemy.y > canvasHeight + 40) {
                enemies.splice(i, 1);
                if (onScoreChange(-1) < 0) {
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
    
    updateAsteroids(playerBounds, onScoreChange, onGameOver, deltaTime) {
        const asteroids = this.asteroids;
        const canvasHeight = this.canvas.height;
        
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            asteroid.y += asteroid.speed * deltaTime;
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;
            
            if (asteroid.y > canvasHeight + 50) {
                asteroids.splice(i, 1);
                if (onScoreChange(-1) < 0) {
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
    
    updateEnemyBullets(playerBounds, onGameOver, deltaTime) {
        const bullets = this.enemyBullets;
        const canvasHeight = this.canvas.height;
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.prevY = bullet.y;
            bullet.y += bullet.speed * deltaTime;
            
            if (bullet.y > canvasHeight + bullet.height) {
                bullets.splice(i, 1);
                continue;
            }
            
            if (this.checkBulletCollision(bullet, playerBounds)) {
                onGameOver('You were shot by an enemy!');
                return;
            }
        }
    }
    
    checkCollision(obj1, obj2) {
        const hw1 = obj1.width / 2, hh1 = obj1.height / 2;
        const hw2 = obj2.width / 2, hh2 = obj2.height / 2;
        
        return obj1.x + hw1 > obj2.x - hw2 &&
               obj1.x - hw1 < obj2.x + hw2 &&
               obj1.y + hh1 > obj2.y - hh2 &&
               obj1.y - hh1 < obj2.y + hh2;
    }
    
    checkBulletCollision(bullet, target) {
        const bLeft = bullet.x - bullet.width / 2;
        const bRight = bullet.x + bullet.width / 2;
        const bTop = bullet.y;
        const bBottom = bullet.y + bullet.height;
        
        const tLeft = target.x - target.width / 2;
        const tRight = target.x + target.width / 2;
        const tTop = target.y - target.height / 2;
        const tBottom = target.y + target.height / 2;
        
        // Стандартная проверка
        if (bRight > tLeft && bLeft < tRight && bBottom > tTop && bTop < tBottom) {
            return true;
        }
        
        // Проверка "туннелирования"
        if (bullet.prevY !== undefined && bRight > tLeft && bLeft < tRight &&
            bullet.prevY <= tBottom && bBottom >= tTop) {
            return true;
        }
        
        return false;
    }
    
    checkPlayerBullets(bullets, onScoreChange) {
        const enemies = this.enemies;
        const asteroids = this.asteroids;
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            let hit = false;
            
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (this.checkBulletCollision(bullet, enemies[j])) {
                    enemies.splice(j, 1);
                    bullets.splice(i, 1);
                    onScoreChange(1);
                    hit = true;
                    break;
                }
            }
            
            if (hit) continue;
            
            for (let j = asteroids.length - 1; j >= 0; j--) {
                if (this.checkBulletCollision(bullet, asteroids[j])) {
                    asteroids.splice(j, 1);
                    bullets.splice(i, 1);
                    onScoreChange(1);
                    break;
                }
            }
        }
    }
    
    draw(ctx) {
        const enemies = this.enemies;
        const asteroids = this.asteroids;
        const enemyBullets = this.enemyBullets;
        
        // Враги
        for (let i = 0, len = enemies.length; i < len; i++) {
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
            
            if (enemy.type === 4) ctx.shadowBlur = 0;
        }
        
        // Астероиды
        ctx.fillStyle = '#00FF00';
        for (let i = 0, len = asteroids.length; i < len; i++) {
            const asteroid = asteroids[i];
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);
            ctx.beginPath();
            
            const hw = asteroid.width / 2;
            const hh = asteroid.height / 2;
            for (let j = 0; j < 5; j++) {
                const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * hw;
                const y = Math.sin(angle) * hh;
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        // Пули врагов
        if (enemyBullets.length > 0) {
            ctx.fillStyle = '#FF00FF';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF00FF';
            
            for (let i = 0, len = enemyBullets.length; i < len; i++) {
                const bullet = enemyBullets[i];
                ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
            }
            
            ctx.shadowBlur = 0;
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
