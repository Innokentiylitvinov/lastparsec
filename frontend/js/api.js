export class API {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.sessionId = null;
        this.lastSessionId = null;
    }
    
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            return null;
        }
    }
    
    async startGame() {
        const data = await this.request('/api/game/start', { method: 'POST' });
        if (data?.sessionId) {
            this.sessionId = data.sessionId;
            console.log('🎮 Session started:', this.sessionId);
        }
        return this.sessionId;
    }
    
    async endGame(score) {
        if (!this.sessionId) {
            console.error('No active session');
            return { valid: false, reason: 'No session' };
        }
        
        const data = await this.request('/api/game/end', {
            method: 'POST',
            body: JSON.stringify({ sessionId: this.sessionId, score })
        });
        
        if (data) {
            this.lastSessionId = this.sessionId;
            this.sessionId = null;
            console.log('🏁 Game result:', data);
            return data;
        }
        
        return { valid: false, reason: 'Network error' };
    }
}
