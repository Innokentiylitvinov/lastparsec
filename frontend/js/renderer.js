export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.initStars();
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
    
    drawStars() {
        const ctx = this.ctx;
        ctx.fillStyle = '#FFF';
        
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
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
