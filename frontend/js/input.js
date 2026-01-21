// ====== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ======
export const DeviceDetector = {
    userAgent: navigator.userAgent.toLowerCase(),
    
    isMobile() {
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(this.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    },
    
    isIOS() {
        return /iphone|ipad|ipod/.test(this.userAgent);
    },
    
    isAndroid() {
        return /android/.test(this.userAgent);
    },
    
    isTablet() {
        return /ipad|tablet|playbook|silk/.test(this.userAgent) || 
               (this.isAndroid() && !/mobile/.test(this.userAgent));
    },
    
    getDeviceInfo() {
        return {
            type: this.isMobile() ? 'mobile' : 'desktop',
            os: this.isIOS() ? 'ios' : (this.isAndroid() ? 'android' : 'other'),
            isTablet: this.isTablet(),
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1
        };
    },
    
    getSensitivityMultiplier(deviceInfo) {
        const settings = {
            'ios': { phone: 1.0, tablet: 0.8 },
            'android': { phone: 1.2, tablet: 1.0 },
            'other': { phone: 1.0, tablet: 1.0 }
        };
        const deviceType = deviceInfo.isTablet ? 'tablet' : 'phone';
        return settings[deviceInfo.os][deviceType];
    }
};

// ====== СИСТЕМА УПРАВЛЕНИЯ ======
export class ControlSystem {
    constructor(shootCallback) {
        this.deviceInfo = DeviceDetector.getDeviceInfo();
        this.isMobile = this.deviceInfo.type === 'mobile';
        this.gyroEnabled = false;
        this.currentTilt = 0;
        this.sensitivity = DeviceDetector.getSensitivityMultiplier(this.deviceInfo);
        this.shootCallback = shootCallback;
        
        // Параметры управления
        this.maxTiltAngle = 20;
        this.maxSpeedPercent = 0.035;
        
        // Для десктопа
        this.keys = {};
        this.mouseX = null;
        
        console.log('Device Info:', this.deviceInfo);
    }
    
    async init() {
        if (this.isMobile) {
            await this.initGyroscope();
            this.initTouchControls();
            this.showControlInfo('Наклоняйте устройство и тапайте для стрельбы');
        } else {
            this.initMouseControls();
            this.showControlInfo('Мышь: движение, Клик: стрельба');
        }
    }
    
    async initGyroscope() {
    if (!window.DeviceOrientationEvent) {
        console.warn('Гироскоп не поддерживается');
        return false;
    }
    
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS - показываем кнопку, но НЕ блокируем
        const permissionButton = document.getElementById('permissionButton');
        permissionButton.style.display = 'block';
        
        // Не ждём — пользователь нажмёт когда захочет
        permissionButton.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                permissionButton.style.display = 'none';
                
                if (permission === 'granted') {
                    this.setupGyroscope();
                    this.gyroEnabled = true;
                } else {
                    alert('Без гироскопа управление недоступно');
                }
            } catch (error) {
                console.error('Ошибка запроса разрешения:', error);
                permissionButton.style.display = 'none';
            }
        });
        
        return false; // Гироскоп пока не включён
    } else {
        // Android - сразу включаем
        this.setupGyroscope();
        this.gyroEnabled = true;
        return true;
    }
}

    
    setupGyroscope() {
        window.addEventListener('deviceorientation', (event) => {
            let tilt = event.gamma;
            if (Math.abs(event.beta) > 90) {
                tilt = -tilt;
            }
            this.currentTilt = tilt * this.sensitivity;
            
            const indicator = document.getElementById('tiltIndicator');
            indicator.style.display = 'block';
            indicator.textContent = `Наклон: ${this.currentTilt.toFixed(1)}°`;
        });
    }
    
    initTouchControls() {
        const canvas = document.getElementById('gameCanvas');
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Стрелять можно всегда!
            if (this.shootCallback && window.gameRunning) {
                this.shootCallback();
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    initMouseControls() {
        const canvas = document.getElementById('gameCanvas');
        
        // Захват курсора по клику
        canvas.addEventListener('click', () => {
            if (window.gameRunning) {
                if (!document.pointerLockElement) {
                    canvas.requestPointerLock();
                }
                if (this.shootCallback) {
                    this.shootCallback();
                }
            }
        });
        
        // Движение мыши
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                // Относительное движение при захвате
                if (this.mouseX === null) {
                    this.mouseX = window.innerWidth / 2;
                }
                this.mouseX += e.movementX;
                // Ограничиваем границами (но не сбрасываем в центр!)
                this.mouseX = Math.max(20, Math.min(window.innerWidth - 20, this.mouseX));
            } else {
                this.mouseX = e.clientX;
            }
        });
        
        // Автоматически освобождаем курсор при Game Over
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement) {
                canvas.style.cursor = 'default';
            }
        });
        
        this.showControlInfo('Клик: стрельба, ESC: пауза');
    }


    
    getPlayerSpeed(canvasWidth, deltaTime = 1/60) {
        if (!this.isMobile || !this.gyroEnabled) {
            return null;
        }
        
        const normalizedTilt = Math.max(-1, Math.min(1, this.currentTilt / this.maxTiltAngle));
        const maxSpeed = canvasWidth * this.maxSpeedPercent;
        return normalizedTilt * maxSpeed * deltaTime * 60;
    }
    
    getMouseX() {
        return this.mouseX;
    }
    
    showControlInfo(text) {
        const info = document.getElementById('controlInfo');
        info.textContent = text;
        setTimeout(() => {
            info.style.opacity = '0';
        }, 5000);
    }
}
