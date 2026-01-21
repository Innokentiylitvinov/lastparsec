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
        this.scoreElement.textContent = 'Очки: ' + score;
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
    
    // 🆕 Обновлённый метод с третьим параметром
    showGameOver(reason, score, statusMessage = null) {
        this.gameOverReason.textContent = reason;
        this.finalScore.textContent = `Счёт: ${score}`;
        
        // Показываем статус валидации
        if (statusMessage) {
            this.validationStatus.textContent = statusMessage;
            // Добавляем после finalScore если ещё не добавлен
            if (!this.validationStatus.parentNode) {
                this.finalScore.parentNode.insertBefore(
                    this.validationStatus, 
                    this.finalScore.nextSibling
                );
            }
            this.validationStatus.style.display = 'block';
        } else {
            this.validationStatus.style.display = 'none';
        }
        
        this.gameOverElement.style.display = 'block';
        
        // Освобождаем курсор
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        document.getElementById('gameCanvas').style.cursor = 'default';
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
