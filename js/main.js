class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.gameState = new GameState();
        this.arena = new Arena(this.renderer.scene);
        this.player = new Player(this.renderer.camera, this.arena);
        this.weaponSystem = new WeaponSystem(this.renderer.scene, this.renderer.camera, this.player);
        this.enemyManager = new EnemyManager(this.renderer.scene, this.arena);
        this.healthPackManager = new HealthPackManager(this.renderer.scene, this.arena);
        this.gameState.healthPackManager = this.healthPackManager;
        this.minimap = new Minimap(document.getElementById('minimap'));
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 1000 / 60; 
        this.isRunning = false;
        this.isPaused = false;
        this.isSandboxMode = false;
        this.setupEventListeners();
        this.setupUI();
    }
    setupEventListeners() {
        const startBtn = document.getElementById('start-button');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.isSandboxMode = false;
                this.start();
            });
        }
        const sandboxBtn = document.getElementById('sandbox-button');
        if (sandboxBtn) {
            sandboxBtn.addEventListener('click', () => {
                this.isSandboxMode = true;
                this.start();
            });
        }
        document.getElementById('info-button').addEventListener('click', () => {
            document.getElementById('info-deck').classList.remove('hidden');
        });
        document.getElementById('info-close-button').addEventListener('click', () => {
            document.getElementById('info-deck').classList.add('hidden');
        });
        document.getElementById('restart-button').addEventListener('click', () => {
            this.restart();
        });
        document.getElementById('resume-button').addEventListener('click', () => {
            this.resume();
        });
        document.getElementById('quit-button').addEventListener('click', () => {
            this.quitToMenu();
        });
        this.canvas.addEventListener('click', () => {
            if (this.isRunning && !this.isPaused) {
                this.canvas.requestPointerLock();
            }
        });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.canvas) {
                this.isPaused = false;
                document.getElementById('pause-screen').classList.add('hidden');
            } else if (this.isRunning) {
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas && this.isRunning) {
                this.player.handleMouseMove(e.movementX, e.movementY);
            }
        });
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.canvas && this.isRunning) {
                if (e.button === 0) {
                    this.weaponSystem.startFiring();
                } else if (e.button === 2) {
                    this.weaponSystem.startSpecialFiring();
                }
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.weaponSystem.stopFiring();
            } else if (e.button === 2) {
                this.weaponSystem.stopSpecialFiring();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.isRunning) {
                e.preventDefault();
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
                return;
            }
            if (this.isRunning && !this.isPaused) {
                this.player.handleKeyDown(e.code);
                if (e.code === 'Digit1') this.weaponSystem.switchWeapon(0);
                if (e.code === 'Digit2') this.weaponSystem.switchWeapon(1);
                if (e.code === 'Digit3') this.weaponSystem.switchWeapon(2);
                if (e.code === 'KeyR') this.weaponSystem.reload();
                if (e.code === 'KeyQ') this.weaponSystem.deployStickyExplosive();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (this.isRunning) {
                this.player.handleKeyUp(e.code);
            }
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('resize', () => {
            this.renderer.resize();
        });
    }
    setupUI() {
        this.healthDisplay = document.getElementById('health-value');
        this.healthContainer = document.getElementById('health-container');
        this.ammoDisplay = document.getElementById('ammo-value');
        this.weaponDisplay = document.getElementById('weapon-name');
        this.weaponContainer = document.getElementById('weapon-container');
        this.scoreDisplay = document.getElementById('score-value');
        this.waveDisplay = document.getElementById('wave-value');
        this.enemiesDisplay = document.getElementById('enemies-value');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.dashPath = document.getElementById('dash-path');
        this.dashIndicator = document.getElementById('dash-indicator');
        this.crosshair = document.getElementById('crosshair');
        this.hitMarker = document.getElementById('hit-marker');
        this.weaponSprite = document.getElementById('weapon-sprite');
        this.weaponSpriteContainer = document.getElementById('weapon-sprite-container');
        this.weaponSprites = {
            'SKETCHER': 'textures/sketcher.png',
            'ERASER': 'textures/eraser.png',
            'SCRIBBLER': 'textures/scribbler.png'
        };
        this.weaponBarrelOffsets = {
            'SKETCHER': { x: 0.65, y: 0.45 },
            'ERASER': { x: 0.70, y: 0.50 },
            'SCRIBBLER': { x: 0.68, y: 0.48 }
        };
        this.menuMusic = document.getElementById('menu-music');
        if (this.menuMusic) {
            this.menuMusic.volume = 0.4;
            this.menuMusic.play().catch(() => {
            });
        }
        this.sounds = {
            jump: document.getElementById('jump-sound'),
            reload: document.getElementById('reload-sound'),
            healthpack: document.getElementById('healthpack-sound'),
            sketcher: document.getElementById('sketcher-sound'),
            scribbler: document.getElementById('scribbler-sound'),
            shotgun: document.getElementById('shotgun-sound'),
            sliding: document.getElementById('sliding-sound')
        };
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.5;
        });
        window.game = this;
        this.lastWeaponIndex = 0;
        this.lastWave = 1;
        this.lastScore = 0;
    }
    generateSquiggle(percent, maxWidth = 100, wobbleAmount = 2) {
        if (percent <= 0) return '';
        const width = (percent / 100) * maxWidth;
        const segments = Math.max(3, Math.floor(width / 8));
        const segmentWidth = width / segments;
        let path = `M 5 10`;
        for (let i = 1; i <= segments; i++) {
            const x = 5 + i * segmentWidth;
            const y = 10 + Math.sin(i * 0.8) * wobbleAmount + (Math.random() - 0.5) * wobbleAmount * 0.5;
            path += ` L ${x} ${y}`;
        }
        return path;
    }
    getWeaponBarrelScreenPos() {
        const weaponName = this.weaponSystem.getCurrentWeaponName();
        const offset = this.weaponBarrelOffsets[weaponName] || { x: 0.65, y: 0.45 };
        const containerRect = this.weaponSpriteContainer.getBoundingClientRect();
        const x = containerRect.right - (containerRect.width * (1 - offset.x));
        const y = containerRect.bottom - (containerRect.height * (1 - offset.y));
        return { x, y };
    }
    start() {
        document.getElementById('start-screen').classList.add('hidden');
        if (this.menuMusic) {
            this.menuMusic.volume = 0.15;
        }
        this.isRunning = true;
        this.isPaused = false;
        this.canvas.requestPointerLock();
        this.gameLoop(performance.now());
    }
    restart() {
        document.getElementById('death-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        this.gameState.reset();
        this.player.reset();
        this.enemyManager.reset();
        this.weaponSystem.reset();
        this.healthPackManager.reset();
        this.isRunning = true;
        this.isPaused = false;
        this.canvas.requestPointerLock();
    }
    pause() {
        this.isPaused = true;
        document.exitPointerLock();
        document.getElementById('pause-screen').classList.remove('hidden');
    }
    resume() {
        document.getElementById('pause-screen').classList.add('hidden');
        this.isPaused = false;
        this.canvas.requestPointerLock();
    }
    quitToMenu() {
        this.isRunning = false;
        this.isPaused = false;
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('death-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        if (this.menuMusic) {
            this.menuMusic.volume = 0.4;
            this.menuMusic.currentTime = 0;
            this.menuMusic.play().catch(() => {});
        }
        this.gameState.reset()
        this.player.reset();
        this.enemyManager.reset();
        this.weaponSystem.reset();
    }
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        requestAnimationFrame((t) => this.gameLoop(t));
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        if (this.isPaused) {
            this.renderer.render();
            return;
        }
        this.accumulator += deltaTime;
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(this.fixedTimeStep / 1000);
            this.accumulator -= this.fixedTimeStep;
        }
        this.update(deltaTime / 1000);
        this.renderer.render();
    }
    fixedUpdate(dt) {
        this.player.fixedUpdate(dt);
        if (!this.isSandboxMode) {
            this.enemyManager.fixedUpdate(dt, this.player.position);
        }
        const barrelPos = this.getWeaponBarrelScreenPos();
        this.weaponSystem.setBarrelScreenPos(barrelPos.x, barrelPos.y);
        const shotResult = this.weaponSystem.fixedUpdate(dt, this.enemyManager.enemies);
        if (shotResult.hit) {
            this.gameState.addScore(shotResult.damage, this.weaponSystem.scoreMultiplier);
            this.showHitMarker();
        }
        if (shotResult.killed) {
            this.gameState.addKill();
            this.gameState.addScore(100, this.weaponSystem.scoreMultiplier);
            this.showFlavorText(shotResult.killMethod);
        }
        if (!this.isSandboxMode) {
            const damage = this.enemyManager.checkPlayerDamage(this.player.position, this.player.radius);
            if (damage > 0) {
                this.player.takeDamage(damage);
                this.showDamageEffect();
            }
        }
        this.gameState.update(dt);
        const allEnemiesSpawned = this.gameState.enemiesSpawnedThisWave >= this.gameState.enemiesPerWave;
        const allEnemiesKilled = this.enemyManager.getAliveCount() === 0;
        if (!this.isSandboxMode && !this.gameState.isIntermission && allEnemiesSpawned && allEnemiesKilled) {
            this.gameState.startIntermission();
            this.healthPackManager.spawnHealthPacks();
        }
        if (!this.isSandboxMode && !this.gameState.isIntermission && this.gameState.shouldSpawnEnemy()) {
            this.enemyManager.spawnEnemy(this.gameState.wave, this.player.position);
            this.gameState.enemySpawned();
        }
        const healthPackResult = this.healthPackManager.update(dt, this.player.position, this.gameState.isIntermission);
        if (healthPackResult.collected) {
            this.player.heal(healthPackResult.healAmount);
        }
        if (!this.isSandboxMode && this.player.health <= 0) {
            this.gameOver();
        }
    }
    update(dt) {
        this.updateUI();
        this.enemyManager.update(dt);
        this.weaponSystem.update(dt, this.enemyManager.enemies);
        const minimapEnemies = this.enemyManager.getEnemiesForMinimap 
            ? this.enemyManager.getEnemiesForMinimap() 
            : this.enemyManager.enemies;
        this.minimap.update(this.player.position, this.player.rotation.y, minimapEnemies, dt);
        const screenShake = this.weaponSystem.getScreenShake();
        this.renderer.applyJitter(this.player.isMoving, screenShake);
        if (this.player.getTrailData && this.renderer.updateTrails) {
            const trailData = this.player.getTrailData();
            this.renderer.updateTrails(trailData);
        }
        if (this.player.isSmudged !== undefined && this.renderer.renderSmudgeEffect) {
            const smudgePercent = this.player.getSmudgePercent ? this.player.getSmudgePercent() : 0;
            this.renderer.renderSmudgeEffect(this.player.isSmudged, smudgePercent);
        }
        if (this.renderer.setMotionBlur) {
            if (this.player.isDashing) {
                const dirX = this.player.dashDirection ? this.player.dashDirection.x : 0;
                const dirZ = this.player.dashDirection ? this.player.dashDirection.z : 0;
                this.renderer.setMotionBlur(1.0, dirX, dirZ);
            } else {
                this.renderer.setMotionBlur(0.0, 0, 0);
            }
        }
    }
    updateUI() {
        const health = Math.max(0, Math.floor(this.player.health));
        this.healthDisplay.textContent = health;
        this.healthDisplay.classList.remove('low', 'critical');
        if (health <= 25) {
            this.healthDisplay.classList.add('critical');
        } else if (health <= 50) {
            this.healthDisplay.classList.add('low');
        }
        const ammoText = this.weaponSystem.getAmmoDisplay();
        this.ammoDisplay.textContent = ammoText;
        const weapon = this.weaponSystem.currentWeapon;
        this.ammoDisplay.classList.remove('low', 'empty', 'reloading');
        if (ammoText === 'RELOAD') {
            this.ammoDisplay.classList.add('reloading');
        } else if (weapon.ammo !== Infinity) {
            if (weapon.ammo === 0) {
                this.ammoDisplay.classList.add('empty');
            } else if (weapon.ammo <= weapon.maxAmmo * 0.25) {
                this.ammoDisplay.classList.add('low');
            }
        }
        const weaponName = this.weaponSystem.getCurrentWeaponName();
        if (this.weaponDisplay.textContent !== weaponName) {
            this.weaponDisplay.textContent = weaponName;
            this.weaponDisplay.classList.add('switched');
            setTimeout(() => this.weaponDisplay.classList.remove('switched'), 300);
            if (this.weaponSprite && this.weaponSprites[weaponName]) {
                this.weaponSprite.classList.remove('visible');
                setTimeout(() => {
                    this.weaponSprite.src = this.weaponSprites[weaponName];
                    this.weaponSprite.classList.add('visible');
                }, 100);
            }
        }
        if (this.weaponSprite && !this.weaponSprite.classList.contains('visible') && weaponName) {
            if (this.weaponSprites[weaponName]) {
                this.weaponSprite.src = this.weaponSprites[weaponName];
                this.weaponSprite.classList.add('visible');
            }
        }
        const specialSquiggle = document.getElementById('special-squiggle');
        const specialPath = document.getElementById('special-path');
        if (specialSquiggle && specialPath) {
            const ws = this.weaponSystem;
            specialSquiggle.classList.remove('ready', 'cooldown');
            let chargePercent = 0;
            if (weapon.specialAbility === 'beam') {
                chargePercent = (ws.specialChargeTimer / weapon.specialChargeTime) * 100;
                if (chargePercent >= 100) {
                    specialSquiggle.classList.add('ready');
                }
            } else if (weapon.specialAbility === 'overcharge') {
                if (ws.isOvercharged) {
                    chargePercent = (ws.overchargeTimer / weapon.specialDuration) * 100;
                    specialSquiggle.classList.add('ready');
                } else if (ws.overheatTimer > 0) {
                    chargePercent = (1 - ws.overheatTimer / weapon.specialCooldown) * 100;
                    specialSquiggle.classList.add('cooldown');
                } else {
                    chargePercent = 100;
                    specialSquiggle.classList.add('ready');
                }
            } else {
                chargePercent = 100;
                specialSquiggle.classList.add('ready');
            }
            specialPath.setAttribute('d', this.generateSquiggle(chargePercent, 70, 1.5));
        }
        const stickyContainer = document.getElementById('sticky-container');
        const stickyPath = document.getElementById('sticky-path');
        if (stickyContainer && stickyPath) {
            if (weapon.name === 'ERASER') {
                stickyContainer.style.display = 'block';
                const stickyPercent = this.weaponSystem.getStickyChargePercent();
                stickyPath.setAttribute('d', this.generateSquiggle(stickyPercent, 70, 1.5));
                if (stickyPercent >= 100) {
                    stickyContainer.classList.add('ready');
                } else {
                    stickyContainer.classList.remove('ready');
                }
            } else {
                stickyContainer.style.display = 'none';
            }
        }
        if (this.gameState.score !== this.lastScore) {
            this.scoreDisplay.textContent = this.gameState.score;
            this.scoreDisplay.classList.add('updated');
            setTimeout(() => this.scoreDisplay.classList.remove('updated'), 300);
            this.lastScore = this.gameState.score;
        }
        if (this.gameState.wave !== this.lastWave) {
            this.lastWave = this.gameState.wave;
        }
        if (this.gameState.isIntermission) {
            this.waveDisplay.textContent = this.gameState.wave + ' - Intermission';
        } else {
            this.waveDisplay.textContent = this.gameState.wave;
        }
        if (this.enemiesDisplay) {
            const enemiesRemaining = this.gameState.getEnemiesRemaining();
            this.enemiesDisplay.textContent = Math.max(0, enemiesRemaining);
        }
        const dashPercent = this.player.dashCooldownPercent();
        if (this.dashPath) {
            this.dashPath.setAttribute('d', this.generateSquiggle(dashPercent * 100, 100, 1.5));
        }
        if (dashPercent >= 1 && this.dashIndicator) {
            this.dashIndicator.classList.add('ready');
        } else if (this.dashIndicator) {
            this.dashIndicator.classList.remove('ready');
        }
        const momentumPath = document.getElementById('momentum-path');
        const momentumContainer = document.getElementById('momentum-container');
        const smudgePath = document.getElementById('smudge-path');
        const smudgeContainer = document.getElementById('smudge-container');
        if (momentumPath && this.player.getMomentumPercent) {
            const momentumPercent = this.player.getMomentumPercent();
            momentumPath.setAttribute('d', this.generateSquiggle(momentumPercent, 100, 2));
            if (momentumPercent > 70) {
                momentumContainer.classList.add('charged');
            } else {
                momentumContainer.classList.remove('charged');
            }
        }
        if (smudgePath && this.player.getSmudgePercent) {
            const smudgePercent = this.player.getSmudgePercent();
            smudgePath.setAttribute('d', this.generateSquiggle(smudgePercent, 100, 2.5));
            if (this.player.isSmudged) {
                smudgeContainer.classList.add('smudged');
            } else {
                smudgeContainer.classList.remove('smudged');
            }
        }
        this.crosshair.textContent = this.weaponSystem.getCrosshairStyle();
        const crosshairScale = this.weaponSystem.getCrosshairScale ? this.weaponSystem.getCrosshairScale() : 1;
        this.crosshair.style.transform = `translate(-50%, -50%) scale(${crosshairScale})`;
    }
    showDamageEffect() {
        this.damageOverlay.classList.add('active');
        this.healthContainer.classList.add('damaged');
        setTimeout(() => {
            this.damageOverlay.classList.remove('active');
            this.healthContainer.classList.remove('damaged');
        }, 150);
    }
    showHitMarker() {
        this.crosshair.classList.add('hit');
        this.hitMarker.classList.add('show');
        setTimeout(() => {
            this.crosshair.classList.remove('hit');
            this.hitMarker.classList.remove('show');
        }, 150);
    }
    showFlavorText(killMethod) {
        const flavorText = document.getElementById('flavor-text');
        if (!flavorText) return;
        
        let text = '+ERASED';
        if (killMethod === 'sticky') {
            text = '+STICKIED';
        } else if (killMethod === 'beam') {
            text = '+VAPORIZED';
        }
        
        flavorText.textContent = text;
        flavorText.classList.add('show');
        setTimeout(() => {
            flavorText.classList.remove('show');
        }, 800);
    }
    gameOver() {
        this.isRunning = false;
        document.exitPointerLock();
        document.getElementById('final-score').textContent = this.gameState.score;
        document.getElementById('final-wave').textContent = this.gameState.wave;
        document.getElementById('death-screen').classList.remove('hidden');
    }
}
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
