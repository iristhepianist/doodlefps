class EnemyManager {
    constructor(scene, arena) {
        this.scene = scene;
        this.arena = arena;
        this.enemies = [];
        this.maxEnemies = 40;
        this.time = 0;
        this.projectiles = [];
        this.projectileDamageBuffer = 0;
        this.frozen = false;
        this.attacksDisabled = false;
        this.homingDisabled = false;
        this.ignoreMaxEnemies = false;
        this.crushKillCount = 0;
        this.crushKillTimer = 0;
        this.screenShake = 0;
        this.beamHazards = [];
        this.beamWarnings = [];
        this.enemyTypes = {
            chaser: {
                name: 'Scribble',
                health: 40,
                damage: 15,
                speed: 8,
                attackRange: 2.5,
                attackCooldown: 0.8,
                size: { x: 0.8, y: 2, z: 0.8 },
                color: 0x1a1a1a,
                scoreValue: 50,
                spawnWeight: 40
            },
            ranged: {
                name: 'Blot',
                health: 60,
                damage: 30,
                speed: 3,
                attackRange: 35,
                preferredRange: 18,
                attackCooldown: 4.0,
                beamDuration: 1.5,
                beamRadius: 2.5,
                size: { x: 1.2, y: 1.5, z: 1.2 },
                color: 0x333333,
                scoreValue: 75,
                spawnWeight: 25
            },
            tank: {
                name: 'Inkblob',
                health: 750,
                damage: 35,
                speed: 5,
                attackRange: 4.5,
                attackCooldown: 1.5,
                size: { x: 4.2, y: 4.8, z: 4.2 },
                color: 0x0a0a0a,
                scoreValue: 400,
                spawnWeight: 10,
                hasShockwave: true
            },
            swarmer: {
                name: 'Scratch',
                health: 20,
                damage: 8,
                speed: 10,
                attackRange: 1.5,
                attackCooldown: 0.4,
                size: { x: 0.5, y: 1, z: 0.5 },
                color: 0x2a2a2a,
                scoreValue: 25,
                spawnWeight: 35,
                packSize: 3 
            },
            bruiser: {
                name: 'Smudge',
                health: 10000,
                damage: 50,
                speed: 3.5,
                attackRange: 5,
                attackCooldown: 2.5,
                size: { x: 9, y: 9.5, z: 9 },
                color: 0x050505,
                scoreValue: 2000,
                spawnWeight: 5,
                hasShockwave: true
            }
        };
    }
    reset() {
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.mesh);
        }
        this.enemies = [];
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
            if (proj.glow) this.scene.remove(proj.glow);
        }
        this.projectiles = [];
        this.projectileDamageBuffer = 0;
        this.crushKillCount = 0;
        this.crushKillTimer = 0;
    }
    clearAll() {
        this.reset();
    }
    setFrozen(frozen) {
        this.frozen = frozen;
    }
    setAttacksDisabled(disabled) {
        this.attacksDisabled = disabled;
    }
    setHomingDisabled(disabled) {
        this.homingDisabled = disabled;
    }
    setIgnoreMaxEnemies(ignore) {
        this.ignoreMaxEnemies = ignore;
    }
    killAll() {
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.health = 0;
                enemy.die();
            }
        }
    }
    clearProjectiles() {
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
            if (proj.glow) this.scene.remove(proj.glow);
        }
        this.projectiles = [];
        this.projectileDamageBuffer = 0;
    }
    getAliveCount() {
        return this.enemies.filter(e => e.isAlive).length;
    }
    spawnEnemy(wave, playerPos) {
        if (!this.ignoreMaxEnemies && this.getAliveCount() >= this.maxEnemies) {
            return;
        }
        const type = this.selectEnemyType(wave);
        const enemyDef = this.enemyTypes[type];
        const spawnCount = (type === 'swarmer' && wave >= 4) ? enemyDef.packSize : 1;
        this.spawnEnemyOfType(type, spawnCount, playerPos);
    }
    spawnEnemyOfType(type, count, playerPos = null) {
        const enemyDef = this.enemyTypes[type];
        if (!enemyDef) return 0;
        const allowed = this.ignoreMaxEnemies ? count : Math.max(0, this.maxEnemies - this.getAliveCount());
        const toSpawn = Math.min(count, allowed);
        let spawned = 0;
        for (let s = 0; s < toSpawn; s++) {
            const spawnPos = this.generateSpawnPosition(enemyDef, playerPos, s > 0);
            const enemy = new Enemy(this.scene, enemyDef, type, spawnPos);
            enemy.enemyManager = this;
            this.enemies.push(enemy);
            spawned++;
        }
        return spawned;
    }
    generateSpawnPosition(enemyDef, playerPos = null, offset = false) {
        const bounds = this.arena.getBounds();
        let spawnPos;
        let attempts = 0;
        do {
            spawnPos = new THREE.Vector3(
                bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
                enemyDef.size.y / 2,
                bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
            );
            attempts++;
        } while (playerPos && spawnPos.distanceTo(playerPos) < 15 && attempts < 20);
        if (offset) {
            spawnPos.x += (Math.random() - 0.5) * 3;
            spawnPos.z += (Math.random() - 0.5) * 3;
        }
        return spawnPos;
    }
    selectEnemyType(wave) {
        let availableTypes = [];
        if (wave < 2) {
            return 'chaser';
        } else if (wave < 4) {
            availableTypes = ['chaser', 'swarmer'];
        } else if (wave < 6) {
            availableTypes = ['chaser', 'swarmer', 'ranged'];
        } else if (wave < 8) {
            availableTypes = ['chaser', 'swarmer', 'ranged', 'tank'];
        } else {
            availableTypes = ['chaser', 'swarmer', 'ranged', 'tank', 'bruiser'];
        }
        let totalWeight = 0;
        for (const type of availableTypes) {
            totalWeight += this.enemyTypes[type].spawnWeight;
        }
        let roll = Math.random() * totalWeight;
        for (const type of availableTypes) {
            roll -= this.enemyTypes[type].spawnWeight;
            if (roll <= 0) return type;
        }
        return 'chaser';
    }
    fixedUpdate(dt, playerPos, playerRadius) {
        for (const enemy of this.enemies) {
            if (enemy.isAlive && !this.frozen) {
                enemy.update(dt, playerPos, this.arena);
            }
        }
        this.updateProjectiles(dt, playerPos, playerRadius);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].shouldRemove) {
                this.scene.remove(this.enemies[i].mesh);
                this.enemies.splice(i, 1);
            }
        }
    }
    updateProjectiles(dt, playerPos, playerRadius) {
        const bounds = this.arena.getBounds();
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.lifetime -= dt;
            
            if (proj.isHoming && !proj.parried && !this.homingDisabled) {
                const toTarget = playerPos.clone().sub(proj.mesh.position);
                toTarget.y = 0;
                if (toTarget.lengthSq() > 0.001) {
                    toTarget.normalize();
                    const currentDir = proj.velocity.clone().normalize();
                    const steerForce = toTarget.sub(currentDir).multiplyScalar(proj.homingStrength);
                    proj.velocity.add(steerForce.multiplyScalar(dt));
                    const speed = proj.velocity.length();
                    proj.velocity.normalize().multiplyScalar(Math.min(speed, 16));
                }
            }
            
            proj.mesh.position.addScaledVector(proj.velocity, dt);
            if (proj.glow) {
                proj.glow.position.copy(proj.mesh.position);
            }
            
            if (proj.parried && proj.owner) {
                const distToOwner = proj.mesh.position.distanceTo(proj.owner.position);
                if (distToOwner <= proj.owner.size.x + proj.radius) {
                    proj.owner.health = 0;
                    proj.owner.die();
                    this.removeProjectile(i);
                    continue;
                }
            }
            
            const hitPlayerRadius = playerRadius + proj.radius;
            if (proj.mesh.position.distanceTo(playerPos) <= hitPlayerRadius) {
                if (!proj.parried) {
                    this.projectileDamageBuffer += proj.damage;
                }
                this.removeProjectile(i);
                continue;
            }
            if (proj.lifetime <= 0 || !this.isInsideBounds(proj.mesh.position, bounds) || this.hitObstacle(proj.mesh.position, proj.radius)) {
                this.removeProjectile(i);
            }
        }
    }
    checkParry(playerPos, playerRadius, parryActive, isEraserShot, shotDirection) {
        if (!parryActive && !isEraserShot) return false;
        
        let parrySuccess = false;
        for (const proj of this.projectiles) {
            if (!proj.canBeParried || proj.parried) continue;
            
            const distToPlayer = proj.mesh.position.distanceTo(playerPos);
            let parryRange = playerRadius + proj.radius + 1.2;
            
            if (isEraserShot && shotDirection) {
                parryRange = playerRadius + proj.radius + 8.0;
                const toProj = proj.mesh.position.clone().sub(playerPos).normalize();
                const dot = shotDirection.dot(toProj);
                if (dot < 0.7) continue;
            }
            
            if (distToPlayer <= parryRange) {
                proj.parried = true;
                proj.velocity.negate().multiplyScalar(1.5);
                proj.mesh.material.color.setHex(0x00ff00);
                if (proj.glow) {
                    proj.glow.material.color.setHex(0x00ff88);
                }
                parrySuccess = true;
            }
        }
        return parrySuccess;
    }
    
    removeProjectile(index) {
        const proj = this.projectiles[index];
        this.scene.remove(proj.mesh);
        if (proj.glow) this.scene.remove(proj.glow);
        this.projectiles.splice(index, 1);
    }
    isInsideBounds(pos, bounds) {
        return pos.x > bounds.minX && pos.x < bounds.maxX && pos.z > bounds.minZ && pos.z < bounds.maxZ;
    }
    hitObstacle(pos, radius) {
        for (const obstacle of this.arena.obstacles) {
            const halfSize = obstacle.size.clone().multiplyScalar(0.5);
            const minX = obstacle.position.x - halfSize.x - radius;
            const maxX = obstacle.position.x + halfSize.x + radius;
            const minY = obstacle.position.y - halfSize.y - radius;
            const maxY = obstacle.position.y + halfSize.y + radius;
            const minZ = obstacle.position.z - halfSize.z - radius;
            const maxZ = obstacle.position.z + halfSize.z + radius;
            if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY && pos.z >= minZ && pos.z <= maxZ) {
                return true;
            }
        }
        return false;
    }
    update(dt) {
        this.time += dt;
        
        // Decay screen shake
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 2);
        }
        
        // Update crush kill timer for UI feedback
        if (this.crushKillTimer > 0) {
            this.crushKillTimer -= dt;
        }
        
        // Update crush visual effects
        const toRemove = [];
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj.userData.isCrushEffect) {
                obj.userData.lifetime -= dt;
                const progress = 1 - (obj.userData.lifetime / 0.6);
                obj.scale.set(
                    1 + progress * (obj.userData.maxScale - 1),
                    1 + progress * (obj.userData.maxScale - 1),
                    1
                );
                obj.material.opacity = 0.9 * (1 - progress);
                if (obj.userData.lifetime <= 0) {
                    toRemove.push(obj);
                }
            } else if (obj.userData.isDust) {
                obj.userData.lifetime -= dt;
                obj.position.addScaledVector(obj.userData.velocity, dt);
                obj.userData.velocity.y -= 9.8 * dt;
                obj.material.opacity = Math.max(0, obj.userData.lifetime / 0.8);
                if (obj.userData.lifetime <= 0 || obj.position.y < 0) {
                    toRemove.push(obj);
                }
            } else if (obj.userData.isBeam) {
                obj.userData.lifetime -= dt;
                obj.material.opacity = 0.8 * Math.max(0, obj.userData.lifetime / 0.4);
                if (obj.userData.lifetime <= 0) {
                    toRemove.push(obj);
                }
            }
        }
        for (const obj of toRemove) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
        
        // Update beam hazards
        for (let i = this.beamHazards.length - 1; i >= 0; i--) {
            const hazard = this.beamHazards[i];
            hazard.lifetime -= dt;
            
            // Update visual opacity
            if (hazard.mesh) {
                hazard.mesh.material.opacity = Math.min(0.8, hazard.lifetime / hazard.maxLifetime);
            }
            if (hazard.ring) {
                const pulse = 0.6 + Math.sin(hazard.lifetime * 10) * 0.2;
                hazard.ring.material.opacity = pulse * (hazard.lifetime / hazard.maxLifetime);
            }
            
            if (hazard.lifetime <= 0) {
                // Remove visual
                if (hazard.mesh) this.scene.remove(hazard.mesh);
                if (hazard.ring) this.scene.remove(hazard.ring);
                this.beamHazards.splice(i, 1);
            }
        }
        
        // Update beam warnings
        for (let i = this.beamWarnings.length - 1; i >= 0; i--) {
            const warning = this.beamWarnings[i];
            warning.timer += dt;
            
            // Track player position until tracking duration expires
            if (warning.timer < warning.trackDuration && warning.playerPos) {
                // Follow player
                if (warning.circle) {
                    warning.circle.position.x = warning.playerPos.x;
                    warning.circle.position.z = warning.playerPos.z;
                }
                if (warning.ring) {
                    warning.ring.position.x = warning.playerPos.x;
                    warning.ring.position.z = warning.playerPos.z;
                }
            } else if (!warning.lockedPosition) {
                // Lock position when tracking expires
                warning.lockedPosition = new THREE.Vector3(
                    warning.circle.position.x,
                    0,
                    warning.circle.position.z
                );
            }
            
            // Pulse animation - gets faster and more intense as time runs out
            const progress = warning.timer / warning.duration;
            const pulseSpeed = 5 + progress * 15;
            const pulse = 0.3 + Math.abs(Math.sin(this.time * pulseSpeed)) * 0.7;
            
            if (warning.circle) {
                warning.circle.material.opacity = 0.2 + pulse * 0.4;
            }
            if (warning.ring) {
                warning.ring.material.opacity = 0.5 + pulse * 0.5;
                warning.ring.rotation.z += dt * (2 + progress * 3);
            }
            
            if (warning.timer >= warning.duration) {
                // Fire the actual beam at locked position
                if (warning.enemy && warning.enemy.isAlive && warning.lockedPosition) {
                    warning.enemy.fireVerticalBeamImmediate(warning.lockedPosition, warning.radius);
                }
                
                // Remove warning visuals
                if (warning.circle) this.scene.remove(warning.circle);
                if (warning.ring) this.scene.remove(warning.ring);
                this.beamWarnings.splice(i, 1);
            }
        }
        
        for (const enemy of this.enemies) {
            enemy.visualUpdate(dt, this.time);
        }
    }
    checkPlayerDamage(playerPos, playerRadius) {
        if (this.attacksDisabled) return 0;
        
        let totalDamage = 0;
        let shockwaveHit = false;
        for (const enemy of this.enemies) {
            if (enemy.isAlive && enemy.canAttack) {
                const dist = enemy.position.distanceTo(playerPos);
                if (dist < enemy.attackRange + playerRadius) {
                    const attackResult = enemy.attack(playerPos);
                    if (attackResult && attackResult.projectile) {
                        this.projectiles.push(attackResult.projectile);
                    }
                    const dmg = attackResult ? attackResult.damage : 0;
                    if (enemy.type !== 'ranged') {
                        totalDamage += dmg;
                    }
                    if (enemy.type === 'bruiser' && !shockwaveHit) {
                        shockwaveHit = true;
                        enemy.triggerShockwave();
                    }
                }
            }
        }
        if (this.projectileDamageBuffer > 0) {
            totalDamage += this.projectileDamageBuffer;
            this.projectileDamageBuffer = 0;
        }
        
        // Check beam hazard damage
        for (const hazard of this.beamHazards) {
            const dx = hazard.position.x - playerPos.x;
            const dz = hazard.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= hazard.radius) {
                totalDamage += hazard.damage;
            }
        }
        
        return totalDamage;
    }
    checkTurretDamage(turrets) {
        if (!turrets || turrets.length === 0) return;
        
        for (const enemy of this.enemies) {
            if (!enemy.isAlive || !enemy.canAttack) continue;
            
            for (const turret of turrets) {
                if (!turret.userData.health || turret.userData.health <= 0) continue;
                
                const dist = enemy.position.distanceTo(turret.position);
                if (dist < enemy.attackRange + 2) {
                    const attackResult = enemy.attack(turret.position);
                    const dmg = attackResult ? attackResult.damage : 0;
                    if (dmg > 0 && enemy.type !== 'ranged') {
                        turret.userData.health = Math.max(0, turret.userData.health - dmg);
                    }
                }
            }
        }
    }
    getEnemiesForMinimap() {
        return this.enemies.filter(e => e.isAlive).map(e => ({
            position: e.position,
            type: e.type,
            health: e.health,
            maxHealth: e.maxHealth
        }));
    }
    getAliveCount() {
        return this.enemies.filter(e => e.isAlive).length;
    }
    
    getCrushKillInfo() {
        return {
            count: this.crushKillCount,
            active: this.crushKillTimer > 0
        };
    }
    
    getScreenShake() {
        return this.screenShake;
    }
}
class Enemy {
    constructor(scene, definition, type, position) {
        this.scene = scene;
        this.type = type;
        this.name = definition.name;
        this.maxHealth = definition.health;
        this.health = definition.health;
        this.damage = definition.damage;
        this.speed = definition.speed;
        this.attackRange = definition.attackRange;
        this.attackCooldown = definition.attackCooldown;
        this.preferredRange = definition.preferredRange || definition.attackRange;
        this.beamDuration = definition.beamDuration || 1.5;
        this.beamRadius = definition.beamRadius || 2.5;
        this.scoreValue = definition.scoreValue;
        this.isAlive = true;
        this.shouldRemove = false;
        this.attackTimer = 0;
        this.canAttack = true;
        this.hitFlashTimer = 0;
        this.deathTimer = 0;
        this.animationPhase = Math.random() * Math.PI * 2; 
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.targetDirection = new THREE.Vector3();
        this.zigzagTimer = 0;
        this.zigzagDir = 1;
        this.knockbackVelocity = new THREE.Vector3();
        this.knockbackResistance = type === 'tank' ? 0.2 : 
                                    type === 'bruiser' ? 0.1 :
                                    (type === 'ranged' ? 0.8 : 1.0);
        this.shockwaveMesh = null;
        this.shockwaveTimer = 0;
        this.createMesh(definition);
    }
    createMesh(definition) {
        this.mesh = new THREE.Group();
        switch(this.type) {
            case 'chaser':
                this.createChaserMesh(definition);
                break;
            case 'ranged':
                this.createRangedMesh(definition);
                break;
            case 'tank':
                this.createTankMesh(definition);
                break;
            case 'swarmer':
                this.createSwarmerMesh(definition);
                break;
            case 'bruiser':
                this.createBruiserMesh(definition);
                break;
        }
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    createEyeball(x, y, z, eyeRadius, pupilRadius, color = 0xf5f0e6) {
        const eyeGroup = new THREE.Group();
        const eyeGeom = new THREE.SphereGeometry(eyeRadius, 10, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eyeGroup.add(eye);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide });
        const outline = new THREE.Mesh(eyeGeom.clone(), outlineMat);
        outline.scale.multiplyScalar(1.08);
        eyeGroup.add(outline);
        const pupilGeom = new THREE.SphereGeometry(pupilRadius, 6, 5);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const pupil = new THREE.Mesh(pupilGeom, pupilMat);
        pupil.position.z = eyeRadius * 0.8;
        eyeGroup.add(pupil);
        eyeGroup.userData.pupil = pupil;
        eyeGroup.position.set(x, y, z);
        return eyeGroup;
    }
    createChaserMesh(def) {
        const bodyColor = 0xff3333;
        const width = def.size.x * 1.2;
        const height = def.size.y;
        const depth = def.size.z * 0.8;
        const bodyGeom = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.5;
        this.mesh.add(body);
        const outlineGeom = new THREE.BoxGeometry(width * 1.08, height * 1.08, depth * 1.08);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide });
        const outline = new THREE.Mesh(outlineGeom, outlineMat);
        outline.position.copy(body.position);
        this.mesh.add(outline);
        const eyeWidth = 0.15;
        const eyeHeight = 0.25;
        const eyeDepth = 0.05;
        const eyeY = def.size.y * 0.65;
        const eyeZ = depth * 0.5 + 0.02;
        const leftEyeGeom = new THREE.BoxGeometry(eyeWidth, eyeHeight, eyeDepth);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(leftEyeGeom, eyeMat);
        leftEye.position.set(-width * 0.25, eyeY, eyeZ);
        leftEye.rotation.z = -0.3;
        this.mesh.add(leftEye);
        const rightEye = new THREE.Mesh(leftEyeGeom.clone(), eyeMat);
        rightEye.position.set(width * 0.25, eyeY, eyeZ);
        rightEye.rotation.z = 0.3;
        this.mesh.add(rightEye);
        const pupilWidth = 0.08;
        const pupilHeight = 0.12;
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftPupilGeom = new THREE.BoxGeometry(pupilWidth, pupilHeight, eyeDepth);
        const leftPupil = new THREE.Mesh(leftPupilGeom, pupilMat);
        leftPupil.position.set(-width * 0.25, eyeY - 0.05, eyeZ + 0.01);
        this.mesh.add(leftPupil);
        const rightPupil = new THREE.Mesh(leftPupilGeom.clone(), pupilMat);
        rightPupil.position.set(width * 0.25, eyeY - 0.05, eyeZ + 0.01);
        this.mesh.add(rightPupil);
        const browWidth = 0.2;
        const browHeight = 0.08;
        const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftBrowGeom = new THREE.BoxGeometry(browWidth, browHeight, eyeDepth);
        const leftBrow = new THREE.Mesh(leftBrowGeom, browMat);
        leftBrow.position.set(-width * 0.25, eyeY + 0.18, eyeZ + 0.01);
        leftBrow.rotation.z = -0.5;
        this.mesh.add(leftBrow);
        const rightBrow = new THREE.Mesh(leftBrowGeom.clone(), browMat);
        rightBrow.position.set(width * 0.25, eyeY + 0.18, eyeZ + 0.01);
        rightBrow.rotation.z = 0.5;
        this.mesh.add(rightBrow);
        const mouthWidth = 0.4;
        const mouthHeight = 0.12;
        const mouthGeom = new THREE.BoxGeometry(mouthWidth, mouthHeight, eyeDepth);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeom, mouthMat);
        mouth.position.set(0, def.size.y * 0.35, eyeZ + 0.01);
        mouth.rotation.z = 0.15;
        this.mesh.add(mouth);
        this.fillMaterial = bodyMat;
    }
    createSwarmerMesh(def) {
        const bodyColor = 0x9966ff; 
        const radius = def.size.x * 0.5;
        const bodyGeom = new THREE.SphereGeometry(radius, 12, 10);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.5;
        this.mesh.add(body);
        const outlineGeom = new THREE.SphereGeometry(radius * 1.06, 12, 10);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide });
        const outline = new THREE.Mesh(outlineGeom, outlineMat);
        outline.position.copy(body.position);
        this.mesh.add(outline);
        this.leftEye = this.createEyeball(-radius * 0.4, def.size.y * 0.65, radius * 0.8, 0.15, 0.08, 0xffffff);
        this.rightEye = this.createEyeball(radius * 0.4, def.size.y * 0.65, radius * 0.8, 0.15, 0.08, 0xffffff);
        this.mesh.add(this.leftEye);
        this.mesh.add(this.rightEye);
        this.legs = [];
        const legMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const legGeom = new THREE.BufferGeometry();
            legGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                Math.cos(angle) * radius * 0.5, def.size.y * 0.35, Math.sin(angle) * radius * 0.5,
                Math.cos(angle) * radius * 1.8, 0.08, Math.sin(angle) * radius * 1.8
            ]), 3));
            const leg = new THREE.Line(legGeom, legMat);
            this.legs.push(leg);
            this.mesh.add(leg);
        }
        this.fillMaterial = bodyMat;
    }
    createRangedMesh(def) {
        const bodyColor = 0x00ccff; 
        const radius = def.size.x * 0.6;
        const bodyGeom = new THREE.SphereGeometry(radius, 14, 12);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.5;
        this.mesh.add(body);
        const outlineGeom = new THREE.SphereGeometry(radius * 1.05, 14, 12);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide });
        const outline = new THREE.Mesh(outlineGeom, outlineMat);
        outline.position.copy(body.position);
        this.mesh.add(outline);
        const glowRing = new THREE.Mesh(
            new THREE.RingGeometry(radius * 1.15, radius * 1.35, 32),
            new THREE.MeshBasicMaterial({ color: 0x0099cc, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
        );
        glowRing.position.set(0, def.size.y * 0.5, 0);
        this.mesh.add(glowRing);
        this.glowRing = glowRing;
        this.eye = this.createEyeball(0, def.size.y * 0.5, radius * 0.95, 0.45, 0.22, 0xffffff);
        this.mesh.add(this.eye);
        const ringGeom = new THREE.RingGeometry(0.45, 0.52, 4);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        this.targetRing = new THREE.Mesh(ringGeom, ringMat);
        this.targetRing.position.set(0, def.size.y * 0.5, radius + 0.15);
        this.targetRing.rotation.z = Math.PI / 4; 
        this.targetRing.visible = false;
        this.mesh.add(this.targetRing);
        this.orbitDots = [];
        for (let i = 0; i < 4; i++) {
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 5),
                new THREE.MeshBasicMaterial({ color: 0x006699 })
            );
            dot.userData.angle = (i / 4) * Math.PI * 2;
            dot.userData.orbitRadius = radius * 1.5;
            this.orbitDots.push(dot);
            this.mesh.add(dot);
        }
        this.fillMaterial = bodyMat;
    }
    createTankMesh(def) {
        const bodyColor = 0x33ff33; 
        const accentColor = 0x228822;
        const bodyGeom = new THREE.BoxGeometry(def.size.x, def.size.y * 0.75, def.size.z);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.375;
        this.mesh.add(body);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        const outline = new THREE.Mesh(bodyGeom.clone(), outlineMat);
        outline.scale.multiplyScalar(1.05);
        outline.position.copy(body.position);
        this.mesh.add(outline);
        const plateMat = new THREE.MeshBasicMaterial({ color: accentColor });
        for (let i = 0; i < 3; i++) {
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(def.size.x * 0.85, def.size.y * 0.18, 0.05),
                plateMat
            );
            plate.position.set(0, def.size.y * (0.15 + i * 0.25), def.size.z * 0.52);
            this.mesh.add(plate);
        }
        const visorGeom = new THREE.BoxGeometry(def.size.x * 0.8, 0.3, 0.12);
        const visor = new THREE.Mesh(visorGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
        visor.position.set(0, def.size.y * 0.65, def.size.z * 0.52);
        this.mesh.add(visor);
        this.leftEye = this.createEyeball(-0.4, def.size.y * 0.65, def.size.z * 0.55, 0.14, 0.07, 0xffff00);
        this.rightEye = this.createEyeball(0.4, def.size.y * 0.65, def.size.z * 0.55, 0.14, 0.07, 0xffff00);
        this.mesh.add(this.leftEye);
        this.mesh.add(this.rightEye);
        this.fillMaterial = bodyMat;
    }
    createBruiserMesh(def) {
        const bodyColor = 0xff6600; 
        const accentColor = 0xcc4400;
        const bodyGeom = new THREE.BoxGeometry(def.size.x, def.size.y * 0.85, def.size.z * 0.85);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.425;
        this.mesh.add(body);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        const outline = new THREE.Mesh(bodyGeom.clone(), outlineMat);
        outline.scale.multiplyScalar(1.05);
        outline.position.copy(body.position);
        this.mesh.add(outline);
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        const crackGeom = new THREE.PlaneGeometry(0.15, def.size.y * 0.65);
        this.cracks = [];
        for (let i = 0; i < 5; i++) {
            const crack = new THREE.Mesh(crackGeom, crackMat);
            const angle = (i / 5) * Math.PI * 2;
            crack.position.set(
                Math.cos(angle) * def.size.x * 0.52,
                def.size.y * 0.4,
                Math.sin(angle) * def.size.z * 0.44
            );
            crack.rotation.y = angle;
            crack.visible = false;
            this.cracks.push(crack);
            this.mesh.add(crack);
        }
        const headGeom = new THREE.BoxGeometry(def.size.x * 0.45, def.size.y * 0.22, def.size.z * 0.45);
        const head = new THREE.Mesh(headGeom, new THREE.MeshBasicMaterial({ color: accentColor }));
        head.position.y = def.size.y * 0.92;
        this.mesh.add(head);
        const headOutline = new THREE.Mesh(headGeom.clone(), outlineMat);
        headOutline.scale.multiplyScalar(1.06);
        headOutline.position.copy(head.position);
        this.mesh.add(headOutline);
        this.leftEye = this.createEyeball(-def.size.x * 0.13, def.size.y * 0.92, def.size.z * 0.24, 0.16, 0.09, 0xff0000);
        this.rightEye = this.createEyeball(def.size.x * 0.12, def.size.y * 0.9, def.size.z * 0.21, 0.15, 0.08, 0xff0000);
        this.mesh.add(this.leftEye);
        this.mesh.add(this.rightEye);
        this.fillMaterial = bodyMat;
    }
    triggerShockwave() {
        const ringGeom = new THREE.RingGeometry(0.5, 1, 16);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x1a1a1a, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.shockwaveMesh = new THREE.Mesh(ringGeom, ringMat);
        this.shockwaveMesh.position.copy(this.position);
        this.shockwaveMesh.position.y = 0.1;
        this.shockwaveMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.shockwaveMesh);
        this.shockwaveTimer = 0.5;
    }
    update(dt, playerPos, arena) {
        if (!this.isAlive) return;
        if (!this.canAttack) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.canAttack = true;
            }
        }
        const toPlayer = playerPos.clone().sub(this.position);
        toPlayer.y = 0;
        const distToPlayer = toPlayer.length();
        if (distToPlayer > 0.1) {
            toPlayer.normalize();
        }
        this.updateAI(dt, toPlayer, distToPlayer, playerPos);
        if (this.knockbackVelocity.lengthSq() > 0.1) {
            this.position.x += this.knockbackVelocity.x * dt;
            this.position.z += this.knockbackVelocity.z * dt;
            this.knockbackVelocity.multiplyScalar(0.85);
        } else {
            this.position.x += this.velocity.x * dt;
            this.position.z += this.velocity.z * dt;
        }
        const enemyRadius = this.type === 'bruiser' ? 1.5 : (this.type === 'tank' ? 1.1 : 0.5);
        for (const obstacle of arena.obstacles) {
            const halfSize = obstacle.size.clone().multiplyScalar(0.5);
            const nearestX = Math.max(obstacle.position.x - halfSize.x, Math.min(this.position.x, obstacle.position.x + halfSize.x));
            const nearestZ = Math.max(obstacle.position.z - halfSize.z, Math.min(this.position.z, obstacle.position.z + halfSize.z));
            const dx = this.position.x - nearestX;
            const dz = this.position.z - nearestZ;
            const distSq = dx * dx + dz * dz;
            if (distSq < enemyRadius * enemyRadius && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = enemyRadius - dist;
                this.position.x += (dx / dist) * overlap;
                this.position.z += (dz / dist) * overlap;
            }
        }
        const bounds = arena.getBounds();
        this.position.x = Math.max(bounds.minX + enemyRadius, Math.min(bounds.maxX - enemyRadius, this.position.x));
        this.position.z = Math.max(bounds.minZ + enemyRadius, Math.min(bounds.maxZ - enemyRadius, this.position.z));
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
        this.mesh.rotation.y = targetAngle;
        this.mesh.position.copy(this.position);
    }
    updateAI(dt, toPlayer, distToPlayer, playerPos) {
        switch(this.type) {
            case 'chaser':
                this.targetDirection.copy(toPlayer);
                this.velocity.x = this.targetDirection.x * this.speed;
                this.velocity.z = this.targetDirection.z * this.speed;
                break;
            case 'swarmer':
                this.zigzagTimer += dt;
                if (this.zigzagTimer > 0.3) {
                    this.zigzagTimer = 0;
                    this.zigzagDir *= -1;
                }
                const perpendicular = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                this.targetDirection.copy(toPlayer).add(perpendicular.multiplyScalar(0.3 * this.zigzagDir));
                this.targetDirection.normalize();
                this.velocity.x = this.targetDirection.x * this.speed;
                this.velocity.z = this.targetDirection.z * this.speed;
                break;
            case 'ranged':
                if (distToPlayer < this.preferredRange * 0.6) {
                    this.targetDirection.copy(toPlayer).negate();
                } else if (distToPlayer > this.preferredRange * 1.4) {
                    this.targetDirection.copy(toPlayer);
                } else {
                    this.targetDirection.set(-toPlayer.z, 0, toPlayer.x);
                    if (Math.random() < 0.005) this.targetDirection.negate();
                }
                this.velocity.x = this.targetDirection.x * this.speed;
                this.velocity.z = this.targetDirection.z * this.speed;
                if (this.targetRing) {
                    this.targetRing.visible = distToPlayer < this.attackRange && this.canAttack;
                }
                break;
            case 'tank':
            case 'bruiser':
                this.targetDirection.copy(toPlayer);
                this.velocity.x = this.targetDirection.x * this.speed;
                this.velocity.z = this.targetDirection.z * this.speed;
                break;
        }
    }
    applyKnockback(direction, force) {
        const actualForce = force * this.knockbackResistance;
        this.knockbackVelocity.x += direction.x * actualForce;
        this.knockbackVelocity.z += direction.z * actualForce;
    }
    visualUpdate(dt, globalTime) {
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            if (this.fillMaterial) {
                this.fillMaterial.color.setHex(0xff0000);
            }
        } else if (this.fillMaterial) {
            const originalColors = {
                chaser: 0xf5f0e6,
                ranged: 0x333333,
                tank: 0xf5f0e6,
                swarmer: 0xf5f0e6,
                bruiser: 0x050505
            };
            this.fillMaterial.color.setHex(originalColors[this.type] || 0xf5f0e6);
        }
        if (this.isAlive) {
            this.animateByType(dt, globalTime);
        }
        if (!this.isAlive && !this.shouldRemove) {
            this.deathTimer += dt;
            const deathProgress = this.deathTimer / 0.5;
            const scale = 1 - deathProgress * 0.8;
            this.mesh.scale.set(scale, scale, scale);
            this.mesh.rotation.y += dt * 15;
            this.mesh.position.y -= dt * 4;
            if (this.deathTimer > 0.5) {
                this.shouldRemove = true;
            }
        }
        if (this.shockwaveMesh && this.shockwaveTimer > 0) {
            this.shockwaveTimer -= dt;
            const progress = 1 - this.shockwaveTimer / 0.5;
            this.shockwaveMesh.scale.set(1 + progress * 8, 1 + progress * 8, 1);
            this.shockwaveMesh.material.opacity = 0.8 * (1 - progress);
            if (this.shockwaveTimer <= 0) {
                this.scene.remove(this.shockwaveMesh);
                this.shockwaveMesh = null;
            }
        }
    }
    animateByType(dt, globalTime) {
        const t = globalTime + this.animationPhase;
        switch(this.type) {
            case 'chaser':
                this.mesh.position.y = this.position.y + Math.abs(Math.sin(t * 10)) * 0.15;
                this.mesh.rotation.z = Math.sin(t * 8) * 0.05;
                break;
            case 'swarmer':
                this.mesh.rotation.z = Math.sin(t * 20) * 0.15;
                this.mesh.position.y = this.position.y + Math.abs(Math.sin(t * 15)) * 0.1;
                if (this.legs) {
                    this.legs.forEach((leg, i) => {
                        leg.rotation.z = Math.sin(t * 15 + i * 1.5) * 0.2;
                    });
                }
                break;
            case 'ranged':
                this.mesh.position.y = this.position.y + Math.sin(t * 2) * 0.2;
                if (this.glowRing) {
                    this.glowRing.rotation.z = t * 0.5;
                }
                if (this.targetRing && this.targetRing.visible) {
                    this.targetRing.rotation.z += dt * 4;
                }
                if (this.orbitDots) {
                    this.orbitDots.forEach((dot, i) => {
                        dot.userData.angle += dt * 2;
                        const r = dot.userData.orbitRadius;
                        dot.position.x = Math.cos(dot.userData.angle) * r;
                        dot.position.z = Math.sin(dot.userData.angle) * r;
                        dot.position.y = this.mesh.children[0].position.y + Math.sin(t * 3 + i) * 0.1;
                    });
                }
                break;
            case 'tank':
                this.mesh.rotation.z = Math.sin(t * 1.5) * 0.02;
                if (this.leftEye) {
                    const pulse = 0.9 + Math.sin(t * 4) * 0.1;
                    this.leftEye.scale.setScalar(pulse);
                    this.rightEye.scale.setScalar(pulse);
                }
                break;
            case 'bruiser':
                const healthPercent = this.health / this.maxHealth;
                if (this.cracks) {
                    this.cracks.forEach((crack, i) => {
                        crack.visible = healthPercent < (1 - i * 0.15);
                    });
                }
                this.mesh.position.y = this.position.y + Math.abs(Math.sin(t * 1.5)) * 0.08;
                if (this.leftEye) {
                    const pulse = 1 + Math.sin(t * 5) * 0.2;
                    this.leftEye.scale.setScalar(pulse);
                    this.rightEye.scale.setScalar(pulse);
                }
                break;
        }
    }
    takeDamage(amount) {
        if (!this.isAlive) return;
        this.health -= amount;
        this.hitFlashTimer = 0.1;
        if (this.health <= 0) {
            this.die();
        }
    }
    attack(targetPos) {
        if (!this.canAttack || !this.isAlive) return null;
        this.canAttack = false;
        this.attackTimer = this.attackCooldown;
        if (this.type === 'ranged') {
            // Fire beam that tracks player
            this.createBeamWarning(targetPos);
            return { damage: 0 };
        }
        return { damage: this.damage };
    }

    createBeamWarning(playerPos) {
        const warningDuration = 0.8;
        const trackDuration = 0.5; // Track player for 0.5s, then lock for 0.3s
        const radius = this.beamRadius || 2.5;
        
        // Create warning circle on ground
        const warningGeom = new THREE.CircleGeometry(radius, 32);
        const warningMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const warningCircle = new THREE.Mesh(warningGeom, warningMat);
        warningCircle.position.set(playerPos.x, 0.05, playerPos.z);
        warningCircle.rotation.x = -Math.PI / 2;
        this.scene.add(warningCircle);
        
        // Create warning ring
        const ringGeom = new THREE.RingGeometry(radius * 0.9, radius * 1.1, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const warningRing = new THREE.Mesh(ringGeom, ringMat);
        warningRing.position.set(playerPos.x, 0.1, playerPos.z);
        warningRing.rotation.x = -Math.PI / 2;
        this.scene.add(warningRing);
        
        // Add to warning tracking
        if (this.enemyManager) {
            this.enemyManager.beamWarnings.push({
                playerPos: playerPos, // Reference to track player
                lockedPosition: null, // Will be set when tracking stops
                radius: radius,
                timer: 0,
                duration: warningDuration,
                trackDuration: trackDuration,
                circle: warningCircle,
                ring: warningRing,
                enemy: this
            });
        }
    }
    
    fireVerticalBeamImmediate(targetPos, beamRadius) {
        if (!this.isAlive) return;
        
        const groundPos = targetPos.clone();
        groundPos.y = 0.1;
        const beamHeight = 15; // Fixed height for visual consistency
        const radius = beamRadius || this.beamRadius || 2.5;
        const beamDuration = this.beamDuration || 1.5;
        
        // Create vertical beam visual
        const beamGeom = new THREE.CylinderGeometry(radius, radius, beamHeight, 12);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.position.copy(groundPos);
        beam.position.y = beamHeight / 2;
        this.scene.add(beam);
        
        // Create ground danger zone ring
        const ringGeom = new THREE.RingGeometry(radius * 0.8, radius * 1.1, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.copy(groundPos);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        // Add to hazard tracking
        if (this.enemyManager) {
            this.enemyManager.beamHazards.push({
                position: groundPos.clone(),
                radius: radius,
                damage: this.damage,
                lifetime: beamDuration,
                maxLifetime: beamDuration,
                mesh: beam,
                ring: ring
            });
        }
    }
    
    die() {
        this.isAlive = false;
        
        // Tank/Bruiser crush mechanic
        if ((this.type === 'tank' || this.type === 'bruiser') && this.enemyManager) {
            const crushRadius = this.type === 'tank' ? 4.5 : 6.0;
            const crushedEnemies = [];
            
            // Find all enemies in crush radius
            for (const enemy of this.enemyManager.enemies) {
                if (enemy === this || !enemy.isAlive) continue;
                
                const dist = this.position.distanceTo(enemy.position);
                if (dist <= crushRadius) {
                    crushedEnemies.push(enemy);
                }
            }
            
            // Crush all nearby enemies
            if (crushedEnemies.length > 0) {
                for (const enemy of crushedEnemies) {
                    enemy.health = 0;
                    enemy.isAlive = false;
                    enemy.wasCrushed = true;
                }
                
                // Track for score/feedback
                this.enemyManager.crushKillCount = crushedEnemies.length;
                this.enemyManager.crushKillTimer = 2.0;
                this.enemyManager.screenShake = this.type === 'tank' ? 0.4 : 0.6;
                
                // Create impact shockwave
                this.createCrushImpact(crushRadius);
            }
        }
    }
    
    createCrushImpact(radius) {
        // Main impact ring
        const ringGeom = new THREE.RingGeometry(0.5, radius * 1.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: this.type === 'tank' ? 0x1a1a1a : 0x0a0a0a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const impactRing = new THREE.Mesh(ringGeom, ringMat);
        impactRing.position.copy(this.position);
        impactRing.position.y = 0.15;
        impactRing.rotation.x = -Math.PI / 2;
        impactRing.userData.lifetime = 0.6;
        impactRing.userData.maxScale = 1.5;
        impactRing.userData.isCrushEffect = true;
        this.scene.add(impactRing);
        
        // Dust burst particles
        for (let i = 0; i < 20; i++) {
            const dustGeom = new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 6, 6);
            const dustMat = new THREE.MeshBasicMaterial({ 
                color: 0x8B7355,
                transparent: true,
                opacity: 0.7
            });
            const dust = new THREE.Mesh(dustGeom, dustMat);
            dust.position.copy(this.position);
            dust.position.y += 0.2;
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            dust.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                2 + Math.random() * 3,
                Math.sin(angle) * speed
            );
            dust.userData.lifetime = 0.5 + Math.random() * 0.3;
            dust.userData.isDust = true;
            this.scene.add(dust);
        }
    }
}
