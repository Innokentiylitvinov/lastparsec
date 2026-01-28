// ====== AUTH MODULE ======
const Auth = {
    token: localStorage.getItem('authToken'),
    nickname: localStorage.getItem('authNickname'),
    
    isLoggedIn() {
        return !!this.token;
    },
    
    async checkNickname(nickname) {
        const res = await fetch('/api/auth/check-nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });
        return (await res.json()).available;
    },
    
    async register(nickname, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        
        if (!res.ok) throw new Error((await res.json()).error);
        
        const data = await res.json();
        this.saveAuth(data.token, data.nickname);
        return data;
    },
    
    async login(nickname, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        
        if (!res.ok) throw new Error((await res.json()).error);
        
        const data = await res.json();
        this.saveAuth(data.token, data.nickname);
        return data;
    },
    
    async getMe() {
        if (!this.token) return null;
        
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        if (!res.ok) {
            this.logout();
            return null;
        }
        
        return res.json();
    },
    
    saveAuth(token, nickname) {
        this.token = token;
        this.nickname = nickname;
        localStorage.setItem('authToken', token);
        localStorage.setItem('authNickname', nickname);
    },
    
    logout() {
        this.token = null;
        this.nickname = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('authNickname');
    },
    
    async saveScore(sessionId) {
        if (!this.token) throw new Error('Not logged in');
        
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ sessionId })
        });
        
        if (!res.ok) throw new Error((await res.json()).error);
        
        return res.json();
    },
    
    async getLeaderboard() {
        return (await fetch('/api/leaderboard')).json();
    }
};

// ====== UI CONTROLLER ======
const AuthUI = {
    currentSessionId: null,
    currentScore: 0,
    currentIsNewRecord: true,
    isNewUser: null,
    elements: null,
    
    cacheElements() {
        if (this.elements) return;
        
        this.elements = {
            leaderboardButton: document.getElementById('leaderboardButton'),
            leaderboardBackButton: document.getElementById('leaderboardBackButton'),
            saveScoreButton: document.getElementById('saveScoreButton'),
            skipSaveButton: document.getElementById('skipSaveButton'),
            nicknameInput: document.getElementById('nicknameInput'),
            passwordInput: document.getElementById('passwordInput'),
            authSubmitButton: document.getElementById('authSubmitButton'),
            playAgainAfterSave: document.getElementById('playAgainAfterSave'),
            menuAfterSave: document.getElementById('menuAfterSave'),
            startScreen: document.getElementById('startScreen'),
            leaderboardScreen: document.getElementById('leaderboardScreen'),
            leaderboardList: document.getElementById('leaderboardList'),
            saveScoreScreen: document.getElementById('saveScoreScreen'),
            gameOver: document.getElementById('gameOver'),
            authForm: document.getElementById('authForm'),
            saveResult: document.getElementById('saveResult'),
            afterSaveButtons: document.getElementById('afterSaveButtons'),
            userNickname: document.getElementById('userNickname'),
            logoutButton: document.getElementById('logoutButton'),
            saveScoreInfo: document.getElementById('saveScoreInfo'),
            nicknameStatus: document.getElementById('nicknameStatus'),
            passwordHint: document.getElementById('passwordHint')
        };
    },
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateUserStatus();
    },
    
    bindEvents() {
        const el = this.elements;
        
        el.leaderboardButton?.addEventListener('click', () => this.showLeaderboard());
        el.leaderboardBackButton?.addEventListener('click', () => this.hideLeaderboard());
        el.saveScoreButton?.addEventListener('click', () => this.showSaveScore());
        el.skipSaveButton?.addEventListener('click', () => this.hideSaveScore());
        el.nicknameInput?.addEventListener('input', (e) => this.onNicknameInput(e));
        el.authSubmitButton?.addEventListener('click', () => this.onSubmit());
        el.passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onSubmit();
        });
        el.playAgainAfterSave?.addEventListener('click', () => this.playAgain());
        el.menuAfterSave?.addEventListener('click', () => this.goToMenu());
    },

    playAgain() {
        this.elements.saveScoreScreen.classList.add('hidden');
        this.elements.afterSaveButtons?.classList.add('hidden');
        this.resetSaveScreen();
        
        if (typeof window.startGame === 'function') {
            window.startGame();
        }
    },

    resetSaveScreen() {
        const el = this.elements;
        el.authForm?.classList.remove('hidden');
        el.saveResult?.classList.add('hidden');
        el.skipSaveButton?.classList.remove('hidden');
        el.afterSaveButtons?.classList.add('hidden');
    },
    
    updateUserStatus() {
        const el = this.elements;
        if (!el.userNickname) return;
        
        if (Auth.isLoggedIn()) {
            el.userNickname.innerHTML = `<span class="logged-in">${Auth.nickname}</span>`;
            el.logoutButton?.classList.remove('hidden');
            
            if (!el.logoutButton.hasAttribute('data-bound')) {
                el.logoutButton.setAttribute('data-bound', 'true');
                el.logoutButton.addEventListener('click', () => {
                    Auth.logout();
                    this.updateUserStatus();
                });
            }
        } else {
            el.userNickname.innerHTML = '';
            el.logoutButton?.classList.add('hidden');
        }
    },
    
    async showLeaderboard() {
        const el = this.elements;
        el.startScreen.classList.add('hidden');
        el.leaderboardScreen.classList.remove('hidden');
        el.leaderboardList.innerHTML = '<div class="loading">loading…</div>';
        
        try {
            const scores = await Auth.getLeaderboard();
            
            if (scores.length === 0) {
                el.leaderboardList.innerHTML = '<div class="empty">No results yet. Be the first!</div>';
                return;
            }
            
            el.leaderboardList.innerHTML = scores.map((entry, index) => {
                const rank = index + 1;
                let rankClass = '', medal = '';
                
                if (rank === 1) { rankClass = 'gold'; medal = '🥇'; }
                else if (rank === 2) { rankClass = 'silver'; medal = '🥈'; }
                else if (rank === 3) { rankClass = 'bronze'; medal = '🥉'; }
                else if (rank <= 10) { rankClass = 'top10'; }
                else { rankClass = 'regular'; }
                
                return `
                    <div class="leaderboard-row ${rankClass}">
                        <span class="rank">${medal || rank + '.'}</span>
                        <span class="nickname">${entry.nickname}</span>
                        <span class="score">${entry.score.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            el.leaderboardList.innerHTML = '<div class="error">loading error</div>';
        }
    },
    
    hideLeaderboard() {
        this.elements.leaderboardScreen.classList.add('hidden');
        this.elements.startScreen.classList.remove('hidden');
    },
    
    showSaveScore() {
        const el = this.elements;
        el.gameOver.style.display = 'none';
        el.saveScoreScreen.classList.remove('hidden');
        el.saveScoreInfo.textContent = `Your score: ${this.currentScore.toLocaleString()} points`;
        
        if (Auth.isLoggedIn()) {
            this.currentIsNewRecord ? this.saveScoreDirectly() : this.showNotRecordMessage();
            return;
        }
        
        // Показываем форму авторизации
        el.authForm.classList.remove('hidden');
        el.saveResult.classList.add('hidden');
        el.nicknameInput.value = '';
        el.passwordInput.value = '';
        el.passwordInput.classList.add('hidden');
        el.passwordHint.classList.add('hidden');
        el.authSubmitButton.classList.add('hidden');
        el.nicknameStatus.textContent = '';
        el.skipSaveButton.classList.remove('hidden');
    },
    
    showNotRecordMessage() {
        const el = this.elements;
        el.authForm.classList.add('hidden');
        el.saveResult.classList.remove('hidden');
        el.saveResult.innerHTML = `
            <div class="info">
                This is not your best score<br>
                <span style="color: #888; font-size: 14px;">Your record is higher — score not saved</span>
            </div>
        `;
        el.skipSaveButton.classList.add('hidden');
        this.showAfterSaveButtons();
    },
    
    async saveScoreDirectly() {
        const el = this.elements;
        el.authForm.classList.add('hidden');
        el.saveResult.classList.remove('hidden');
        el.saveResult.innerHTML = '<div class="loading">saving...</div>';
        el.skipSaveButton.classList.add('hidden');
        
        try {
            const result = await Auth.saveScore(this.currentSessionId);
            
            el.saveResult.innerHTML = result.isNewRecord
                ? `<div class="success">🏆 Your record saved!<br>your rank: #${result.rank}</div>`
                : `<div class="info">Score not saved!<br><span style="color: #888; font-size: 14px;">Your record is higher</span></div>`;
            
            this.showAfterSaveButtons();
        } catch (error) {
            el.saveResult.innerHTML = `<div class="error">❌ ${error.message}</div>`;
            el.skipSaveButton.classList.remove('hidden');
        }
    },

    showAfterSaveButtons() {
        this.elements.afterSaveButtons?.classList.remove('hidden');
        this.elements.skipSaveButton?.classList.add('hidden');
    },
    
    hideSaveScore() {
        this.elements.saveScoreScreen.classList.add('hidden');
        this.elements.gameOver.style.display = 'flex';
    },
    
    goToMenu() {
        this.elements.saveScoreScreen.classList.add('hidden');
        
        if (typeof window.backToMenu === 'function') {
            window.backToMenu();
        } else {
            this.elements.startScreen.classList.remove('hidden');
        }
        
        this.updateUserStatus();
    },
    
    async onNicknameInput(e) {
        const el = this.elements;
        const nickname = e.target.value.trim();
        
        if (nickname.length < 2) {
            el.nicknameStatus.textContent = '';
            el.passwordInput.classList.add('hidden');
            el.passwordHint.classList.add('hidden');
            el.authSubmitButton.classList.add('hidden');
            return;
        }
        
        el.nicknameStatus.textContent = 'Проверка...';
        el.nicknameStatus.className = '';
        
        try {
            const available = await Auth.checkNickname(nickname);
            this.isNewUser = available;
            
            if (available) {
                el.nicknameStatus.textContent = 'nickname available! Create a password';
                el.nicknameStatus.className = 'status-success';
                el.passwordHint.textContent = 'min. 4 chars';
                el.passwordInput.placeholder = 'Create a password';
            } else {
                el.nicknameStatus.textContent = 'nickname taken. Yours? Enter password';
                el.nicknameStatus.className = 'status-info';
                el.passwordHint.textContent = '';
                el.passwordInput.placeholder = 'Your password';
            }
            
            el.passwordInput.classList.remove('hidden');
            el.passwordHint.classList.remove('hidden');
            el.authSubmitButton.classList.remove('hidden');
            el.authSubmitButton.textContent = available ? 'sing up' : 'login';
        } catch (error) {
            el.nicknameStatus.textContent = '❌ verification error';
            el.nicknameStatus.className = 'status-error';
        }
    },
    
    async onSubmit() {
        const el = this.elements;
        const nickname = el.nicknameInput.value.trim();
        const password = el.passwordInput.value;
        
        if (!nickname || !password) {
            el.nicknameStatus.textContent = '❌ fill in all fields';
            el.nicknameStatus.className = 'status-error';
            return;
        }
        
        if (this.isNewUser && password.length < 4) {
            el.nicknameStatus.textContent = '❌ Password min. 4 chars';
            el.nicknameStatus.className = 'status-error';
            return;
        }
        
        el.authSubmitButton.disabled = true;
        el.authSubmitButton.textContent = 'wait...';
        
        try {
            await (this.isNewUser ? Auth.register(nickname, password) : Auth.login(nickname, password));
            await this.saveScoreDirectly();
        } catch (error) {
            el.nicknameStatus.textContent = `❌ ${error.message}`;
            el.nicknameStatus.className = 'status-error';
            el.authSubmitButton.disabled = false;
            el.authSubmitButton.textContent = this.isNewUser ? 'sing up' : 'login';
        }
    },
    
    setGameResult(sessionId, score, isNewRecord = true) {
        this.currentSessionId = sessionId;
        this.currentScore = score;
        this.currentIsNewRecord = isNewRecord;
    }
};

// Экспорт для использования в window
window.Auth = Auth;
window.AuthUI = AuthUI;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    AuthUI.init();
});

export { Auth, AuthUI };
