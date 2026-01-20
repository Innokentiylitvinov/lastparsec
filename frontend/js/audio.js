// Звуки — реализуем позже
export class AudioManager {
    constructor() {
        this.enabled = false;
    }
    
    toggle() {
        this.enabled = !this.enabled;
    }
}
