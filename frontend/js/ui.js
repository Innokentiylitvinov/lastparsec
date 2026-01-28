export class UI {
    constructor() {
        this.startScreen = document.getElementById('startScreen');
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('gameOver');
        this.gameOverReason = document.getElementById('gameOverReason');
        this.finalScore = document.getElementById('finalScore');
        this.playButton = document.getElementById('playButton');
        this.leaderboardButton = document.getElementById('leaderboardButton');
        this.restartButton = document.getElementById('restartButton');
        this.menuButton = document.getElementById('menuButton');
        
        // 🆕 Создаём элемент для статуса валидации
        this.validationStatus = document.createElement('p');
        this.validationStatus.id = 'validationStatus';
        this.validationStatus.style.cssText = 'font-size: 14px; margin-top: 10px; color: #888;';
    }
    
    updateScore(score) {
        this.scoreElement.textContent = 'score: ' + score;
    }
    
    showStartScreen() {
        this.startScreen.style.display = 'flex';
        this.gameOverElement.style.display = 'none';
        this.scoreElement.classList.remove('visible');
    }
    
    hideStartScreen() {
        this.startScreen.style.display = 'none';
        this.scoreElement.classList.add('visible');
    }
    
    showGameOver(reason, score, extra = null, isLoggedIn = false) {
        document.getElementById('gameOverReason').textContent = reason;
        document.getElementById('finalScore').textContent = `Score: ${score}`;
        
        // Доп. инфо (рекорд, время и т.д.)
        const extraEl = document.getElementById('gameOverExtra');
        if (extra) {
            extraEl.textContent = extra;
            extraEl.classList.remove('hidden');
        } else {
            extraEl.classList.add('hidden');
        }
        
        // Кнопка "save score" — только для гостей!
        const saveBtn = document.getElementById('saveScoreButton');
        if (saveBtn) {
            if (isLoggedIn) {
                saveBtn.classList.add('hidden');
            } else {
                saveBtn.classList.remove('hidden');
            }
        }
        
        document.getElementById('gameOver').style.display = 'flex';
    }

    
    hideGameOver() {
        this.gameOverElement.style.display = 'none';
        this.validationStatus.style.display = 'none';
    }
    
    onPlay(callback) {
        this.playButton.addEventListener('click', callback);
    }
    
    onRestart(callback) {
        this.restartButton.addEventListener('click', callback);
    }
    
    onMenu(callback) {
        this.menuButton.addEventListener('click', callback);
    }
    
    onLeaderboard(callback) {
        this.leaderboardButton.addEventListener('click', callback);
    }
}
