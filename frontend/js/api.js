export class API {
    constructor() {
        this.baseUrl = '';  // Тот же домен
        this.sessionId = null;
        this.lastSessionId = null;  // 🆕 Сохраняем для AuthUI
    }
    
    // Начать игру — получить sessionId
    async startGame() {
        try {
            const response = await fetch(`${this.baseUrl}/api/game/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            console.log('🎮 Session started:', this.sessionId);
            return this.sessionId;
        } catch (error) {
            console.error('Failed to start session:', error);
            return null;
        }
    }
    
    // Закончить игру — отправить результат на валидацию
    async endGame(score) {
        if (!this.sessionId) {
            console.error('No active session');
            return { valid: false, reason: 'No session' };
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/api/game/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    score: score
                })
            });
            
            const data = await response.json();
            
            // 🆕 Сохраняем sessionId для сохранения результата
            this.lastSessionId = this.sessionId;
            this.sessionId = null;
            
            console.log('🏁 Game result:', data);
            return data;
        } catch (error) {
            console.error('Failed to end session:', error);
            return { valid: false, reason: 'Network error' };
        }
    }
}
