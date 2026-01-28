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
        const isMobile = this.isMobile();
        const isIOS = this.isIOS();
        const isAndroid = this.isAndroid();
        
        return {
            type: isMobile ? 'mobile' : 'desktop',
            os: isIOS ? 'ios' : (isAndroid ? 'android' : 'other'),
            isTablet: this.isTablet(),
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1
        };
    },
    
    getSensitivityMultiplier(deviceInfo) {
        const settings = {
            ios: { phone: 1.0, tablet: 0.8 },
            android: { phone: 1.2, tablet: 1.0 },
            other: { phone: 1.0, tablet: 1.0 }
        };
        const deviceType = deviceInfo.isTablet ? 'tablet' : 'phone';
        return settings[deviceInfo.os][deviceType];
    }
};

export class ControlSystem {
    constructor(shootCallback) {
        this.deviceInfo = DeviceDetector.getDeviceInfo();
        this.isMobile = this.deviceInfo.type === 'mobile';
        this.gyroEnabled = false;
        this.gyroPermissionNeeded = false;
        this.currentTilt = 0;
        this.sensitivity = DeviceDetector.getSensitivityMultiplier(this.deviceInfo);
        this.shootCallback = shootCallback;
        this.maxTiltAngle = 20;
        this.maxSpeedPercent = 0.035;
        this.mouseX = null;
        this.canvas = null;
    }
    
    async init() {
        this.canvas = document.getElementById('gameCanvas');
        
        if (this.isMobile) {
            await this.checkGyroPermission();
            this.initTouchControls();
        } else {
            this.initMouseControls();
        }
    }
    
    async checkGyroPermission() {
        if (!window.DeviceOrientationEvent) {
            console.warn('Gyroscope not supported');
            return;
        }
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.gyroPermissionNeeded = true;
        } else {
            this.setupGyroscope();
            this.gyroEnabled = true;
        }
    }
    
    async requestGyroPermission() {
        if (!this.gyroPermissionNeeded || this.gyroEnabled) return true;
        
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
                        alert('Control unavailable without gyroscope');
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Permission error:', error);
                    permissionButton.style.display = 'none';
                    resolve(false);
                }
            };
        });
    }
    
    setupGyroscope() {
        const sensitivity = this.sensitivity;
        window.addEventListener('deviceorientation', (event) => {
            let tilt = event.gamma;
            if (Math.abs(event.beta) > 90) tilt = -tilt;
            this.currentTilt = tilt * sensitivity;
        });
    }
    
    initTouchControls() {
        const canvas = this.canvas;
        const shootCallback = this.shootCallback;
        
        const touchHandler = (e) => {
            e.preventDefault();
            if (shootCallback && window.gameRunning) shootCallback();
        };
        
        canvas.addEventListener('touchstart', touchHandler, { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    initMouseControls() {
        const canvas = this.canvas;
        const shootCallback = this.shootCallback;
        
        canvas.addEventListener('click', () => {
            if (!window.gameRunning) return;
            
            if (!document.pointerLockElement) {
                canvas.requestPointerLock();
            }
            if (shootCallback) shootCallback();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                if (this.mouseX === null) this.mouseX = window.innerWidth / 2;
                this.mouseX = Math.max(20, Math.min(window.innerWidth - 20, this.mouseX + e.movementX));
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
        if (!this.isMobile || !this.gyroEnabled) return null;
        
        const normalizedTilt = Math.max(-1, Math.min(1, this.currentTilt / this.maxTiltAngle));
        return normalizedTilt * canvasWidth * this.maxSpeedPercent * deltaTime * 60;
    }
    
    getMouseX() {
        return this.mouseX;
    }
}
