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
        const data = await res.json();
        return data.available;
    },
    
    async register(nickname, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
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
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
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
        
        return await res.json();
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
        if (!this.token) {
            throw new Error('Not logged in');
        }
        
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ sessionId })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }
        
        return await res.json();
    },
    
    async getLeaderboard() {
        const res = await fetch('/api/leaderboard');
        return await res.json();
    }
};

// ====== UI CONTROLLER ======

const AuthUI = {
    currentSessionId: null,
    currentScore: 0,
    isNewUser: null,
    
    init() {
        this.bindEvents();
        this.updateUserStatus();
    },
    
    bindEvents() {
        // Лидерборд
        document.getElementById('leaderboardButton')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('leaderboardBackButton')?.addEventListener('click', () => this.hideLeaderboard());
        
        // Сохранение результата
        document.getElementById('saveScoreButton')?.addEventListener('click', () => this.showSaveScore());
        document.getElementById('skipSaveButton')?.addEventListener('click', () => this.hideSaveScore());
        document.getElementById('saveMenuButton')?.addEventListener('click', () => this.goToMenu());
        
        // Форма авторизации
        document.getElementById('nicknameInput')?.addEventListener('input', (e) => this.onNicknameInput(e));
        document.getElementById('authSubmitButton')?.addEventListener('click', () => this.onSubmit());
        
        // Enter для отправки
        document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onSubmit();
        });
    },
    
    updateUserStatus() {
        const statusEl = document.getElementById('userStatus');
        if (!statusEl) return;
        
        if (Auth.isLoggedIn()) {
            statusEl.innerHTML = `<span class="logged-in">👤 ${Auth.nickname}</span> <button id="logoutButton" class="small-button">Выйти</button>`;
            document.getElementById('logoutButton')?.addEventListener('click', () => {
                Auth.logout();
                this.updateUserStatus();
            });
        } else {
            statusEl.innerHTML = '';
        }
    },
    
    // ====== ЛИДЕРБОРД ======
    
    async showLeaderboard() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('leaderboardScreen').classList.remove('hidden');
        
        const listEl = document.getElementById('leaderboardList');
        listEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        try {
            const scores = await Auth.getLeaderboard();
            
            if (scores.length === 0) {
                listEl.innerHTML = '<div class="empty">Пока нет результатов. Будь первым!</div>';
                return;
            }
            
            listEl.innerHTML = scores.map((entry, index) => {
                const rank = index + 1;
                let rankClass = '';
                let medal = '';
                
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
            listEl.innerHTML = '<div class="error">Ошибка загрузки</div>';
        }
    },
    
    hideLeaderboard() {
        document.getElementById('leaderboardScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
    },
    
    // ====== СОХРАНЕНИЕ РЕЗУЛЬТАТА ======
    
    showSaveScore() {
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('saveScoreScreen').classList.remove('hidden');
        
        document.getElementById('saveScoreInfo').textContent = `Ваш результат: ${this.currentScore.toLocaleString()} очков`;
        
        // Если уже залогинен — сразу сохраняем
        if (Auth.isLoggedIn()) {
            this.saveScoreDirectly();
            return;
        }
        
        // Иначе показываем форму
        document.getElementById('authForm').classList.remove('hidden');
        document.getElementById('saveResult').classList.add('hidden');
        document.getElementById('nicknameInput').value = '';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').classList.add('hidden');
        document.getElementById('passwordHint').classList.add('hidden');
        document.getElementById('authSubmitButton').classList.add('hidden');
        document.getElementById('nicknameStatus').textContent = '';
        document.getElementById('skipSaveButton').classList.remove('hidden');
        document.getElementById('saveMenuButton').classList.add('hidden');
    },
    
    async saveScoreDirectly() {
        document.getElementById('authForm').classList.add('hidden');
        document.getElementById('saveResult').classList.remove('hidden');
        document.getElementById('saveResult').innerHTML = '<div class="loading">Сохранение...</div>';
        document.getElementById('skipSaveButton').classList.add('hidden');
        
        try {
            const result = await Auth.saveScore(this.currentSessionId);
            document.getElementById('saveResult').innerHTML = `
                <div class="success">
                    ✅ Результат сохранён!<br>
                    Ваше место: #${result.rank}
                </div>
            `;
        } catch (error) {
            document.getElementById('saveResult').innerHTML = `<div class="error">❌ ${error.message}</div>`;
        }
        
        document.getElementById('saveMenuButton').classList.remove('hidden');
    },
    
    hideSaveScore() {
        document.getElementById('saveScoreScreen').classList.add('hidden');
        document.getElementById('gameOver').style.display = 'flex';
    },
    
    goToMenu() {
        document.getElementById('saveScoreScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        this.updateUserStatus();
    },
    
    // ====== ФОРМА АВТОРИЗАЦИИ ======
    
    async onNicknameInput(e) {
        const nickname = e.target.value.trim();
        const statusEl = document.getElementById('nicknameStatus');
        const passwordInput = document.getElementById('passwordInput');
        const passwordHint = document.getElementById('passwordHint');
        const submitButton = document.getElementById('authSubmitButton');
        
        if (nickname.length < 2) {
            statusEl.textContent = '';
            passwordInput.classList.add('hidden');
            passwordHint.classList.add('hidden');
            submitButton.classList.add('hidden');
            return;
        }
        
        statusEl.textContent = 'Проверка...';
        statusEl.className = '';
        
        try {
            const available = await Auth.checkNickname(nickname);
            
            if (available) {
                this.isNewUser = true;
                statusEl.textContent = '✅ Ник свободен! Придумайте пароль';
                statusEl.className = 'status-success';
                passwordHint.textContent = 'Минимум 4 символа';
                passwordInput.placeholder = 'Придумайте пароль';
            } else {
                this.isNewUser = false;
                statusEl.textContent = '👤 Этот ник занят. Ваш? Введите пароль';
                statusEl.className = 'status-info';
                passwordHint.textContent = '';
                passwordInput.placeholder = 'Ваш пароль';
            }
            
            passwordInput.classList.remove('hidden');
            passwordHint.classList.remove('hidden');
            submitButton.classList.remove('hidden');
            submitButton.textContent = available ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ';
            
        } catch (error) {
            statusEl.textContent = '❌ Ошибка проверки';
            statusEl.className = 'status-error';
        }
    },
    
    async onSubmit() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const submitButton = document.getElementById('authSubmitButton');
        const statusEl = document.getElementById('nicknameStatus');
        
        if (!nickname || !password) {
            statusEl.textContent = '❌ Заполните все поля';
            statusEl.className = 'status-error';
            return;
        }
        
        if (this.isNewUser && password.length < 4) {
            statusEl.textContent = '❌ Пароль минимум 4 символа';
            statusEl.className = 'status-error';
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Подождите...';
        
        try {
            if (this.isNewUser) {
                await Auth.register(nickname, password);
            } else {
                await Auth.login(nickname, password);
            }
            
            // Успешно — сохраняем результат
            await this.saveScoreDirectly();
            
        } catch (error) {
            statusEl.textContent = `❌ ${error.message}`;
            statusEl.className = 'status-error';
            submitButton.disabled = false;
            submitButton.textContent = this.isNewUser ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ';
        }
    },
    
    // Вызывается из game.js после game over
    setGameResult(sessionId, score) {
        this.currentSessionId = sessionId;
        this.currentScore = score;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    AuthUI.init();
});
