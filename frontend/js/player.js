export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 40;
        this.color = '#FF0000';
        this.reset();
    }
    
    update(controls, deltaTime) {
        const gyroSpeed = controls.getPlayerSpeed(this.canvas.width, deltaTime);
        
        if (gyroSpeed !== null) {
            this.x += gyroSpeed;
        } else {
            const mouseX = controls.getMouseX();
            if (mouseX !== null) {
                this.x = mouseX;
            }
        }
        
        // Clamp position
        const halfWidth = this.width / 2;
        this.x = Math.max(halfWidth, Math.min(this.canvas.width - halfWidth, this.x));
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
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
