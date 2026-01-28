// ====== AUTH MODULE ======
const Auth = {
    token: localStorage.getItem('authToken'),
    nickname: localStorage.getItem('authNickname'),
    
    isLoggedIn() {
        return !!this.token;
    },
    
    async request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (options.auth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const res = await fetch(endpoint, {
            ...options,
            headers: { ...headers, ...options.headers }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    },
    
    async checkNickname(nickname) {
        const data = await this.request('/api/auth/check-nickname', {
            method: 'POST',
            body: JSON.stringify({ nickname })
        });
        return data.available;
    },
    
    async register(nickname, password) {
        const data = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nickname, password })
        });
        this.saveAuth(data.token, data.nickname);
        return data;
    },
    
    async login(nickname, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ nickname, password })
        });
        this.saveAuth(data.token, data.nickname);
        return data;
    },
    
    async getMe() {
        if (!this.token) return null;
        
        try {
            return await this.request('/api/auth/me', { auth: true });
        } catch {
            this.logout();
            return null;
        }
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
        
        return await this.request('/api/scores', {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ sessionId })
        });
    },
    
    async getLeaderboard() {
        return await this.request('/api/leaderboard');
    }
};

// ====== UI CONTROLLER (оптимизирован) ======
const AuthUI = {
    currentSessionId: null,
    currentScore: 0,
    currentIsNewRecord: true,
    isNewUser: null,
    boundElements: new WeakSet(),
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateUserStatus();
    },
    
    cacheElements() {
        this.elements = {
            startScreen: document.getElementById('startScreen'),
            leaderboardScreen: document.getElementById('leaderboardScreen'),
            leaderboardList: document.getElementById('leaderboardList'),
            saveScoreScreen: document.getElementById('saveScoreScreen'),
            saveScoreInfo: document.getElementById('saveScoreInfo'),
            authForm: document.getElementById('authForm'),
            saveResult: document.getElementById('saveResult'),
            nicknameInput: document.getElementById('nicknameInput'),
            passwordInput: document.getElementById('passwordInput'),
            passwordHint: document.getElementById('passwordHint'),
            nicknameStatus: document.getElementById('nicknameStatus'),
            authSubmitButton: document.getElementById('authSubmitButton'),
            skipSaveButton: document.getElementById('skipSaveButton'),
            afterSaveButtons: document.getElementById('afterSaveButtons'),
            userNickname: document.getElementById('userNickname'),
            logoutButton: document.getElementById('logoutButton'),
            gameOver: document.getElementById('gameOver')
        };
    },
    
    bindEvents() {
        const bindings = [
            ['leaderboardButton', 'click', () => this.showLeaderboard()],
            ['leaderboardBackButton', 'click', () => this.hideLeaderboard()],
            ['saveScoreButton', 'click', () => this.showSaveScore()],
            ['skipSaveButton', 'click', () => this.hideSaveScore()],
            ['nicknameInput', 'input', (e) => this.onNicknameInput(e)],
            ['authSubmitButton', 'click', () => this.onSubmit()],
            ['playAgainAfterSave', 'click', () => this.playAgain()],
            ['menuAfterSave', 'click', () => this.goToMenu()]
        ];
        
        bindings.forEach(([id, event, handler]) => {
            const el = document.getElementById(id);
            if (el && !this.boundElements.has(el)) {
                el.addEventListener(event, handler);
                this.boundElements.add(el);
            }
        });
        
        // Enter для отправки
        this.elements.passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onSubmit();
        });
    },
    
    updateUserStatus() {
        const { userNickname, logoutButton } = this.elements;
        if (!userNickname) return;
        
        if (Auth.isLoggedIn()) {
            userNickname.innerHTML = `<span class="logged-in">${Auth.nickname}</span>`;
            logoutButton?.classList.remove('hidden');
            
            if (logoutButton && !this.boundElements.has(logoutButton)) {
                logoutButton.addEventListener('click', () => {
                    Auth.logout();
                    this.updateUserStatus();
                });
                this.boundElements.add(logoutButton);
            }
        } else {
            userNickname.innerHTML = '';
            logoutButton?.classList.add('hidden');
        }
    },
    
    async showLeaderboard() {
        const { startScreen, leaderboardScreen, leaderboardList } = this.elements;
        
        startScreen.classList.add('hidden');
        leaderboardScreen.classList.remove('hidden');
        leaderboardList.innerHTML = '<div class="loading">loading…</div>';
        
        try {
            const scores = await Auth.getLeaderboard();
            
            if (!scores.length) {
                leaderboardList.innerHTML = '<div class="empty">No results yet. Be the first!</div>';
                return;
            }
            
            leaderboardList.innerHTML = scores.map((entry, index) => 
                this.renderLeaderboardRow(entry, index + 1)
            ).join('');
        } catch {
            leaderboardList.innerHTML = '<div class="error">loading error</div>';
        }
    },
    
    renderLeaderboardRow(entry, rank) {
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const classes = { 1: 'gold', 2: 'silver', 3: 'bronze' };
        const rankClass = classes[rank] || (rank <= 10 ? 'top10' : 'regular');
        
        return `
            <div class="leaderboard-row ${rankClass}">
                <span class="rank">${medals[rank] || rank + '.'}</span>
                <span class="nickname">${entry.nickname}</span>
                <span class="score">${entry.score.toLocaleString()}</span>
            </div>
        `;
    },
    
    hideLeaderboard() {
        this.elements.leaderboardScreen.classList.add('hidden');
        this.elements.startScreen.classList.remove('hidden');
    },
    
    showSaveScore() {
        const { gameOver, saveScoreScreen, saveScoreInfo, authForm, 
                saveResult, nicknameInput, passwordInput, passwordHint,
                authSubmitButton, nicknameStatus, skipSaveButton } = this.elements;
        
        gameOver.style.display = 'none';
        saveScoreScreen.classList.remove('hidden');
        saveScoreInfo.textContent = `Your score: ${this.currentScore.toLocaleString()} points`;
        
        if (Auth.isLoggedIn()) {
            this.currentIsNewRecord ? this.saveScoreDirectly() : this.showNotRecordMessage();
            return;
        }
        
        // Reset form
        authForm.classList.remove('hidden');
        saveResult.classList.add('hidden');
        nicknameInput.value = '';
        passwordInput.value = '';
        [passwordInput, passwordHint, authSubmitButton].forEach(el => el.classList.add('hidden'));
        nicknameStatus.textContent = '';
        skipSaveButton.classList.remove('hidden');
    },
    
    showNotRecordMessage() {
        const { authForm, saveResult, skipSaveButton } = this.elements;
        
        authForm.classList.add('hidden');
        saveResult.classList.remove('hidden');
        saveResult.innerHTML = `
            <div class="info">
                This is not your best score<br>
                <span style="color: #888; font-size: 14px;">Your record is higher — score not saved</span>
            </div>
        `;
        skipSaveButton.classList.add('hidden');
        this.showAfterSaveButtons();
    },
    
    async saveScoreDirectly() {
        const { authForm, saveResult, skipSaveButton } = this.elements;
        
        authForm.classList.add('hidden');
        saveResult.classList.remove('hidden');
        saveResult.innerHTML = '<div class="loading">saving...</div>';
        skipSaveButton.classList.add('hidden');
        
        try {
            const result = await Auth.saveScore(this.currentSessionId);
            
            saveResult.innerHTML = result.isNewRecord
                ? `<div class="success">🏆 Your record saved!<br>your rank: #${result.rank}</div>`
                : `<div class="info">Score not saved!<br><span style="color: #888; font-size: 14px;">Your record is higher</span></div>`;
            
            this.showAfterSaveButtons();
        } catch (error) {
            saveResult.innerHTML = `<div class="error">❌ ${error.message}</div>`;
            skipSaveButton.classList.remove('hidden');
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
    
    playAgain() {
        this.elements.saveScoreScreen.classList.add('hidden');
        this.elements.afterSaveButtons?.classList.add('hidden');
        this.resetSaveScreen();
        window.startGame?.();
    },
    
    resetSaveScreen() {
        const { authForm, saveResult, skipSaveButton, afterSaveButtons } = this.elements;
        authForm?.classList.remove('hidden');
        saveResult?.classList.add('hidden');
        skipSaveButton?.classList.remove('hidden');
        afterSaveButtons?.classList.add('hidden');
    },
    
    goToMenu() {
        this.elements.saveScoreScreen.classList.add('hidden');
        window.backToMenu?.() || this.elements.startScreen.classList.remove('hidden');
        this.updateUserStatus();
    },
    
    async onNicknameInput(e) {
        const nickname = e.target.value.trim();
        const { nicknameStatus, passwordInput, passwordHint, authSubmitButton } = this.elements;
        
        if (nickname.length < 2) {
            nicknameStatus.textContent = '';
            [passwordInput, passwordHint, authSubmitButton].forEach(el => el.classList.add('hidden'));
            return;
        }
        
        nicknameStatus.textContent = 'Проверка...';
        nicknameStatus.className = '';
        
        try {
            const available = await Auth.checkNickname(nickname);
            this.isNewUser = available;
            
            nicknameStatus.textContent = available 
                ? 'nickname available! Create a password'
                : 'nickname taken. Yours? Enter password';
            nicknameStatus.className = available ? 'status-success' : 'status-info';
            
            passwordHint.textContent = available ? 'min. 4 chars' : '';
            passwordInput.placeholder = available ? 'Create a password' : 'Your password';
            
            [passwordInput, passwordHint, authSubmitButton].forEach(el => el.classList.remove('hidden'));
            authSubmitButton.textContent = available ? 'sign up' : 'login';
        } catch {
            nicknameStatus.textContent = '❌ verification error';
            nicknameStatus.className = 'status-error';
        }
    },
    
    async onSubmit() {
        const { nicknameInput, passwordInput, authSubmitButton, nicknameStatus } = this.elements;
        const nickname = nicknameInput.value.trim();
        const password = passwordInput.value;
        
        if (!nickname || !password) {
            nicknameStatus.textContent = '❌ fill in all fields';
            nicknameStatus.className = 'status-error';
            return;
        }
        
        if (this.isNewUser && password.length < 4) {
            nicknameStatus.textContent = '❌ Password min. 4 chars';
            nicknameStatus.className = 'status-error';
            return;
        }
        
        authSubmitButton.disabled = true;
        authSubmitButton.textContent = 'wait...';
        
        try {
            await (this.isNewUser ? Auth.register(nickname, password) : Auth.login(nickname, password));
            await this.saveScoreDirectly();
        } catch (error) {
            nicknameStatus.textContent = `❌ ${error.message}`;
            nicknameStatus.className = 'status-error';
            authSubmitButton.disabled = false;
            authSubmitButton.textContent = this.isNewUser ? 'sign up' : 'login';
        }
    },
    
    setGameResult(sessionId, score, isNewRecord = true) {
        this.currentSessionId = sessionId;
        this.currentScore = score;
        this.currentIsNewRecord = isNewRecord;
    }
};

// Экспорт для использования в game.js
window.Auth = Auth;
window.AuthUI = AuthUI;

document.addEventListener('DOMContentLoaded', () => AuthUI.init());
// Экспорт для ES-модулей
export { Auth, AuthUI };

// Для совместимости с inline-скриптами
window.Auth = Auth;
window.AuthUI = AuthUI;
