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
    currentIsNewRecord: true,  // ✅ Добавлено
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
        
        // Форма авторизации
        document.getElementById('nicknameInput')?.addEventListener('input', (e) => this.onNicknameInput(e));
        document.getElementById('authSubmitButton')?.addEventListener('click', () => this.onSubmit());
        
        // Enter для отправки
        document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onSubmit();
        });
        
        // Кнопки после сохранения
        document.getElementById('playAgainAfterSave')?.addEventListener('click', () => this.playAgain());
        document.getElementById('menuAfterSave')?.addEventListener('click', () => this.goToMenu());
    },


        // ✅ Новая функция — играть снова
    playAgain() {
        document.getElementById('saveScoreScreen').classList.add('hidden');
        document.getElementById('afterSaveButtons')?.classList.add('hidden');
        this.resetSaveScreen();
            
        // Вызываем глобальный старт игры
        if (typeof window.startGame === 'function') {
            window.startGame();
        }
    },

        // ✅ Сброс экрана сохранения для следующего раза
    resetSaveScreen() {
        document.getElementById('authForm')?.classList.remove('hidden');
        document.getElementById('saveResult')?.classList.add('hidden');
        document.getElementById('skipSaveButton')?.classList.remove('hidden');
        document.getElementById('afterSaveButtons')?.classList.add('hidden');
    },
    
    updateUserStatus() {
        const nicknameEl = document.getElementById('userNickname');
        const logoutBtn = document.getElementById('logoutButton');
        
        if (!nicknameEl) return;
        
        if (Auth.isLoggedIn()) {
            nicknameEl.innerHTML = `<span class="logged-in">${Auth.nickname}</span>`;
            logoutBtn?.classList.remove('hidden');
            
            // Привязываем обработчик (только один раз)
            if (!logoutBtn.hasAttribute('data-bound')) {
                logoutBtn.setAttribute('data-bound', 'true');
                logoutBtn.addEventListener('click', () => {
                    Auth.logout();
                    this.updateUserStatus();
                });
            }
        } else {
            nicknameEl.innerHTML = '';
            logoutBtn?.classList.add('hidden');
        }
    },

    
    // ====== ЛИДЕРБОРД ======
    
    async showLeaderboard() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('leaderboardScreen').classList.remove('hidden');
        
        const listEl = document.getElementById('leaderboardList');
        listEl.innerHTML = '<div class="loading">loading…</div>';
        
        try {
            const scores = await Auth.getLeaderboard();
            
            if (scores.length === 0) {
                listEl.innerHTML = '<div class="empty">No results yet. Be the first!</div>';
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
            listEl.innerHTML = '<div class="error">loading error</div>';
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
        
        document.getElementById('saveScoreInfo').textContent = `Your score: ${this.currentScore.toLocaleString()} points`;
        
        // ✅ Если залогинен — проверяем, рекорд ли это
        if (Auth.isLoggedIn()) {
            if (this.currentIsNewRecord) {
                // Новый рекорд — сохраняем
                this.saveScoreDirectly();
            } else {
                // Не рекорд — показываем сообщение
                this.showNotRecordMessage();
            }
            return;
        }
        
        // ✅ Если НЕ залогинен, но это не рекорд (гость) — всё равно показываем форму
        // Для гостей isNewRecord всегда true (у них нет сохранённых результатов)
        
        // Показываем форму авторизации
        document.getElementById('authForm').classList.remove('hidden');
        document.getElementById('saveResult').classList.add('hidden');
        document.getElementById('nicknameInput').value = '';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').classList.add('hidden');
        document.getElementById('passwordHint').classList.add('hidden');
        document.getElementById('authSubmitButton').classList.add('hidden');
        document.getElementById('nicknameStatus').textContent = '';
        document.getElementById('skipSaveButton').classList.remove('hidden');
        //document.getElementById('saveMenuButton').classList.add('hidden');
    },
    
    // ✅ Новая функция: показать сообщение "не рекорд"
    showNotRecordMessage() {
        document.getElementById('authForm').classList.add('hidden');
        document.getElementById('saveResult').classList.remove('hidden');
        document.getElementById('saveResult').innerHTML = `
            <div class="info">
                This is not your best score<br>
                <span style="color: #888; font-size: 14px;">Your record is higher — score not saved</span>
            </div>
        `;
        document.getElementById('skipSaveButton').classList.add('hidden');
        
        // Показываем кнопки "Ещё раз" и "В меню"
        this.showAfterSaveButtons();
    },
    
    async saveScoreDirectly() {
        document.getElementById('authForm').classList.add('hidden');
        document.getElementById('saveResult').classList.remove('hidden');
        document.getElementById('saveResult').innerHTML = '<div class="loading">saving...</div>';
        document.getElementById('skipSaveButton').classList.add('hidden');
        
        try {
            const result = await Auth.saveScore(this.currentSessionId);
            
            if (result.isNewRecord) {
                document.getElementById('saveResult').innerHTML = `
                    <div class="success">
                        🏆 Your record saved!<br>
                        your rank: #${result.rank}
                    </div>
                `;
            } else {
                document.getElementById('saveResult').innerHTML = `
                    <div class="info">
                        Score not saved!<br>
                        <span style="color: #888; font-size: 14px;">Your record is higher</span>
                    </div>
                `;
            }
            
            // ✅ Показываем кнопки после сохранения
            this.showAfterSaveButtons();
            
        } catch (error) {
            document.getElementById('saveResult').innerHTML = `<div class="error">❌ ${error.message}</div>`;
            document.getElementById('skipSaveButton').classList.remove('hidden');
        }
    },

    // ✅ Новая функция
    showAfterSaveButtons() {
        document.getElementById('afterSaveButtons')?.classList.remove('hidden');
        document.getElementById('skipSaveButton')?.classList.add('hidden');
    },

    
    hideSaveScore() {
        document.getElementById('saveScoreScreen').classList.add('hidden');
        document.getElementById('gameOver').style.display = 'flex';
    },
    
    goToMenu() {
        document.getElementById('saveScoreScreen').classList.add('hidden');
        
        // Вызываем глобальную функцию очистки из game.js
        if (typeof window.backToMenu === 'function') {
            window.backToMenu();
        } else {
            document.getElementById('startScreen').classList.remove('hidden');
        }
        
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
                statusEl.textContent = 'nickname available! Create a password';
                statusEl.className = 'status-success';
                passwordHint.textContent = 'min. 4 chars';
                passwordInput.placeholder = 'Create a password';
            } else {
                this.isNewUser = false;
                statusEl.textContent = 'nickname taken. Yours? Enter password';
                statusEl.className = 'status-info';
                passwordHint.textContent = '';
                passwordInput.placeholder = 'Your password';
            }
            
            passwordInput.classList.remove('hidden');
            passwordHint.classList.remove('hidden');
            submitButton.classList.remove('hidden');
            submitButton.textContent = available ? 'sing up' : 'login';
            
        } catch (error) {
            statusEl.textContent = '❌ verification error';
            statusEl.className = 'status-error';
        }
    },
    
    async onSubmit() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const submitButton = document.getElementById('authSubmitButton');
        const statusEl = document.getElementById('nicknameStatus');
        
        if (!nickname || !password) {
            statusEl.textContent = '❌ fill in all fields';
            statusEl.className = 'status-error';
            return;
        }
        
        if (this.isNewUser && password.length < 4) {
            statusEl.textContent = '❌ Password min. 4 chars';
            statusEl.className = 'status-error';
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'wait...';
        
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
            submitButton.textContent = this.isNewUser ? 'sing up' : 'login';
        }
    },
    
    // ✅ Обновлено: принимает isNewRecord
    setGameResult(sessionId, score, isNewRecord = true) {
        this.currentSessionId = sessionId;
        this.currentScore = score;
        this.currentIsNewRecord = isNewRecord;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    AuthUI.init();
});