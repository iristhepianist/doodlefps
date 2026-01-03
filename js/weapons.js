class WeaponSystem {
    constructor(scene, camera, player) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.weapons = [
            {
                name: 'SKETCHER',
                damage: 35,
                headshotMultiplier: 2.5,
                fireRate: 4,
                range: 300,
                ammo: Infinity,
                maxAmmo: Infinity,
                reloadTime: 0,
                spread: 0.005,
                type: 'hitscan',
                crosshair: '+',
                knockback: 0,
                description: 'Precision sidearm. Accurate, reliable.',
                screenShake: 0.08,
                cameraRecoilPitch: 0.06,
                trailColor: 0x1a1a1a,
                impactColor: 0x1a1a1a,
                element: 'none',
                specialAbility: 'beam',
                specialChargeTime: 5.0,
                specialDamage: 200,
                specialRange: 500,
                beamWidth: 0.8,
                ricochetCount: 3,
                qAbility: 'mark-execute',
                qCooldown: 8.0,
                qMarkDuration: 5.0,
                qExecuteDamage: 150
            },
            {
                name: 'ERASER',
                damage: 28,
                pellets: 8,
                headshotMultiplier: 1.5,
                fireRate: 1.0,
                range: 45,
                falloffStart: 12,
                ammo: 6,
                maxAmmo: 6,
                reloadTime: 0.4,
                reloadPerShell: true,
                spread: 0.14,
                type: 'shotgun',
                crosshair: '[ ]',
                knockback: 12,
                description: 'Point blank devastation. Heavy knockback.',
                screenShake: 0.1,
                trailColor: 0x333333,
                impactColor: 0x555555,
                element: 'force',
                forceWave: true,
                specialAbility: 'explosive-pellet',
                specialDamage: 80,
                specialRange: 100,
                specialExplosionRadius: 8,
                specialKnockback: 25,
                stickyChargeTime: 4.0,
                stickyDamage: 120,
                stickyRadius: 10,
                stickyFuseTime: 5.0,
                qAbility: 'sticky-bomb',
                qCooldown: 4.0
            },
            {
                name: 'SCRIBBLER',
                damage: 8,
                headshotMultiplier: 1.5,
                fireRate: 20,
                range: 80,
                ammo: 50,
                maxAmmo: 50,
                reloadTime: 1.6,
                spread: 0.05,
                spreadIncrease: 0.006,
                maxSpread: 0.12,
                type: 'hitscan',
                crosshair: '⊕',
                knockback: 1,
                description: 'Rapid fire. Slows enemies on hit.',
                screenShake: 0.012,
                trailColor: 0x6699cc,
                impactColor: 0x88bbee,
                element: 'freeze',
                slowAmount: 0.5,
                slowDuration: 0.8,
                specialAbility: 'overcharge',
                specialDuration: 4.0,
                specialCooldown: 6.0,
                specialFireRateMultiplier: 3.0,
                qAbility: 'spread-burst',
                qCooldown: 7.0,
                qBurstShots: 12,
                qBurstDamage: 15,
                qBurstSpread: 0.15
            }
        ];
        this.currentWeaponIndex = 0;
        this.isFiring = false;
        this.fireTimer = 0;
        this.reloadTimer = 0;
        this.isReloading = false;
        this.currentSpread = 0;
        this.shellsLoaded = 0;
        this.isSpecialFiring = false;
        this.specialChargeTimer = 0;
        this.specialCooldownTimer = 0;
        this.isOvercharged = false;
        this.overchargeTimer = 0;
        this.overheatTimer = 0;
        this.qCooldownTimer = 0;
        this.markedEnemies = new Set();
        this.markTimers = new Map();
        this.stickyChargeTimer = 0;
        this.stickyMaxCharge = 4.0;
        this.stickyExplosives = [];
        this.stickyProjectiles = [];
        this.barrelScreenX = 0;
        this.barrelScreenY = 0;
        this.dashCancelBonus = 1.0;
        this.impactMarkers = [];
        this.bulletTrails = [];
        this.forceWaves = [];
        this.muzzleFlash = null;
        this.raycaster = new THREE.Raycaster();
        this.screenShake = 0;
        this.shakeDecay = 12;
        this.lastHitTime = 0;
        this.hitCombo = 0;
        this.hitComboTimer = 0;
        this.crosshairPulse = 0;
        this.crosshairHitScale = 1;
        this.lastWeaponSwitchTime = 0;
        this.weaponSwitchCount = 0;
        this.scoreMultiplier = 1.0;
        this.lastKillMethod = null;
        this.weaponModels = [];
        this.currentWeaponModel = null;
        this.weaponModelOffset = new THREE.Vector3(0.3, -0.2, -0.5); 
        this.weaponModelRotation = new THREE.Euler(-0.1, 0, 0);
        this.loadWeaponModels();
    }
    loadWeaponModels() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('GLTFLoader not found! Weapon models will not load.');
            console.log('Make sure the GLTFLoader script is loaded before weapons.js');
            return;
        }
        const loader = new THREE.GLTFLoader();
        loader.load(
            'models/pencil/scene.gltf',
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.01, 0.01, 0.01);
                model.position.set(0.2, -0.15, -0.35);
                model.rotation.set(-0.3, 0.15, -0.15);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.renderOrder = 999;
                        child.material.depthTest = false;
                        child.material.depthWrite = false;
                    }
                });
                this.weaponModels[0] = model;
                if (this.currentWeaponIndex === 0) {
                    this.showWeaponModel(0);
                }
                console.log('✓ Sketcher (pencil) model loaded successfully!');
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading Sketcher model: ${percent}%`);
                }
            },
            (error) => {
                console.error('✗ Could not load Sketcher model:', error);
                console.log('Try running from a local web server (e.g., Live Server) for full asset support.');
            }
        );
        loader.load(
            'models/model.glb',
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.15, 0.15, 0.15);
                model.position.copy(this.weaponModelOffset);
                model.rotation.copy(this.weaponModelRotation);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.renderOrder = 999;
                        child.material.depthTest = false;
                        child.material.depthWrite = false;
                        if (child.material) {
                            child.material.color = new THREE.Color(0x1a1a1a);
                        }
                    }
                });
                this.weaponModels[1] = model;
                if (this.currentWeaponIndex === 1) {
                    this.showWeaponModel(1);
                }
            },
            undefined,
            (error) => {
                console.warn('Could not load Eraser model:', error);
                console.log('Make sure to export model.blend as model.glb in the models folder');
            }
        );
    }
    showWeaponModel(index) {
        if (this.currentWeaponModel) {
            this.camera.remove(this.currentWeaponModel);
            this.currentWeaponModel = null;
        }
        if (this.weaponModels[index]) {
            this.currentWeaponModel = this.weaponModels[index];
            this.camera.add(this.currentWeaponModel);
        }
    }
    reset() {
        this.weapons.forEach(w => {
            if (w.maxAmmo !== Infinity) {
                w.ammo = w.maxAmmo;
            }
        });
        this.currentWeaponIndex = 0;
        this.isFiring = false;
        this.fireTimer = 0;
        this.reloadTimer = 0;
        this.isReloading = false;
        this.currentSpread = 0;
        this.shellsLoaded = 0;
        this.screenShake = 0;
        this.hitCombo = 0;
        this.qCooldownTimer = 0;
        this.markedEnemies.clear();
        this.markTimers.clear();
        this.clearEffects();
    }
    get currentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }
    setBarrelScreenPos(x, y) {
        this.barrelScreenX = x;
        this.barrelScreenY = y;
    }
    getShootOrigin() {
        const ndcX = (this.barrelScreenX / window.innerWidth) * 2 - 1;
        const ndcY = -(this.barrelScreenY / window.innerHeight) * 2 + 1;
        const origin = new THREE.Vector3(ndcX, ndcY, 0.5);
        origin.unproject(this.camera);
        const dir = origin.clone().sub(this.camera.position).normalize();
        const distance = 0.5;
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && index !== this.currentWeaponIndex) {
            this.currentWeaponIndex = index;
            this.isReloading = false;
            this.reloadTimer = 0;
            this.currentSpread = 0;
            this.shellsLoaded = 0;
            this.showWeaponModel(index);
            this.crosshairPulse = 0.3;
            const now = performance.now();
            if (now - this.lastWeaponSwitchTime < 3000) {
                this.weaponSwitchCount++;
                if (this.weaponSwitchCount >= 3) {
                    this.scoreMultiplier = 3.0;
                    this.weaponSwitchCount = 0;
                }
            } else {
                this.weaponSwitchCount = 1;
                this.scoreMultiplier = 1.0;
            }
            this.lastWeaponSwitchTime = now;
        }
    }
    startFiring() {
        this.isFiring = true;
    }
    stopFiring() {
        this.isFiring = false;
    }
    startSpecialFiring() {
        this.isSpecialFiring = true;
    }
    stopSpecialFiring() {
        const weapon = this.currentWeapon;
        if (weapon.specialAbility === 'beam') {
            console.log('Beam charge:', this.specialChargeTimer, '/', weapon.specialChargeTime);
            if (this.specialChargeTimer >= weapon.specialChargeTime) {
                console.log('Firing beam!');
                this.fireRicochetBeam();
                this.specialChargeTimer = 0;
            }
        }
        this.isSpecialFiring = false;
    }
    useQAbility() {
        const weapon = this.currentWeapon;
        if (this.qCooldownTimer > 0) return;
        if (!weapon.qAbility) return;
        
        switch(weapon.qAbility) {
            case 'mark-execute':
                this.markAndExecute();
                break;
            case 'sticky-bomb':
                this.deployStickyExplosive();
                break;
            case 'spread-burst':
                this.spreadBurst();
                break;
        }
        this.qCooldownTimer = weapon.qCooldown || 5.0;
    }
    markAndExecute() {
        const weapon = this.currentWeapon;
        const enemies = this.currentEnemies || [];
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = weapon.range;
        const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
        const intersects = this.raycaster.intersectObjects(enemyMeshes, true);
        if (intersects.length > 0) {
            let hitEnemy = null;
            const hit = intersects[0];
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;
                if (enemy.mesh === hit.object || enemy.mesh.children.includes(hit.object)) {
                    hitEnemy = enemy;
                    break;
                }
                let parent = hit.object.parent;
                while (parent) {
                    if (parent === enemy.mesh) {
                        hitEnemy = enemy;
                        break;
                    }
                    parent = parent.parent;
                }
                if (hitEnemy) break;
            }
            if (hitEnemy) {
                if (this.markedEnemies.has(hitEnemy)) {
                    hitEnemy.takeDamage(weapon.qExecuteDamage);
                    this.createImpact(hit.point, true, 0xff0000);
                    this.createComicImpact(weapon.qExecuteDamage, false, hitEnemy, hit.point);
                    this.markedEnemies.delete(hitEnemy);
                    this.markTimers.delete(hitEnemy);
                    this.screenShake = 0.15;
                } else {
                    this.markedEnemies.add(hitEnemy);
                    this.markTimers.set(hitEnemy, weapon.qMarkDuration);
                    this.createImpact(hit.point, false, 0xffaa00);
                }
            }
        }
    }
    spreadBurst() {
        const weapon = this.currentWeapon;
        const enemies = this.currentEnemies || [];
        const camera = this.camera;
        const raycaster = this.raycaster;
        const self = this;
        for (let i = 0; i < weapon.qBurstShots; i++) {
            setTimeout(() => {
                const spreadX = (Math.random() - 0.5) * weapon.qBurstSpread * 2;
                const spreadY = (Math.random() - 0.5) * weapon.qBurstSpread * 2;
                const direction = new THREE.Vector3(spreadX, spreadY, -1);
                direction.applyQuaternion(camera.quaternion);
                direction.normalize();
                raycaster.set(camera.position, direction);
                raycaster.far = weapon.range;
                const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
                const intersects = raycaster.intersectObjects(enemyMeshes, true);
                if (intersects.length > 0) {
                    let hitEnemy = null;
                    const hit = intersects[0];
                    for (const enemy of enemies) {
                        if (!enemy.isAlive) continue;
                        if (enemy.mesh === hit.object || enemy.mesh.children.includes(hit.object)) {
                            hitEnemy = enemy;
                            break;
                        }
                        let parent = hit.object.parent;
                        while (parent) {
                            if (parent === enemy.mesh) {
                                hitEnemy = enemy;
                                break;
                            }
                            parent = parent.parent;
                        }
                        if (hitEnemy) break;
                    }
                    if (hitEnemy) {
                        hitEnemy.takeDamage(weapon.qBurstDamage);
                        self.createImpact(hit.point, true, 0x6699cc);
                        self.createComicImpact(weapon.qBurstDamage, false, hitEnemy, hit.point);
                    }
                }
                const trailEnd = camera.position.clone().add(direction.multiplyScalar(weapon.range));
                self.createBulletTrail(camera.position.clone(), trailEnd, weapon.trailColor);
            }, i * 50);
        }
        this.screenShake = 0.12;
    }
    deployStickyExplosive() {
        const weapon = this.currentWeapon;
        if (weapon.name !== 'ERASER' || this.stickyChargeTimer < this.stickyMaxCharge) return;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        const startPos = this.getShootOrigin();
        const throwSpeed = 25;
        const velocity = direction.clone().multiplyScalar(throwSpeed);
        velocity.y += 5;
        const stickyGeom = new THREE.SphereGeometry(0.5, 16, 12);
        const stickyMat = new THREE.MeshBasicMaterial({ 
            color: 0xcc3300,
            transparent: true,
            opacity: 0.9
        });
        const sticky = new THREE.Mesh(stickyGeom, stickyMat);
        sticky.position.copy(startPos);
        sticky.userData.isSticky = true;
        sticky.userData.isProjectile = true;
        sticky.userData.velocity = velocity;
        sticky.userData.fuseTime = weapon.stickyFuseTime;
        sticky.userData.damage = weapon.stickyDamage;
        sticky.userData.radius = weapon.stickyRadius;
        sticky.userData.startTime = performance.now();
        sticky.userData.stuck = false;
        sticky.userData.attachedEnemy = null;
        const timerDiv = document.createElement('div');
        timerDiv.className = 'sticky-timer';
        timerDiv.style.cssText = 'position:absolute;color:#cc3300;font-size:18px;font-weight:bold;pointer-events:none;text-shadow:1px 1px 0 #fff;';
        timerDiv.textContent = '5.0';
        document.getElementById('hud').appendChild(timerDiv);
        sticky.userData.timerElement = timerDiv;
        this.stickyProjectiles.push(sticky);
        this.scene.add(sticky);
        this.stickyChargeTimer = 0;
        this.screenShake = 0.08;
    }
    reload() {
        const weapon = this.currentWeapon;
        if (!this.isReloading && weapon.ammo < weapon.maxAmmo && weapon.maxAmmo !== Infinity) {
            this.isReloading = true;
            if (window.game && window.game.sounds && window.game.sounds.reload) {
                window.game.sounds.reload.currentTime = 0;
                window.game.sounds.reload.play().catch(() => {});
            }
            let reloadSpeedMult = 1.0;
            if (this.player) {
                const speed = this.player.getCurrentSpeed();
                reloadSpeedMult = 1.0 - Math.min(speed / 40, 0.3);
            }
            if (weapon.reloadPerShell) {
                this.reloadTimer = weapon.reloadTime * reloadSpeedMult;
            } else {
                this.reloadTimer = weapon.reloadTime * reloadSpeedMult;
            }
        }
    }
    attemptDashCancel() {
        if (this.player && this.player.canDashCancel()) {
            if (this.player.performDashCancel()) {
                this.dashCancelBonus = 1.25; 
                return true;
            }
        }
        return false;
    }
    fixedUpdate(dt, enemies) {
        let result = { hit: false, killed: false, damage: 0, knockedBack: [], killMethod: null };
        const weapon = this.currentWeapon;
        this.currentEnemies = enemies;
        if (this.dashCancelBonus && this.dashCancelBonus > 1) {
            this.dashCancelBonus = Math.max(1, this.dashCancelBonus - dt * 2);
        }
        if (this.overheatTimer > 0) {
            this.overheatTimer -= dt;
        }
        if (this.qCooldownTimer > 0) {
            this.qCooldownTimer -= dt;
        }
        for (const [enemy, timer] of this.markTimers.entries()) {
            this.markTimers.set(enemy, timer - dt);
            if (timer - dt <= 0) {
                this.markedEnemies.delete(enemy);
                this.markTimers.delete(enemy);
            }
        }
        if (this.isOvercharged) {
            this.overchargeTimer -= dt;
            if (this.overchargeTimer <= 0) {
                this.isOvercharged = false;
                this.overheatTimer = weapon.specialCooldown || 6.0;
            }
        }
        if (weapon.name === 'ERASER' && this.stickyChargeTimer < this.stickyMaxCharge) {
            this.stickyChargeTimer += dt * 0.8;
        }
        this.updateStickyExplosives(dt, enemies);
        if (this.isSpecialFiring && weapon.specialAbility === 'beam') {
            if (this.specialChargeTimer < weapon.specialChargeTime) {
                this.specialChargeTimer += dt;
                if (Math.floor(this.specialChargeTimer * 10) % 10 === 0) {
                    console.log('Charging beam:', (this.specialChargeTimer / weapon.specialChargeTime * 100).toFixed(0) + '%');
                }
            }
        }
        if (this.isSpecialFiring && !this.isReloading) {
            if (weapon.specialAbility === 'explosive-pellet' && weapon.ammo > 0) {
                result = this.fireExplosivePellet(enemies);
                this.isSpecialFiring = false;
                return result;
            }
            if (weapon.specialAbility === 'overcharge' && this.overheatTimer <= 0 && !this.isOvercharged) {
                this.isOvercharged = true;
                this.overchargeTimer = weapon.specialDuration;
                this.isSpecialFiring = false;
            }
        }
        this.screenShake = Math.max(0, this.screenShake - this.shakeDecay * dt);
        this.hitComboTimer -= dt;
        if (this.hitComboTimer <= 0) {
            this.hitCombo = 0;
        }
        this.crosshairPulse = Math.max(0, this.crosshairPulse - dt * 3);
        this.crosshairHitScale = 1 + (this.crosshairHitScale - 1) * 0.85;
        if (!this.isFiring) {
            this.currentSpread = Math.max(0, this.currentSpread - dt * 0.5);
        }
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                const weapon = this.currentWeapon;
                if (weapon.reloadPerShell) {
                    weapon.ammo++;
                    if (weapon.ammo < weapon.maxAmmo && !this.isFiring) {
                        this.reloadTimer = weapon.reloadTime;
                    } else {
                        this.isReloading = false;
                    }
                } else {
                    weapon.ammo = weapon.maxAmmo;
                    this.isReloading = false;
                }
            }
            if (this.isFiring && this.currentWeapon.reloadPerShell && this.currentWeapon.ammo > 0) {
                this.isReloading = false;
            }
            if (this.isReloading) return result;
        }
        this.fireTimer -= dt;
        let currentFireRate = weapon.fireRate;
        if (this.isOvercharged && weapon.specialAbility === 'overcharge') {
            currentFireRate *= weapon.specialFireRateMultiplier || 3.0;
        }
        if (this.isFiring && this.fireTimer <= 0 && this.overheatTimer <= 0) {
            if (weapon.ammo > 0 || weapon.ammo === Infinity) {
                result = this.fire(enemies);
                this.fireTimer = 1 / currentFireRate;
                this.screenShake = Math.min(0.12, this.screenShake + (weapon.screenShake || 0.02));
                if (window.game && window.game.sounds) {
                    let soundName = weapon.name.toLowerCase();
                    if (soundName === 'eraser') soundName = 'shotgun';
                    if (window.game.sounds[soundName]) {
                        window.game.sounds[soundName].currentTime = 0;
                        window.game.sounds[soundName].play().catch(() => {});
                    }
                }
                if (weapon.ammo !== Infinity) {
                    weapon.ammo--;
                    if (weapon.ammo <= 0) {
                        this.reload();
                    }
                }
            }
        }
        if (this.lastKillMethod) {
            result.killed = true;
            result.killMethod = this.lastKillMethod;
            this.lastKillMethod = null;
        }
        return result;
    }
    fire(enemies) {
        const weapon = this.currentWeapon;
        let result = { hit: false, killed: false, damage: 0, knockedBack: [] };
        let smudgeDamageMult = 1.0;
        let smudgeAccuracyMult = 1.0;
        if (this.player) {
            smudgeDamageMult = this.player.getSmudgePowerMultiplier();
            smudgeAccuracyMult = this.player.getSmudgeAccuracyPenalty();
        }
        let dashCancelMult = this.dashCancelBonus || 1.0;
        if (dashCancelMult > 1.0) {
            this.dashCancelBonus = 1.0; 
        }
        const combinedDamageMult = smudgeDamageMult * dashCancelMult;
        if (weapon.name === 'ERASER' && this.player) {
            const yaw = this.player.rotation.y;
            const recoilX = Math.sin(yaw) * 25;  
            const recoilZ = Math.cos(yaw) * 25;
            this.player.velocity.x += recoilX;
            this.player.velocity.z += recoilZ;
            this.player.velocity.y += 5;  
            if (this.player.applyRecoilTraversal) {
                this.player.applyRecoilTraversal(25 * 0.5, 5 * 0.5);
            }
        }
        if (weapon.cameraRecoilPitch && this.player) {
            this.player.rotation.x -= weapon.cameraRecoilPitch;
        }
        if (weapon.type === 'shotgun') {
            const pelletCount = weapon.pellets || 8;
            if (weapon.forceWave) {
                this.createForceWave();
            }
            for (let i = 0; i < pelletCount; i++) {
                const pelletResult = this.fireSingleShot(enemies, weapon, combinedDamageMult, smudgeAccuracyMult);
                if (pelletResult.hit) {
                    result.hit = true;
                    result.damage += pelletResult.damage;
                }
                if (pelletResult.killed) {
                    result.killed = true;
                }
            }
        } else {
            result = this.fireSingleShot(enemies, weapon, combinedDamageMult, smudgeAccuracyMult);
            if (weapon.spreadIncrease) {
                this.currentSpread = Math.min(
                    weapon.maxSpread || 0.2,
                    this.currentSpread + weapon.spreadIncrease
                );
            }
        }
        this.triggerMuzzleFlash();
        if (result.hit) {
            this.hitCombo++;
            this.hitComboTimer = 1.0;
            this.crosshairHitScale = 1.3;
            this.lastHitTime = performance.now();
        }
        return result;
    }
    fireSingleShot(enemies, weapon, damageMult = 1.0, accuracyMult = 1.0) {
        let result = { hit: false, killed: false, damage: 0 };
        const baseSpread = weapon.spread + (this.currentSpread || 0);
        const totalSpread = baseSpread * accuracyMult;
        const spreadX = (Math.random() - 0.5) * totalSpread * 2;
        const spreadY = (Math.random() - 0.5) * totalSpread * 2;
        const direction = new THREE.Vector3(spreadX, spreadY, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = weapon.range;
        const enemyMeshes = enemies
            .filter(e => e.isAlive)
            .map(e => e.mesh);
        const intersects = this.raycaster.intersectObjects(enemyMeshes, true);
        let hitPoint = null;
        let hitDistance = weapon.range;
        if (intersects.length > 0) {
            const hit = intersects[0];
            hitPoint = hit.point.clone();
            hitDistance = hit.distance;
            let hitEnemy = null;
            for (const enemy of enemies) {
                if (enemy.mesh === hit.object || enemy.mesh.children.includes(hit.object)) {
                    hitEnemy = enemy;
                    break;
                }
                let parent = hit.object.parent;
                while (parent) {
                    if (parent === enemy.mesh) {
                        hitEnemy = enemy;
                        break;
                    }
                    parent = parent.parent;
                }
                if (hitEnemy) break;
            }
            if (hitEnemy) {
                const wasAlive = hitEnemy.isAlive;
                let finalDamage = weapon.damage * damageMult;  
                if (weapon.falloffStart) {
                    const dist = hit.distance;
                    if (dist > weapon.falloffStart) {
                        const falloffRange = weapon.range - weapon.falloffStart;
                        const falloffDist = dist - weapon.falloffStart;
                        const falloffMult = 1 - (falloffDist / falloffRange);
                        finalDamage *= Math.max(0.1, falloffMult);
                    }
                }
                const hitHeight = hit.point.y - hitEnemy.position.y;
                const enemyHeight = hitEnemy.mesh.userData.height || 2;
                if (hitHeight > enemyHeight * 0.6) {
                    finalDamage *= weapon.headshotMultiplier || 1;
                }
                hitEnemy.takeDamage(finalDamage);
                result.hit = true;
                result.damage = finalDamage;
                this.applyElementalEffect(hitEnemy, weapon);
                if (weapon.knockback && weapon.knockback > 0) {
                    const knockDir = direction.clone();
                    knockDir.y = 0;
                    knockDir.normalize();
                    hitEnemy.applyKnockback(knockDir, weapon.knockback);
                }
                if (wasAlive && !hitEnemy.isAlive) {
                    result.killed = true;
                    result.killMethod = 'shot';
                }
                this.createImpact(hit.point, true, weapon.impactColor);
                this.createComicImpact(finalDamage, hitHeight > enemyHeight * 0.6, hitEnemy, hit.point);
            }
        } else {
            const sceneObjects = this.scene.children.filter(obj => 
                obj.userData.isArena || obj.userData.isObstacle
            );
            const worldHits = this.raycaster.intersectObjects(sceneObjects, true);
            if (worldHits.length > 0) {
                hitPoint = worldHits[0].point.clone();
                hitDistance = worldHits[0].distance;
                this.createImpact(worldHits[0].point, false, weapon.impactColor);
            }
        }
        if (hitPoint) {
            const stickyHit = this.checkStickyHit(hitPoint);
            if (stickyHit) {
                this.explodeSticky(stickyHit.sticky, enemies || [], true);
                if (stickyHit.isProjectile) {
                    this.stickyProjectiles.splice(stickyHit.index, 1);
                } else {
                    this.stickyExplosives.splice(stickyHit.index, 1);
                }
                result.hit = true;
            }
            this.createBulletTrail(this.camera.position.clone(), hitPoint, weapon.trailColor);
        } else {
            const endPoint = this.camera.position.clone().add(direction.multiplyScalar(weapon.range));
            this.createBulletTrail(this.camera.position.clone(), endPoint, weapon.trailColor);
        }
        return result;
    }
    applyElementalEffect(enemy, weapon) {
        if (weapon.element === 'freeze' && weapon.slowAmount) {
            if (!enemy.slowTimer || enemy.slowTimer <= 0) {
                enemy.originalSpeed = enemy.speed;
            }
            enemy.speed = enemy.originalSpeed * (1 - weapon.slowAmount);
            enemy.slowTimer = weapon.slowDuration;
            enemy.isSlowed = true;
            if (!enemy.freezeIndicator) {
                const freezeGeom = new THREE.RingGeometry(0.5, 0.6, 8);
                const freezeMat = new THREE.MeshBasicMaterial({ 
                    color: 0x88bbee, 
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.6
                });
                enemy.freezeIndicator = new THREE.Mesh(freezeGeom, freezeMat);
                enemy.freezeIndicator.rotation.x = -Math.PI / 2;
                enemy.mesh.add(enemy.freezeIndicator);
            }
            enemy.freezeIndicator.visible = true;
        }
    }
    createBulletTrail(start, end, color = 0x1a1a1a) {
        const shootOrigin = this.getShootOrigin();
        const points = [shootOrigin, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        const trail = new THREE.Line(geometry, material);
        trail.userData.lifetime = 0.08;
        this.bulletTrails.push(trail);
        this.scene.add(trail);
        if (this.bulletTrails.length > 30) {
            const old = this.bulletTrails.shift();
            this.scene.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }
    }
    createForceWave() {
        const waveGeom = new THREE.RingGeometry(0.3, 0.5, 16);
        const waveMat = new THREE.MeshBasicMaterial({
            color: 0x333333,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const wave = new THREE.Mesh(waveGeom, waveMat);
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        wave.position.copy(this.camera.position).add(forward.multiplyScalar(1.5));
        wave.lookAt(this.camera.position);
        wave.userData.lifetime = 0.2;
        wave.userData.startPos = wave.position.clone();
        wave.userData.direction = forward.clone();
        this.forceWaves.push(wave);
        this.scene.add(wave);
    }
    createImpact(position, isEnemy, color = 0x1a1a1a) {
        const size = isEnemy ? 0.2 : 0.12;
        const splatCount = isEnemy ? 3 : 2;
        for (let i = 0; i < splatCount; i++) {
            const geometry = new THREE.CircleGeometry(size * (0.7 + Math.random() * 0.6), 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: isEnemy ? 0x8B7355 : 0x1a1a1a,
                transparent: true,
                opacity: isEnemy ? 0.8 : 0.6,
                side: THREE.DoubleSide
            });
            const impact = new THREE.Mesh(geometry, material);
            impact.position.copy(position);
            impact.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15,
                (Math.random() - 0.5) * 0.15
            ));
            impact.userData.lifetime = isEnemy ? 0.5 : 3.0;
            impact.userData.isEnemyHit = isEnemy;
            this.impactMarkers.push(impact);
            this.scene.add(impact);
        }
        while (this.impactMarkers.length > 60) {
            const old = this.impactMarkers.shift();
            this.scene.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }
    }
    triggerMuzzleFlash() {
        const hud = document.getElementById('hud');
        const flash = document.createElement('div');
        flash.className = 'muzzle-flash';
        const weapon = this.currentWeapon;
        if (weapon.element === 'freeze') {
            flash.style.background = 'radial-gradient(circle, rgba(136,187,238,0.9) 0%, transparent 70%)';
        } else if (weapon.element === 'force') {
            flash.style.background = 'radial-gradient(circle, rgba(200,200,200,0.9) 0%, transparent 70%)';
        }
        hud.appendChild(flash);
        setTimeout(() => {
            flash.remove();
        }, 50);
        this.createWeaponDebris();
    }
    createWeaponDebris() {
        const container = document.getElementById('weapon-debris');
        if (!container) return;
        const weapon = this.currentWeapon;
        const centerX = window.innerWidth * 0.7;
        const centerY = window.innerHeight * 0.6;
        if (weapon.name === 'SKETCHER') {
            for (let i = 0; i < 3; i++) {
                const particle = document.createElement('div');
                particle.className = 'debris-particle pencil-shaving';
                const tx = (Math.random() - 0.5) * 150;
                const ty = Math.random() * 100 + 50;
                const rot = Math.random() * 720 - 360;
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');
                particle.style.setProperty('--rot', rot + 'deg');
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1200);
            }
        } else if (weapon.name === 'ERASER') {
            for (let i = 0; i < 5; i++) {
                const particle = document.createElement('div');
                particle.className = 'debris-particle eraser-dust';
                const tx = (Math.random() - 0.5) * 200;
                const ty = (Math.random() - 0.5) * 150;
                particle.style.left = centerX + 'px';
                particle.style.top = centerY + 'px';
                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');
                container.appendChild(particle);
                setTimeout(() => particle.remove(), 1500);
            }
        }
    }
    createComicImpact(damage, isCritical, enemy, hitPoint) {
        if (!enemy || !enemy.mesh) return;
        const container = document.getElementById('impact-marks');
        if (!container) return;
        const mark = document.createElement('div');
        mark.className = 'impact-mark-3d';
        const words = ['POW!', 'BAM!', 'WHAM!', 'ZAP!'];
        const critWords = ['CRIT!', 'HEADSHOT!'];
        if (isCritical) {
            mark.textContent = critWords[Math.floor(Math.random() * critWords.length)];
            mark.classList.add('critical');
        } else if (damage > 50) {
            mark.textContent = words[Math.floor(Math.random() * words.length)];
        } else {
            const smallWords = ['Pop!', 'Bop!', 'Hit!'];
            mark.textContent = smallWords[Math.floor(Math.random() * smallWords.length)];
        }
        mark.userData = {
            worldPos: (hitPoint || enemy.position).clone(),
            velocity: new THREE.Vector3(0, 2, 0),
            lifetime: 1.0,
            startTime: performance.now()
        };
        container.appendChild(mark);
        this.impactMarkers.push(mark);
    }
    clearEffects() {
        for (const impact of this.impactMarkers) {
            if (impact.tagName === 'DIV') {
                impact.remove();
            } else {
                this.scene.remove(impact);
                if (impact.geometry) impact.geometry.dispose();
                if (impact.material) impact.material.dispose();
            }
        }
        this.impactMarkers = [];
        for (const trail of this.bulletTrails) {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }
        this.bulletTrails = [];
        for (const wave of this.forceWaves) {
            this.scene.remove(wave);
            wave.geometry.dispose();
            wave.material.dispose();
        }
        this.forceWaves = [];
    }
    update(dt, enemies) {
        for (let i = this.bulletTrails.length - 1; i >= 0; i--) {
            const trail = this.bulletTrails[i];
            trail.userData.lifetime -= dt;
            trail.material.opacity = trail.userData.lifetime / 0.08;
            if (trail.userData.lifetime <= 0) {
                this.scene.remove(trail);
                trail.geometry.dispose();
                trail.material.dispose();
                this.bulletTrails.splice(i, 1);
            }
        }
        for (let i = this.forceWaves.length - 1; i >= 0; i--) {
            const wave = this.forceWaves[i];
            wave.userData.lifetime -= dt;
            const progress = 1 - wave.userData.lifetime / 0.2;
            wave.scale.setScalar(1 + progress * 3);
            wave.material.opacity = 0.7 * (1 - progress);
            wave.position.copy(wave.userData.startPos).add(
                wave.userData.direction.clone().multiplyScalar(progress * 5)
            );
            if (wave.userData.lifetime <= 0) {
                this.scene.remove(wave);
                wave.geometry.dispose();
                wave.material.dispose();
                this.forceWaves.splice(i, 1);
            }
        }
        for (let i = this.impactMarkers.length - 1; i >= 0; i--) {
            const impact = this.impactMarkers[i];
            if (impact.tagName === 'DIV') {
                impact.userData.lifetime -= dt;
                impact.userData.worldPos.y += impact.userData.velocity.y * dt;
                const screenPos = impact.userData.worldPos.clone();
                screenPos.project(this.camera);
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
                impact.style.left = x + 'px';
                impact.style.top = y + 'px';
                if (impact.userData.lifetime < 0.5) {
                    impact.style.opacity = impact.userData.lifetime / 0.5;
                }
                if (impact.userData.lifetime <= 0 || screenPos.z > 1) {
                    impact.remove();
                    this.impactMarkers.splice(i, 1);
                }
            } else {
                impact.userData.lifetime -= 0.016;
                if (impact.userData.isExplosion && impact.userData.maxScale) {
                    const progress = 1 - impact.userData.lifetime / 0.3;
                    const scale = progress * impact.userData.maxScale;
                    impact.scale.setScalar(scale);
                    impact.material.opacity = 0.9 * (1 - progress);
                }
                if (impact.userData.lifetime <= 0) {
                    this.scene.remove(impact);
                    impact.geometry.dispose();
                    impact.material.dispose();
                    this.impactMarkers.splice(i, 1);
                } else if (impact.userData.lifetime < 0.5 && !impact.userData.isExplosion) {
                    impact.material.opacity = impact.userData.lifetime * 2;
                }
            }
        }
        for (const enemy of enemies) {
            if (enemy.slowTimer && enemy.slowTimer > 0) {
                enemy.slowTimer -= dt;
                if (enemy.freezeIndicator) {
                    enemy.freezeIndicator.rotation.z += dt * 2;
                }
                if (enemy.slowTimer <= 0 && enemy.originalSpeed) {
                    enemy.speed = enemy.originalSpeed;
                    enemy.isSlowed = false;
                    if (enemy.freezeIndicator) {
                        enemy.freezeIndicator.visible = false;
                    }
                }
            }
        }
    }
    getAmmoDisplay() {
        const weapon = this.currentWeapon;
        if (weapon.ammo === Infinity) {
            return '∞';
        }
        if (this.isReloading) {
            if (weapon.reloadPerShell) {
                return `${weapon.ammo}+`;
            }
            return 'RELOAD';
        }
        return `${weapon.ammo}/${weapon.maxAmmo}`;
    }
    getCurrentWeaponName() {
        return this.currentWeapon.name;
    }
    getCrosshairStyle() {
        if (this.isReloading && !this.currentWeapon.reloadPerShell) {
            return '○';
        }
        return this.currentWeapon.crosshair;
    }
    getCrosshairScale() {
        return this.crosshairHitScale + this.crosshairPulse;
    }
    getScreenShake() {
        return this.screenShake;
    }
    getHitCombo() {
        return this.hitCombo;
    }
    fireSpecialPierceBeam() {
        const weapon = this.currentWeapon;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        const beamGeom = new THREE.CylinderGeometry(0.1, 0.1, weapon.specialRange, 8);
        const beamMat = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, 
            transparent: true, 
            opacity: 0.8 
        });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.copy(this.camera.position);
        beam.position.add(direction.clone().multiplyScalar(weapon.specialRange / 2));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        beam.userData.lifetime = 0.15;
        this.scene.add(beam);
        this.impactMarkers.push(beam);
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = weapon.specialRange;
        const enemies = this.scene.children.filter(obj => obj.userData.isEnemy);
        const intersects = this.raycaster.intersectObjects(enemies, true);
        const hitEnemies = new Set();
        for (const hit of intersects) {
            let enemy = hit.object.userData.enemy;
            if (!enemy) {
                let parent = hit.object.parent;
                while (parent && !enemy) {
                    enemy = parent.userData.enemy;
                    parent = parent.parent;
                }
            }
            if (enemy && !hitEnemies.has(enemy)) {
                hitEnemies.add(enemy);
                enemy.takeDamage(weapon.specialDamage);
                this.createImpact(hit.point, true, 0xffff00);
                this.createComicImpact(weapon.specialDamage, false, enemy, hit.point);
            }
        }
        this.screenShake = 0.15;
        this.specialChargeTimer = 0;
    }
    fireExplosivePellet(enemies) {
        const weapon = this.currentWeapon;
        let result = { hit: false, killed: false, damage: 0 };
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = weapon.specialRange;
        if (this.player) {
            const yaw = this.player.rotation.y;
            const recoilX = Math.sin(yaw) * 40;
            const recoilZ = Math.cos(yaw) * 40;
            this.player.velocity.x += recoilX;
            this.player.velocity.z += recoilZ;
            this.player.velocity.y += 8;
        }
        const allObjects = this.scene.children.filter(obj => 
            obj.userData.isArena || obj.userData.isEnemy
        );
        const intersects = this.raycaster.intersectObjects(allObjects, true);
        let explosionPoint;
        if (intersects.length > 0) {
            explosionPoint = intersects[0].point.clone();
        } else {
            explosionPoint = this.camera.position.clone().add(
                direction.multiplyScalar(weapon.specialRange)
            );
        }
        const explosionGeom = new THREE.SphereGeometry(weapon.specialExplosionRadius, 16, 12);
        const explosionMat = new THREE.MeshBasicMaterial({ 
            color: 0xff6600, 
            transparent: true, 
            opacity: 0.7 
        });
        const explosion = new THREE.Mesh(explosionGeom, explosionMat);
        explosion.position.copy(explosionPoint);
        explosion.userData.lifetime = 0.2;
        explosion.userData.maxScale = weapon.specialExplosionRadius;
        this.scene.add(explosion);
        this.impactMarkers.push(explosion);
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const dist = enemy.position.distanceTo(explosionPoint);
            if (dist <= weapon.specialExplosionRadius) {
                const damageMult = 1 - (dist / weapon.specialExplosionRadius);
                const damage = weapon.specialDamage * damageMult;
                enemy.takeDamage(damage);
                result.hit = true;
                result.damage += damage;
                const knockDir = enemy.position.clone().sub(explosionPoint).normalize();
                enemy.applyKnockback(knockDir, weapon.specialKnockback * damageMult);
                this.createComicImpact(damage, false, enemy, enemy.position);
            }
        }
        if (weapon.ammo !== Infinity) {
            weapon.ammo--;
        }
        this.screenShake = 0.25;
        return result;
    }
    fireRicochetBeam() {
        const weapon = this.currentWeapon;
        const enemies = this.currentEnemies || [];
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        let currentPos = this.camera.position.clone();
        let currentDir = direction.clone();
        let bounces = 0;
        const maxBounces = weapon.ricochetCount || 3;
        const hitEnemies = new Set();
        const hitStickies = [];
        const trailPoints = [currentPos.clone()];
        while (bounces < maxBounces) {
            this.raycaster.set(currentPos, currentDir);
            this.raycaster.far = weapon.specialRange;
            const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
            const arenaObjects = this.scene.children.filter(obj => 
                obj.userData.isArena || obj.userData.isObstacle
            );
            const allTargets = [...enemyMeshes, ...arenaObjects];
            const intersects = this.raycaster.intersectObjects(allTargets, true);
            if (intersects.length === 0) {
                const endPoint = currentPos.clone().add(currentDir.multiplyScalar(weapon.specialRange));
                trailPoints.push(endPoint);
                break;
            }
            const hit = intersects[0];
            trailPoints.push(hit.point.clone());
            const stickyCheck = this.checkStickyHit(hit.point);
            if (stickyCheck && !hitStickies.includes(stickyCheck.sticky)) {
                hitStickies.push(stickyCheck.sticky);
            }
            let hitEnemy = null;
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;
                if (enemy.mesh === hit.object || enemy.mesh.children.includes(hit.object)) {
                    hitEnemy = enemy;
                    break;
                }
                let parent = hit.object.parent;
                while (parent) {
                    if (parent === enemy.mesh) {
                        hitEnemy = enemy;
                        break;
                    }
                    parent = parent.parent;
                }
                if (hitEnemy) break;
            }
            if (hitEnemy && !hitEnemies.has(hitEnemy)) {
                hitEnemies.add(hitEnemy);
                hitEnemy.takeDamage(weapon.specialDamage);
                this.createImpact(hit.point, true, 0xffcc00);
                this.createComicImpact(weapon.specialDamage, false, hitEnemy, hit.point);
                this.hitCombo++;
                this.hitComboTimer = 1.5;
            }
            if (hit.face) {
                const normal = hit.face.normal.clone();
                const hitObj = hit.object;
                if (hitObj.matrixWorld) {
                    normal.transformDirection(hitObj.matrixWorld);
                }
                currentDir.reflect(normal);
            } else {
                currentDir.negate();
            }
            currentPos = hit.point.clone().add(currentDir.clone().multiplyScalar(0.1));
            bounces++;
            this.createImpact(hit.point, false, 0xffcc00);
        }
        for (let i = 0; i < trailPoints.length - 1; i++) {
            const alpha = 1 - (i / trailPoints.length) * 0.3;
            this.createBeamTrail(trailPoints[i], trailPoints[i + 1], alpha, weapon.beamWidth || 0.8);
        }
        for (const stickyData of hitStickies) {
            if (stickyData.isProjectile) {
                const idx = this.stickyProjectiles.indexOf(stickyData.sticky);
                if (idx !== -1) this.stickyProjectiles.splice(idx, 1);
            } else {
                const idx = this.stickyExplosives.indexOf(stickyData.sticky);
                if (idx !== -1) this.stickyExplosives.splice(idx, 1);
            }
            this.explodeSticky(stickyData.sticky, [], true, true);
        }
        this.screenShake = 0.18;
        this.specialChargeTimer = 0;
    }
    createBeamTrail(start, end, alpha = 1.0, width = 0.8) {
        const distance = start.distanceTo(end);
        const geometry = new THREE.CylinderGeometry(width * 0.5, width * 0.5, distance, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffcc00,
            transparent: true,
            opacity: alpha * 0.8
        });
        const beam = new THREE.Mesh(geometry, material);
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        beam.position.copy(midpoint);
        const direction = new THREE.Vector3().subVectors(end, start);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        beam.userData.lifetime = 0.3;
        this.bulletTrails.push(beam);
        this.scene.add(beam);
    }
    updateStickyExplosives(dt, enemies) {
        for (let i = this.stickyProjectiles.length - 1; i >= 0; i--) {
            const sticky = this.stickyProjectiles[i];
            if (!sticky.userData.stuck) {
                sticky.userData.velocity.y -= 35 * dt;
                const newPos = sticky.position.clone().add(sticky.userData.velocity.clone().multiplyScalar(dt));
                this.raycaster.set(sticky.position, sticky.userData.velocity.clone().normalize());
                this.raycaster.far = sticky.userData.velocity.length() * dt;
                const allTargets = [];
                allTargets.push(...this.scene.children.filter(obj => obj.userData.isArena || obj.userData.isObstacle));
                allTargets.push(...enemies.filter(e => e.isAlive).map(e => e.mesh));
                const intersects = this.raycaster.intersectObjects(allTargets, true);
                if (intersects.length > 0) {
                    sticky.position.copy(intersects[0].point);
                    sticky.userData.stuck = true;
                    let hitEnemy = null;
                    for (const enemy of enemies) {
                        if (enemy.mesh === intersects[0].object || enemy.mesh.children.includes(intersects[0].object)) {
                            hitEnemy = enemy;
                            break;
                        }
                        let parent = intersects[0].object.parent;
                        while (parent) {
                            if (parent === enemy.mesh) {
                                hitEnemy = enemy;
                                break;
                            }
                            parent = parent.parent;
                        }
                        if (hitEnemy) break;
                    }
                    if (hitEnemy && hitEnemy.isAlive) {
                        sticky.userData.attachedEnemy = hitEnemy;
                        hitEnemy.mesh.add(sticky);
                        const offset = sticky.position.clone().sub(hitEnemy.position);
                        sticky.userData.enemyOffset = offset;
                    }
                    this.stickyExplosives.push(sticky);
                    this.stickyProjectiles.splice(i, 1);
                } else {
                    sticky.position.copy(newPos);
                    if (sticky.position.y < -10) {
                        if (sticky.userData.timerElement) {
                            sticky.userData.timerElement.remove();
                        }
                        this.scene.remove(sticky);
                        sticky.geometry.dispose();
                        sticky.material.dispose();
                        this.stickyProjectiles.splice(i, 1);
                    }
                }
            }
        }
        for (let i = this.stickyExplosives.length - 1; i >= 0; i--) {
            const sticky = this.stickyExplosives[i];
            if (sticky.userData.attachedEnemy && !sticky.userData.attachedEnemy.isAlive) {
                sticky.userData.attachedEnemy = null;
                sticky.parent.remove(sticky);
                this.scene.add(sticky);
            }
            sticky.userData.fuseTime -= dt;
            const timeLeft = Math.max(0, sticky.userData.fuseTime).toFixed(1);
            if (sticky.userData.timerElement) {
                sticky.userData.timerElement.textContent = timeLeft;
                const worldPos = sticky.userData.attachedEnemy ? 
                    sticky.userData.attachedEnemy.position.clone().add(sticky.userData.enemyOffset || new THREE.Vector3()) :
                    sticky.position.clone();
                const screenPos = worldPos.clone();
                screenPos.project(this.camera);
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
                sticky.userData.timerElement.style.left = (x - 15) + 'px';
                sticky.userData.timerElement.style.top = (y - 30) + 'px';
                if (screenPos.z > 1) {
                    sticky.userData.timerElement.style.display = 'none';
                } else {
                    sticky.userData.timerElement.style.display = 'block';
                }
            }
            const pulse = Math.sin(performance.now() * 0.01) * 0.1 + 1;
            sticky.scale.setScalar(pulse);
            if (sticky.userData.fuseTime <= 2) {
                sticky.material.color.setHex(sticky.userData.fuseTime <= 1 ? 0xff0000 : 0xff3300);
            }
            if (sticky.userData.fuseTime <= 0) {
                this.explodeSticky(sticky, enemies, false);
                this.stickyExplosives.splice(i, 1);
            }
        }
    }
    explodeSticky(sticky, enemies, shotTriggered = false, beamTriggered = false) {
        let explosionPos;
        if (sticky.userData.attachedEnemy && sticky.userData.attachedEnemy.isAlive) {
            explosionPos = sticky.userData.attachedEnemy.position.clone();
            if (sticky.userData.enemyOffset) {
                explosionPos.add(sticky.userData.enemyOffset);
            }
            sticky.parent.remove(sticky);
        } else {
            explosionPos = sticky.position.clone();
        }
        const baseDamage = sticky.userData.damage;
        const radius = sticky.userData.radius;
        let finalDamage = shotTriggered ? baseDamage * 1.5 : baseDamage;
        let finalRadius = shotTriggered ? radius * 1.3 : radius;
        if (beamTriggered) {
            finalDamage *= 2.0;
            finalRadius *= 2.5;
        }
        const explosionGeom = new THREE.SphereGeometry(0.1, 16, 12);
        const explosionMat = new THREE.MeshBasicMaterial({ 
            color: beamTriggered ? 0xffaa00 : 0xff4400, 
            transparent: true, 
            opacity: 0.9 
        });
        const explosion = new THREE.Mesh(explosionGeom, explosionMat);
        explosion.position.copy(explosionPos);
        explosion.userData.lifetime = 0.3;
        explosion.userData.maxScale = finalRadius;
        explosion.userData.isExplosion = true;
        this.scene.add(explosion);
        this.impactMarkers.push(explosion);
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const wasAlive = enemy.isAlive;
            const dist = enemy.position.distanceTo(explosionPos);
            if (dist <= finalRadius) {
                const damageMult = 1 - (dist / finalRadius) * 0.5;
                const damage = finalDamage * damageMult;
                enemy.takeDamage(damage);
                const knockDir = enemy.position.clone().sub(explosionPos).normalize();
                enemy.applyKnockback(knockDir, 20 * damageMult);
                this.createComicImpact(damage, false, enemy, enemy.position);
                if (wasAlive && !enemy.isAlive) {
                    this.lastKillMethod = beamTriggered ? 'beam' : 'sticky';
                }
            }
        }
        if (sticky.userData.timerElement) {
            sticky.userData.timerElement.remove();
        }
        this.scene.remove(sticky);
        if (sticky.geometry) sticky.geometry.dispose();
        if (sticky.material) sticky.material.dispose();
        this.screenShake = beamTriggered ? 0.5 : 0.3;
    }
    checkStickyHit(hitPoint) {
        for (let i = this.stickyExplosives.length - 1; i >= 0; i--) {
            const sticky = this.stickyExplosives[i];
            const stickyWorldPos = sticky.userData.attachedEnemy ?
                sticky.userData.attachedEnemy.position.clone().add(sticky.userData.enemyOffset || new THREE.Vector3()) :
                sticky.position.clone();
            const dist = stickyWorldPos.distanceTo(hitPoint);
            if (dist < 1.5) {
                return { sticky, index: i };
            }
        }
        for (let i = this.stickyProjectiles.length - 1; i >= 0; i--) {
            const sticky = this.stickyProjectiles[i];
            const dist = sticky.position.distanceTo(hitPoint);
            if (dist < 1.5) {
                return { sticky, index: i, isProjectile: true };
            }
        }
        return null;
    }
    getStickyChargePercent() {
        return Math.min(1, this.stickyChargeTimer / this.stickyMaxCharge) * 100;
    }
}