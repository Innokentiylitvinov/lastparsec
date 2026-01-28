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
        this.gyroPermissionNeeded = false;  // ✅ Флаг: нужно ли разрешение
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
            await this.checkGyroPermission();  // ✅ Только проверяем, не показываем кнопку
            this.initTouchControls();
        } else {
            this.initMouseControls();
        }
    }
    
    // ✅ Проверяем нужно ли разрешение (не показываем кнопку)
    async checkGyroPermission() {
        if (!window.DeviceOrientationEvent) {
            console.warn('Gyroscope is not supported');
            return;
        }
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS — нужно разрешение, запомним это
            this.gyroPermissionNeeded = true;
        } else {
            // Android — сразу включаем
            this.setupGyroscope();
            this.gyroEnabled = true;
        }
    }
    
    // ✅ Вызывается из game.js при нажатии "Играть"
    async requestGyroPermission() {
        if (!this.gyroPermissionNeeded || this.gyroEnabled) {
            return true;  // Разрешение не нужно или уже есть
        }
        
        return new Promise((resolve) => {
            const permissionButton = document.getElementById('permissionButton');
            permissionButton.style.display = 'block';
            
            permissionButton.onclick = async () => {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    permissionButton.style.display = 'none';
                    
                    if (permission === 'granted') {
                        this.setupGyroscope();
                        this.gyroEnabled = true;
                        resolve(true);
                    } else {
                        alert('Control is not available without a gyroscope');
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Permission request error:', error);
                    permissionButton.style.display = 'none';
                    resolve(false);
                }
            };
        });
    }
    
    setupGyroscope() {
        window.addEventListener('deviceorientation', (event) => {
            let tilt = event.gamma;
            if (Math.abs(event.beta) > 90) {
                tilt = -tilt;
            }
            this.currentTilt = tilt * this.sensitivity;
        });
    }
    
    initTouchControls() {
        const canvas = document.getElementById('gameCanvas');
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
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
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                if (this.mouseX === null) {
                    this.mouseX = window.innerWidth / 2;
                }
                this.mouseX += e.movementX;
                this.mouseX = Math.max(20, Math.min(window.innerWidth - 20, this.mouseX));
            } else {
                this.mouseX = e.clientX;
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement) {
                canvas.style.cursor = 'default';
            }
        });
    }
    
    getPlayerSpeed(canvasWidth, deltaTime = 1/60) {
        if (!this.isMobile || !this.gyroEnabled) {
            return null;
        }
        
        const normalizedTilt = Math.max(-1, Math.min(1, this.currentTilt / this.maxTiltAngle));
        const maxSpeed = canvasWidth * this.maxSpeedPercent;
        return normalizedTilt * maxSpeed * deltaTime * 60;
    }
    
    // 🔥 НОВЫЙ метод — по кадрам
    getPlayerSpeedFixed(canvasWidth) {
        if (!this.isMobile || !this.gyroEnabled) {
            return null;
        }
        
        const normalizedTilt = Math.max(-1, Math.min(1, this.currentTilt / this.maxTiltAngle));
        const maxSpeed = canvasWidth * this.maxSpeedPercent;
        return normalizedTilt * maxSpeed;  // Без deltaTime!
    }
    
    getMouseX() {
        return this.mouseX;
    }
}
