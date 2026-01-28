export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.starCount = 120;
        this.initStars();
    }
    
    initStars() {
        const { width, height } = this.canvas;
        this.stars = Array.from({ length: this.starCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2,
            speed: Math.random() * 2 + 0.5
        }));
    }
    
    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateStars(deltaTime) {
        const { height, width } = this.canvas;
        const multiplier = 30 * deltaTime;
        
        for (const star of this.stars) {
            star.y += star.speed * multiplier;
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
        }
    }
    
    drawStars() {
        const { ctx, stars } = this;
        ctx.fillStyle = '#FFF';
        
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawBullets(bullets) {
        if (!bullets.length) return;
        
        const { ctx } = this;
        ctx.fillStyle = '#FFFF00';
        
        for (const bullet of bullets) {
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
    
    // Вызывать при resize
    onResize() {
        // Перераспределяем звёзды при изменении размера
        for (const star of this.stars) {
            if (star.x > this.canvas.width) {
                star.x = Math.random() * this.canvas.width;
            }
        }
    }
}
