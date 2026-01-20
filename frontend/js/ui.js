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
    
    showGameOver(reason, score) {
        this.gameOverReason.textContent = reason;
        this.finalScore.textContent = `Счёт: ${score}`;
        this.gameOverElement.style.display = 'block';
        
        // Освобождаем курсор
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        document.getElementById('gameCanvas').style.cursor = 'default';
    }
    
    hideGameOver() {
        this.gameOverElement.style.display = 'none';
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
