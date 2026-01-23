export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.initStars();
        
        // Для меню — свой цикл
        this.menuLoopId = null;
        this.lastTime = performance.now();
    }
    
    initStars() {
        for (let i = 0; i < 100; i++) {  // Уменьшил до 100
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 1.5 + 0.5
            });
        }
    }
    
    // Запуск цикла для меню (когда игра не запущена)
    startMenuLoop() {
        if (this.menuLoopId) return;  // Уже запущен
        
        const animate = (currentTime) => {
            if (window.gameRunning) {
                // Игра запущена — останавливаем цикл меню
                this.menuLoopId = null;
                return;
            }
            
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            this.clear();
            this.updateStars(deltaTime);
            this.drawStars();
            
            this.menuLoopId = requestAnimationFrame(animate);
        };
        
        this.lastTime = performance.now();
        this.menuLoopId = requestAnimationFrame(animate);
    }
    
    // Остановка цикла меню
    stopMenuLoop() {
        if (this.menuLoopId) {
            cancelAnimationFrame(this.menuLoopId);
            this.menuLoopId = null;
        }
    }
    
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateStars(deltaTime) {
        const height = this.canvas.height;
        const width = this.canvas.width;
        
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            star.y += star.speed * 30 * deltaTime;
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
        }
    }
    
    // ✅ Оптимизированная отрисовка звёзд
    drawStars() {
        const ctx = this.ctx;
        ctx.fillStyle = '#FFF';
        
        // Один beginPath для всех звёзд
        ctx.beginPath();
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            ctx.moveTo(star.x + star.radius, star.y);
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }
    
    // ✅ Оптимизированная отрисовка пуль
    drawBullets(bullets) {
        if (bullets.length === 0) return;
        
        const ctx = this.ctx;
        ctx.fillStyle = '#FFFF00';
        
        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            ctx.fillRect(
                bullet.x - bullet.width / 2, 
                bullet.y, 
                bullet.width, 
                bullet.height
            );
        }
    }
    
    getContext() {
        return this.ctx;
    }
}
