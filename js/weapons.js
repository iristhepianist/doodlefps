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
                specialDamage: 150,
                specialRange: 500,
                beamWidth: 0.5,
                chainLightningSpeed: 60,
                chainLightningMaxTargets: 10,
                chainLightningSearchRadius: 25,
                qAbility: 'fan-fire',
                qCooldown: 7.0,
                qFanTargets: 6,
                qFanDamage: 80
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
                crosshair: '+',
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
                qAbility: 'auto-turret',
                qCooldown: 35.0,
                qTurretSetupTime: 30.0,
                qTurretHealth: 100,
                qTurretDamage: 100,
                qTurretFireRate: 2,
                qTurretRange: 60,
                qTurretProjectileSpeed: 25
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
                console.log('[OK] Sketcher (pencil) model loaded successfully!');
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading Sketcher model: ${percent}%`);
                }
            },
            (error) => {
                console.error('[ERROR] Could not load Sketcher model:', error);
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
                if (weapon.name === 'SKETCHER') {
                    this.fireChainLightning();
                } else {
                    this.fireRicochetBeam();
                }
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
            case 'fan-fire':
                this.fanFire();
                break;
            case 'sticky-bomb':
                this.deployStickyExplosive();
                break;
            case 'auto-turret':
                this.deployAutoTurret();
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
    fanFire() {
        const weapon = this.currentWeapon;
        const enemies = this.currentEnemies || [];
        const visibleEnemies = [];
        
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const toEnemy = new THREE.Vector3().subVectors(enemy.position, this.camera.position);
            const distance = toEnemy.length();
            if (distance > weapon.range) continue;
            
            toEnemy.normalize();
            const cameraDir = new THREE.Vector3(0, 0, -1);
            cameraDir.applyQuaternion(this.camera.quaternion);
            const angle = Math.acos(cameraDir.dot(toEnemy));
            
            if (angle < Math.PI / 3) {
                visibleEnemies.push({ enemy, distance });
            }
        }
        
        visibleEnemies.sort((a, b) => a.distance - b.distance);
        const targets = visibleEnemies.slice(0, weapon.qFanTargets);
        
        for (let i = 0; i < targets.length; i++) {
            setTimeout(() => {
                const target = targets[i].enemy;
                if (target.isAlive) {
                    target.takeDamage(weapon.qFanDamage);
                    this.createBulletTrail(this.camera.position.clone(), target.position, weapon.trailColor);
                    this.createImpact(target.position, true, weapon.impactColor);
                    this.createComicImpact(weapon.qFanDamage, false, target, target.position);
                }
            }, i * 80);
        }
        
        this.screenShake = 0.2;
    }
    deployAutoTurret() {
        const weapon = this.currentWeapon;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = 15;
        
        const arenaObjects = this.scene.children.filter(obj => obj.userData.isArena);
        const intersects = this.raycaster.intersectObjects(arenaObjects, true);
        
        let placePos;
        if (intersects.length > 0) {
            placePos = intersects[0].point.clone();
        } else {
            placePos = this.camera.position.clone().add(direction.multiplyScalar(10));
            placePos.y = 0.5;
        }
        
        const zoneRadius = 3;
        const zoneGeom = new THREE.CircleGeometry(zoneRadius, 32);
        const zoneMat = new THREE.MeshBasicMaterial({ 
            color: 0x4488cc,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const zone = new THREE.Mesh(zoneGeom, zoneMat);
        zone.position.copy(placePos);
        zone.position.y = 0.05;
        zone.rotation.x = -Math.PI / 2;
        
        const ringGeom = new THREE.RingGeometry(zoneRadius * 0.9, zoneRadius * 1.1, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.copy(placePos);
        ring.position.y = 0.1;
        ring.rotation.x = -Math.PI / 2;
        
        const timerDiv = document.createElement('div');
        timerDiv.className = 'turret-timer';
        timerDiv.style.cssText = 'position:absolute;color:#4488cc;font-size:24px;font-weight:bold;pointer-events:none;text-shadow:2px 2px 0 #000;';
        timerDiv.textContent = '30.0';
        document.getElementById('hud').appendChild(timerDiv);
        
        this.scene.add(zone);
        this.scene.add(ring);
        
        if (!this.turretSetup) {
            this.turretSetup = {
                zone: zone,
                ring: ring,
                position: placePos,
                radius: zoneRadius,
                timer: weapon.qTurretSetupTime,
                maxTime: weapon.qTurretSetupTime,
                timerElement: timerDiv,
                weapon: weapon
            };
        }
        
        this.screenShake = 0.06;
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
        this.updateTurrets(dt, enemies);
        this.updateTurretSetup(dt);
        this.updateChainLightning(dt, enemies);
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
                    const soundElement = window.game.sounds[soundName];
                    if (soundElement) {
                        try {
                            const sound = soundElement.cloneNode();
                            sound.volume = soundElement.volume || 0.7;
                            sound.play().catch(e => {
                                console.warn(`Sound play failed for ${soundName}:`, e);
                                soundElement.currentTime = 0;
                                soundElement.play().catch(() => {});
                            });
                        } catch(e) {
                            console.warn(`Sound clone failed for ${soundName}:`, e);
                            try {
                                soundElement.currentTime = 0;
                                soundElement.play().catch(err => console.warn('Fallback play failed:', err));
                            } catch(err) {
                                console.error('All sound playback methods failed:', err);
                            }
                        }
                    } else {
                        console.warn(`Sound not found: ${soundName}`);
                    }
                }
                if (weapon.ammo !== Infinity && !(window.game && window.game.infiniteAmmo)) {
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
            
            if (weapon.name === 'ERASER' && window.game && window.game.enemyManager) {
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(this.camera.quaternion);
                direction.normalize();
                const parried = window.game.enemyManager.checkParry(
                    this.camera.position, 
                    2.0, 
                    false, 
                    true, 
                    direction
                );
                if (parried && this.player) {
                    this.player.health = this.player.maxHealth;
                }
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
        if (this.bulletTrails.length > 15) {
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
            const geometry = new THREE.CircleGeometry(size * (0.7 + Math.random() * 0.6), 6); // Reduced from 8 to 6 segments
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
        // Limit impact markers more aggressively for performance
        while (this.impactMarkers.length > 25) {
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
                impact.userData.lifetime -= dt;
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
            return 'INF';
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
            return 'O';
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
        const maxBounces = weapon.ricochetCount || 10;
        const hitEnemies = new Set();
        const hitStickies = [];
        const trailPoints = [currentPos.clone()];
        const autoAim = weapon.ricochetAutoAim || false;
        const searchRadius = weapon.ricochetSearchRadius || 30;
        
        while (bounces < maxBounces && hitEnemies.size < maxBounces) {
            this.raycaster.set(currentPos, currentDir);
            this.raycaster.far = weapon.specialRange;
            const enemyMeshes = enemies.filter(e => e.isAlive && !hitEnemies.has(e)).map(e => e.mesh);
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
                
                // Auto-aim to next nearest enemy if enabled
                if (autoAim && hitEnemies.size < maxBounces) {
                    let nearestEnemy = null;
                    let nearestDist = searchRadius;
                    for (const enemy of enemies) {
                        if (!enemy.isAlive || hitEnemies.has(enemy)) continue;
                        const dist = hit.point.distanceTo(enemy.position);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestEnemy = enemy;
                        }
                    }
                    if (nearestEnemy) {
                        currentDir = new THREE.Vector3().subVectors(nearestEnemy.position, hit.point).normalize();
                        currentPos = hit.point.clone().add(currentDir.clone().multiplyScalar(0.1));
                        bounces++;
                        this.createImpact(hit.point, false, 0xffcc00);
                        continue;
                    }
                }
            }
            
            // Regular bounce off walls
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
    fireChainLightning() {
        const weapon = this.currentWeapon;
        const enemies = this.currentEnemies || [];
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();
        
        this.raycaster.set(this.camera.position, direction);
        this.raycaster.far = weapon.specialRange;
        const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
        const intersects = this.raycaster.intersectObjects(enemyMeshes, true);
        
        let firstTarget = null;
        for (const hit of intersects) {
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;
                if (enemy.mesh === hit.object || enemy.mesh.children.includes(hit.object)) {
                    firstTarget = enemy;
                    break;
                }
                let parent = hit.object.parent;
                while (parent) {
                    if (parent === enemy.mesh) {
                        firstTarget = enemy;
                        break;
                    }
                    parent = parent.parent;
                }
                if (firstTarget) break;
            }
            if (firstTarget) break;
        }
        
        if (firstTarget) {
            const lightningGeom = new THREE.SphereGeometry(0.3, 8, 6);
            const lightningMat = new THREE.MeshBasicMaterial({ 
                color: 0xffee00,
                transparent: true,
                opacity: 0.9
            });
            const lightning = new THREE.Mesh(lightningGeom, lightningMat);
            lightning.position.copy(this.camera.position);
            
            lightning.userData.isChainLightning = true;
            lightning.userData.velocity = direction.clone().multiplyScalar(weapon.chainLightningSpeed);
            lightning.userData.damage = weapon.specialDamage;
            lightning.userData.maxTargets = weapon.chainLightningMaxTargets;
            lightning.userData.searchRadius = weapon.chainLightningSearchRadius;
            lightning.userData.hitEnemies = new Set();
            lightning.userData.currentTarget = firstTarget;
            lightning.userData.trailPoints = [lightning.position.clone()];
            
            if (!this.chainLightningProjectiles) this.chainLightningProjectiles = [];
            this.chainLightningProjectiles.push(lightning);
            this.scene.add(lightning);
        }
        
        this.screenShake = 0.18;
        this.specialChargeTimer = 0;
    }
    updateChainLightning(dt, enemies) {
        if (!this.chainLightningProjectiles) this.chainLightningProjectiles = [];
        
        for (let i = this.chainLightningProjectiles.length - 1; i >= 0; i--) {
            const lightning = this.chainLightningProjectiles[i];
            
            if (lightning.userData.currentTarget && lightning.userData.currentTarget.isAlive) {
                const toTarget = new THREE.Vector3().subVectors(
                    lightning.userData.currentTarget.position,
                    lightning.position
                );
                const dist = toTarget.length();
                
                if (dist < 2) {
                    if (!lightning.userData.hitEnemies.has(lightning.userData.currentTarget)) {
                        lightning.userData.hitEnemies.add(lightning.userData.currentTarget);
                        lightning.userData.currentTarget.takeDamage(lightning.userData.damage);
                        this.createImpact(lightning.userData.currentTarget.position, true, 0xffee00);
                        this.createComicImpact(lightning.userData.damage, false, lightning.userData.currentTarget, lightning.userData.currentTarget.position);
                        this.hitCombo++;
                        this.hitComboTimer = 1.5;
                    }
                    
                    if (lightning.userData.hitEnemies.size >= lightning.userData.maxTargets) {
                        this.scene.remove(lightning);
                        this.chainLightningProjectiles.splice(i, 1);
                        continue;
                    }
                    
                    let nextTarget = null;
                    let nearestDist = lightning.userData.searchRadius;
                    for (const enemy of enemies) {
                        if (!enemy.isAlive || lightning.userData.hitEnemies.has(enemy)) continue;
                        const enemyDist = enemy.position.distanceTo(lightning.userData.currentTarget.position);
                        if (enemyDist < nearestDist) {
                            nearestDist = enemyDist;
                            nextTarget = enemy;
                        }
                    }
                    
                    if (nextTarget) {
                        lightning.userData.currentTarget = nextTarget;
                        lightning.position.copy(lightning.userData.currentTarget.position);
                    } else {
                        this.scene.remove(lightning);
                        this.chainLightningProjectiles.splice(i, 1);
                        continue;
                    }
                } else {
                    toTarget.normalize().multiplyScalar(lightning.userData.velocity.length());
                    lightning.userData.velocity.copy(toTarget);
                }
            }
            
            lightning.position.add(lightning.userData.velocity.clone().multiplyScalar(dt));
            lightning.rotation.x += dt * 20;
            lightning.rotation.y += dt * 15;
        }
    }
    updateTurrets(dt, enemies) {
        if (!this.turrets) this.turrets = [];
        if (!this.turretProjectiles) this.turretProjectiles = [];
        
        // Accumulate time for less frequent target searching
        this.turretSearchAccumulator = (this.turretSearchAccumulator || 0) + dt;
        const shouldSearchTargets = this.turretSearchAccumulator >= 0.1; // Search for targets every 0.1s instead of every frame
        if (shouldSearchTargets) this.turretSearchAccumulator = 0;
        
        for (let i = this.turrets.length - 1; i >= 0; i--) {
            const turret = this.turrets[i];
            turret.userData.fireTimer -= dt;
            
            if (turret.userData.health <= 0) {
                this.scene.remove(turret);
                this.turrets.splice(i, 1);
                continue;
            }
            
            // Only search for targets periodically instead of every frame
            if (shouldSearchTargets) {
                let nearestEnemy = null;
                let nearestDist = turret.userData.range;
                for (const enemy of enemies) {
                    if (!enemy.isAlive) continue;
                    const dist = enemy.position.distanceTo(turret.position);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = enemy;
                    }
                }
                turret.userData.currentTarget = nearestEnemy;
            }
            
            const nearestEnemy = turret.userData.currentTarget;
            if (nearestEnemy && nearestEnemy.isAlive) {
                const toEnemy = new THREE.Vector3().subVectors(nearestEnemy.position, turret.position);
                const angle = Math.atan2(toEnemy.x, toEnemy.z);
                turret.userData.head.rotation.y = angle;
                
                if (turret.userData.fireTimer <= 0) {
                    turret.userData.fireTimer = 1 / turret.userData.fireRate;
                    
                    const projectileGeom = new THREE.SphereGeometry(0.3, 8, 6);
                    const projectileMat = new THREE.MeshBasicMaterial({ color: 0x6699cc });
                    const projectile = new THREE.Mesh(projectileGeom, projectileMat);
                    projectile.position.copy(turret.position);
                    projectile.position.y += 1.8;
                    
                    const dir = toEnemy.clone().normalize();
                    projectile.userData.velocity = dir.multiplyScalar(turret.userData.projectileSpeed);
                    projectile.userData.target = nearestEnemy;
                    projectile.userData.damage = turret.userData.damage;
                    projectile.userData.lifetime = 5.0;
                    
                    this.turretProjectiles.push(projectile);
                    this.scene.add(projectile);
                }
            }
            
            turret.rotation.y += dt * 0.5;
        }
        
        for (let i = this.turretProjectiles.length - 1; i >= 0; i--) {
            const proj = this.turretProjectiles[i];
            proj.userData.lifetime -= dt;
            
            if (proj.userData.lifetime <= 0) {
                this.scene.remove(proj);
                this.turretProjectiles.splice(i, 1);
                continue;
            }
            
            if (proj.userData.target && proj.userData.target.isAlive) {
                const toTarget = new THREE.Vector3().subVectors(proj.userData.target.position, proj.position);
                const dist = toTarget.length();
                
                if (dist < 1) {
                    proj.userData.target.takeDamage(proj.userData.damage);
                    this.createImpact(proj.userData.target.position, true, 0x88bbee);
                    this.createComicImpact(proj.userData.damage, false, proj.userData.target, proj.userData.target.position);
                    this.scene.remove(proj);
                    this.turretProjectiles.splice(i, 1);
                    continue;
                }
                
                const homingStrength = 15;
                toTarget.normalize().multiplyScalar(homingStrength);
                proj.userData.velocity.add(toTarget.multiplyScalar(dt));
                proj.userData.velocity.clampLength(0, 30);
            }
            
            proj.position.add(proj.userData.velocity.clone().multiplyScalar(dt));
            proj.rotation.x += dt * 10;
            proj.rotation.y += dt * 8;
        }
    }
    updateTurretSetup(dt) {
        if (!this.turretSetup) return;
        
        const playerPos = this.camera.position.clone();
        const dist = playerPos.distanceTo(this.turretSetup.position);
        
        if (dist <= this.turretSetup.radius) {
            this.turretSetup.timer -= dt;
            
            const timeLeft = Math.max(0, this.turretSetup.timer);
            this.turretSetup.timerElement.textContent = timeLeft.toFixed(1);
            
            const screenPos = this.turretSetup.position.clone();
            screenPos.y += 3;
            screenPos.project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
            this.turretSetup.timerElement.style.left = x + 'px';
            this.turretSetup.timerElement.style.top = y + 'px';
            
            const progress = 1 - (this.turretSetup.timer / this.turretSetup.maxTime);
            this.turretSetup.ring.rotation.z += dt * (1 + progress * 3);
            
            if (this.turretSetup.timer <= 0) {
                this.completeTurretSetup();
            }
        } else {
            const screenPos = this.turretSetup.position.clone();
            screenPos.y += 3;
            screenPos.project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
            this.turretSetup.timerElement.style.left = x + 'px';
            this.turretSetup.timerElement.style.top = y + 'px';
        }
    }
    completeTurretSetup() {
        if (!this.turretSetup) return;
        
        const weapon = this.turretSetup.weapon;
        const placePos = this.turretSetup.position;
        
        const turretBase = new THREE.CylinderGeometry(0.8, 1.2, 1.5, 8);
        const turretHead = new THREE.SphereGeometry(0.6, 12, 8);
        const turretMat = new THREE.MeshBasicMaterial({ color: 0x4488cc });
        
        const base = new THREE.Mesh(turretBase, turretMat);
        const head = new THREE.Mesh(turretHead, turretMat);
        
        const turret = new THREE.Group();
        base.position.y = 0.75;
        head.position.y = 1.8;
        turret.add(base);
        turret.add(head);
        
        turret.position.copy(placePos);
        turret.position.y += 0.5;
        
        turret.userData.isTurret = true;
        turret.userData.health = weapon.qTurretHealth;
        turret.userData.maxHealth = weapon.qTurretHealth;
        turret.userData.damage = weapon.qTurretDamage;
        turret.userData.fireRate = weapon.qTurretFireRate;
        turret.userData.range = weapon.qTurretRange;
        turret.userData.projectileSpeed = weapon.qTurretProjectileSpeed;
        turret.userData.fireTimer = 0;
        turret.userData.head = head;
        
        if (!this.turrets) this.turrets = [];
        this.turrets.push(turret);
        this.scene.add(turret);
        
        this.scene.remove(this.turretSetup.zone);
        this.scene.remove(this.turretSetup.ring);
        this.turretSetup.timerElement.remove();
        this.turretSetup = null;
    }
    updateDash(dt) {
        if (!this.dashData || !this.dashData.active) return;
        
        const dashSpeed = this.dashData.speed * dt;
        const toTarget = new THREE.Vector3().subVectors(this.dashData.targetPos, this.camera.position);
        const distance = toTarget.length();
        
        if (distance < 1) {
            this.dashData.active = false;
            return;
        }
        
        toTarget.normalize().multiplyScalar(Math.min(dashSpeed, distance));
        this.camera.position.add(toTarget);
        
        if (this.player) {
            this.player.position.copy(this.camera.position);
        }
    }
    updateIceGrenades(dt, enemies) {
        if (!this.iceGrenades) this.iceGrenades = [];
        
        for (let i = this.iceGrenades.length - 1; i >= 0; i--) {
            const grenade = this.iceGrenades[i];
            grenade.userData.velocity.y -= 35 * dt;
            const newPos = grenade.position.clone().add(grenade.userData.velocity.clone().multiplyScalar(dt));
            this.raycaster.set(grenade.position, grenade.userData.velocity.clone().normalize());
            this.raycaster.far = grenade.userData.velocity.length() * dt;
            const allTargets = [];
            allTargets.push(...this.scene.children.filter(obj => obj.userData.isArena || obj.userData.isObstacle));
            const intersects = this.raycaster.intersectObjects(allTargets, true);
            if (intersects.length > 0 || newPos.y < 0.5) {
                if (newPos.y < 0.5) grenade.position.y = 0.5;
                else grenade.position.copy(intersects[0].point);
                grenade.userData.velocity.set(0, 0, 0);
            } else {
                grenade.position.copy(newPos);
            }
            grenade.rotation.x += dt * 10;
            grenade.rotation.y += dt * 8;
            const elapsed = (performance.now() - grenade.userData.startTime) / 1000;
            if (elapsed >= grenade.userData.fuseTime) {
                this.explodeIceGrenade(grenade, enemies);
                this.iceGrenades.splice(i, 1);
            }
        }
    }
    explodeIceGrenade(grenade, enemies) {
        const explosionPos = grenade.position.clone();
        const radius = grenade.userData.radius;
        const damage = grenade.userData.damage;
        const slowAmount = grenade.userData.slowAmount;
        const slowDuration = grenade.userData.slowDuration;
        
        // Visual explosion
        const explosionGeom = new THREE.SphereGeometry(1, 16, 12);
        const explosionMat = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.9
        });
        const explosion = new THREE.Mesh(explosionGeom, explosionMat);
        explosion.position.copy(explosionPos);
        explosion.userData.lifetime = 0.4;
        explosion.userData.isExplosion = true;
        explosion.userData.maxScale = radius * 1.5;
        this.impactMarkers.push(explosion);
        this.scene.add(explosion);
        
        // Damage and slow enemies
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const dist = enemy.position.distanceTo(explosionPos);
            if (dist <= radius) {
                const damageMult = 1 - (dist / radius) * 0.5;
                enemy.takeDamage(damage * damageMult);
                enemy.slowTimer = slowDuration;
                enemy.slowMultiplier = slowAmount;
                this.createComicImpact(damage * damageMult, false, enemy, enemy.position);
            }
        }
        
        this.scene.remove(grenade);
        if (grenade.geometry) grenade.geometry.dispose();
        if (grenade.material) grenade.material.dispose();
        this.screenShake = 0.2;
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