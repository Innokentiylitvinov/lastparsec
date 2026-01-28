export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.width = 40;
        this.height = 40;
        this.color = '#FF0000';
        this.image = null;
    }
    
    update(controls, deltaTime) {
        // Мобильное управление (гироскоп)
        const gyroSpeed = controls.getPlayerSpeed(this.canvas.width, deltaTime);
        
        if (gyroSpeed !== null) {
            this.x += gyroSpeed;
        } else {
            // Десктоп — следуем за мышью
            const mouseX = controls.getMouseX();
            if (mouseX !== null) {
                this.x = mouseX;
            }
        }
        
        // Ограничение в пределах экрана
        this.x = Math.max(this.width / 2, Math.min(this.canvas.width - this.width / 2, this.x));
    }
    
    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.drawImage(
                this.image, 
                this.x - this.width / 2, 
                this.y - this.height / 2, 
                this.width, 
                this.height
            );
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height / 2);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 100;
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
