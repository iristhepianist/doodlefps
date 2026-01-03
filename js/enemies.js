class EnemyManager {
    constructor(scene, arena) {
        this.scene = scene;
        this.arena = arena;
        this.enemies = [];
        this.maxEnemies = 40;
        this.time = 0;
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
                damage: 20,
                speed: 3,
                attackRange: 35,
                preferredRange: 18,
                attackCooldown: 2.0,
                size: { x: 1.2, y: 1.5, z: 1.2 },
                color: 0x333333,
                scoreValue: 75,
                spawnWeight: 25
            },
            tank: {
                name: 'Inkblob',
                health: 250,
                damage: 35,
                speed: 2,
                attackRange: 3.5,
                attackCooldown: 1.5,
                size: { x: 2.2, y: 2.8, z: 2.2 },
                color: 0x0a0a0a,
                scoreValue: 150,
                spawnWeight: 10
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
                health: 400,
                damage: 50,
                speed: 1.5,
                attackRange: 4,
                attackCooldown: 2.5,
                size: { x: 3, y: 3.5, z: 3 },
                color: 0x050505,
                scoreValue: 250,
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
    }
    spawnEnemy(wave, playerPos) {
        if (this.enemies.filter(e => e.isAlive).length >= this.maxEnemies) {
            return;
        }
        const type = this.selectEnemyType(wave);
        const enemyDef = this.enemyTypes[type];
        const spawnCount = (type === 'swarmer' && wave >= 4) ? enemyDef.packSize : 1;
        for (let s = 0; s < spawnCount; s++) {
            if (this.enemies.filter(e => e.isAlive).length >= this.maxEnemies) break;
            let spawnPos;
            const bounds = this.arena.getBounds();
            let attempts = 0;
            do {
                spawnPos = new THREE.Vector3(
                    bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
                    enemyDef.size.y / 2,
                    bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
                );
                attempts++;
            } while (spawnPos.distanceTo(playerPos) < 15 && attempts < 20);
            if (s > 0) {
                spawnPos.x += (Math.random() - 0.5) * 3;
                spawnPos.z += (Math.random() - 0.5) * 3;
            }
            const enemy = new Enemy(this.scene, enemyDef, type, spawnPos);
            this.enemies.push(enemy);
        }
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
    fixedUpdate(dt, playerPos) {
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(dt, playerPos, this.arena);
            }
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].shouldRemove) {
                this.scene.remove(this.enemies[i].mesh);
                this.enemies.splice(i, 1);
            }
        }
    }
    update(dt) {
        this.time += dt;
        for (const enemy of this.enemies) {
            enemy.visualUpdate(dt, this.time);
        }
    }
    checkPlayerDamage(playerPos, playerRadius) {
        let totalDamage = 0;
        let shockwaveHit = false;
        for (const enemy of this.enemies) {
            if (enemy.isAlive && enemy.canAttack) {
                const dist = enemy.position.distanceTo(playerPos);
                if (dist < enemy.attackRange + playerRadius) {
                    const dmg = enemy.attack();
                    totalDamage += dmg;
                    if (enemy.type === 'bruiser' && !shockwaveHit) {
                        shockwaveHit = true;
                        enemy.triggerShockwave();
                    }
                }
            }
        }
        return totalDamage;
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
        const eyeGeom = new THREE.SphereGeometry(eyeRadius, 12, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: color });
        const eye = new THREE.Mesh(eyeGeom, eyeMat);
        eyeGroup.add(eye);
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide });
        const outline = new THREE.Mesh(eyeGeom.clone(), outlineMat);
        outline.scale.multiplyScalar(1.08);
        eyeGroup.add(outline);
        const pupilGeom = new THREE.SphereGeometry(pupilRadius, 8, 6);
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
        const bodyGeom = new THREE.SphereGeometry(radius, 16, 12);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.5;
        this.mesh.add(body);
        const outlineGeom = new THREE.SphereGeometry(radius * 1.06, 16, 12);
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
        const bodyGeom = new THREE.SphereGeometry(radius, 20, 16);
        const bodyMat = new THREE.MeshBasicMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = def.size.y * 0.5;
        this.mesh.add(body);
        const outlineGeom = new THREE.SphereGeometry(radius * 1.05, 20, 16);
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
                new THREE.SphereGeometry(0.1, 8, 6),
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
    attack() {
        if (!this.canAttack || !this.isAlive) return 0;
        this.canAttack = false;
        this.attackTimer = this.attackCooldown;
        if (this.type === 'ranged') {
            const projGeom = new THREE.SphereGeometry(0.3, 8, 8);
            const projMat = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.9
            });
            const proj = new THREE.Mesh(projGeom, projMat);
            proj.position.copy(this.position);
            proj.position.y += this.size.y / 2;
            this.scene.add(proj);
            const glowGeom = new THREE.SphereGeometry(0.5, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeom, glowMat);
            glow.position.copy(proj.position);
            this.scene.add(glow);
            setTimeout(() => {
                this.scene.remove(proj);
                this.scene.remove(glow);
            }, 500);
        }
        return this.damage;
    }
    die() {
        this.isAlive = false;
    }
}
