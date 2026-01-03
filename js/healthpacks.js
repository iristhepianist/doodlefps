class HealthPackManager {
    constructor(scene, arena) {
        this.scene = scene;
        this.arena = arena;
        this.healthPacks = [];
        this.spawnLocations = [
            { x: -40, z: -40 },
            { x: 40, z: -40 },
            { x: -40, z: 40 },
            { x: 40, z: 40 },
            { x: 0, z: -30 },
            { x: 0, z: 30 },
            { x: -30, z: 0 },
            { x: 30, z: 0 }
        ];
    }
    spawnHealthPacks() {
        this.clearHealthPacks();
        this.spawnLocations.forEach(loc => {
            this.createHealthPack(loc.x, loc.z);
        });
    }
    createHealthPack(x, z) {
        const healthPack = {
            position: new THREE.Vector3(x, 0.8, z),
            mesh: new THREE.Group(),
            bobPhase: Math.random() * Math.PI * 2,
            rotationSpeed: 2,
            collected: false
        };
        const crossSize = 0.6;
        const crossThickness = 0.2;
        const healthColor = 0x00ff00;
        const verticalBar = new THREE.Mesh(
            new THREE.BoxGeometry(crossThickness, crossSize, crossThickness),
            new THREE.MeshBasicMaterial({ color: healthColor })
        );
        const horizontalBar = new THREE.Mesh(
            new THREE.BoxGeometry(crossSize, crossThickness, crossThickness),
            new THREE.MeshBasicMaterial({ color: healthColor })
        );
        healthPack.mesh.add(verticalBar);
        healthPack.mesh.add(horizontalBar);
        const outlineVert = new THREE.Mesh(
            new THREE.BoxGeometry(crossThickness * 1.15, crossSize * 1.15, crossThickness * 1.15),
            new THREE.MeshBasicMaterial({ color: 0x00aa00, side: THREE.BackSide })
        );
        const outlineHoriz = new THREE.Mesh(
            new THREE.BoxGeometry(crossSize * 1.15, crossThickness * 1.15, crossThickness * 1.15),
            new THREE.MeshBasicMaterial({ color: 0x00aa00, side: THREE.BackSide })
        );
        healthPack.mesh.add(outlineVert);
        healthPack.mesh.add(outlineHoriz);
        const glowRing = new THREE.Mesh(
            new THREE.RingGeometry(0.8, 1.0, 32),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.3 
            })
        );
        glowRing.rotation.x = -Math.PI / 2;
        glowRing.position.y = -0.7;
        healthPack.mesh.add(glowRing);
        healthPack.glowRing = glowRing;
        healthPack.mesh.position.copy(healthPack.position);
        this.scene.add(healthPack.mesh);
        this.healthPacks.push(healthPack);
    }
    update(dt, playerPos, isIntermission = false) {
        for (let i = this.healthPacks.length - 1; i >= 0; i--) {
            const pack = this.healthPacks[i];
            if (pack.collected) continue;
            pack.bobPhase += dt * 2;
            pack.mesh.position.y = pack.position.y + Math.sin(pack.bobPhase) * 0.15;
            pack.mesh.rotation.y += dt * pack.rotationSpeed;
            if (pack.glowRing) {
                pack.glowRing.rotation.z += dt * 1.5;
            }
            if (!isIntermission) continue;
            const dist = new THREE.Vector2(
                playerPos.x - pack.position.x,
                playerPos.z - pack.position.z
            ).length();
            if (dist < 1.5) {
                pack.collected = true;
                this.scene.remove(pack.mesh);
                this.healthPacks.splice(i, 1);
                if (window.game && window.game.sounds && window.game.sounds.healthpack) {
                    window.game.sounds.healthpack.currentTime = 0;
                    window.game.sounds.healthpack.play().catch(() => {});
                }
                return { collected: true, healAmount: 50 };
            }
        }
        return { collected: false };
    }
    clearHealthPacks() {
        this.healthPacks.forEach(pack => {
            this.scene.remove(pack.mesh);
        });
        this.healthPacks = [];
    }
    reset() {
        this.clearHealthPacks();
    }
}
