export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.initStars();
        
        // Запускаем вечный цикл звёзд
        this.lastTime = performance.now();
        this.startBackgroundLoop();
    }
    
    initStars() {
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 2,
                speed: Math.random() * 2 + 0.5
            });
        }
    }
    
    // Вечный цикл — звёзды анимируются ВСЕГДА
    startBackgroundLoop() {
        const animate = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Рисуем фон только когда игра НЕ запущена
            // (когда игра запущена — gameLoop сам всё рисует)
            if (!window.gameRunning) {
                this.clear();
                this.updateStars(deltaTime);
                this.drawStars();
            }
            
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
    
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateStars(deltaTime) {
        this.stars.forEach(star => {
            star.y += star.speed * 30 * deltaTime;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });
    }
    
    drawStars() {
        this.ctx.fillStyle = '#FFF';
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawBullets(bullets) {
        this.ctx.fillStyle = '#FFFF00';
        bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        });
    }
    
    getContext() {
        return this.ctx;
    }
}