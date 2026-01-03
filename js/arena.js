class Arena {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.size = 100;
        this.wallHeight = 20;
        this.createArena();
    }
    createArena() {
        const floorMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf5f0e6, 
            side: THREE.DoubleSide
        });
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xe8e3d9 
        });
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x1a1a1a,
            linewidth: 2
        });
        const floorGeom = new THREE.PlaneGeometry(this.size, this.size);
        const floor = new THREE.Mesh(floorGeom, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.userData.isArena = true;
        this.scene.add(floor);
        this.addNotebookLines();
        this.addWalls(wallMaterial, lineMaterial);
        this.addObstacles();
    }
    addNotebookLines() {
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xaaccff,
            opacity: 0.3,
            transparent: true
        });
        const lineSpacing = 2;
        const halfSize = this.size / 2;
        for (let z = -halfSize; z <= halfSize; z += lineSpacing) {
            const points = [
                new THREE.Vector3(-halfSize, 0.01, z),
                new THREE.Vector3(halfSize, 0.01, z)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.scene.add(line);
        }
        const marginMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffaaaa,
            opacity: 0.4,
            transparent: true
        });
        const marginPoints = [
            new THREE.Vector3(-halfSize + 5, 0.02, -halfSize),
            new THREE.Vector3(-halfSize + 5, 0.02, halfSize)
        ];
        const marginGeom = new THREE.BufferGeometry().setFromPoints(marginPoints);
        const marginLine = new THREE.Line(marginGeom, marginMaterial);
        this.scene.add(marginLine);
    }
    addWalls(wallMaterial, lineMaterial) {
        const halfSize = this.size / 2;
        const wallGeom = new THREE.PlaneGeometry(this.size, this.wallHeight);
        const walls = [
            { pos: [0, this.wallHeight / 2, -halfSize], rot: [0, 0, 0] },
            { pos: [0, this.wallHeight / 2, halfSize], rot: [0, Math.PI, 0] },
            { pos: [-halfSize, this.wallHeight / 2, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [halfSize, this.wallHeight / 2, 0], rot: [0, -Math.PI / 2, 0] }
        ];
        walls.forEach(wallData => {
            const wall = new THREE.Mesh(wallGeom, wallMaterial);
            wall.position.set(...wallData.pos);
            wall.rotation.set(...wallData.rot);
            wall.userData.isArena = true;
            this.scene.add(wall);
            const edges = new THREE.EdgesGeometry(wallGeom);
            const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
            edgeMesh.position.copy(wall.position);
            edgeMesh.rotation.copy(wall.rotation);
            this.scene.add(edgeMesh);
        });
    }
    addObstacles() {
        this.addBox(0, 2.5, 0, 5, 5, 5);
        this.addBox(-35, 2, -35, 5, 4, 5);
        this.addBox(35, 2, -35, 5, 4, 5);
        this.addBox(-35, 2, 35, 5, 4, 5);
        this.addBox(35, 2, 35, 5, 4, 5);
        this.addBox(-22, 1.5, 0, 3, 3, 10);
        this.addBox(22, 1.5, 0, 3, 3, 10);
        this.addBox(0, 1.5, -22, 10, 3, 3);
        this.addBox(0, 1.5, 22, 10, 3, 3);
        this.addBox(-12, 0.4, -12, 3, 0.8, 3);
        this.addBox(12, 0.4, -12, 3, 0.8, 3);
        this.addBox(-12, 0.4, 12, 3, 0.8, 3);
        this.addBox(12, 0.4, 12, 3, 0.8, 3);
    }
    addBox(x, y, z, width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const fillMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf0ebe1
        });
        const fill = new THREE.Mesh(geometry, fillMaterial);
        fill.position.set(x, y, z);
        fill.userData.isObstacle = true;
        this.scene.add(fill);
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
        const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
        edgeMesh.position.set(x, y, z);
        this.scene.add(edgeMesh);
        this.obstacles.push({
            position: new THREE.Vector3(x, y, z),
            size: new THREE.Vector3(width, height, depth)
        });
    }
    addRamp(x, y, z, width, height, length, rotationY) {
        const geometry = new THREE.BoxGeometry(width, height, length);
        const fillMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf0ebe1
        });
        const ramp = new THREE.Mesh(geometry, fillMaterial);
        ramp.position.set(x, y + height / 2, z);
        ramp.rotation.y = rotationY;
        ramp.userData.isObstacle = true;
        this.scene.add(ramp);
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
        const edgeMesh = new THREE.LineSegments(edges, lineMaterial);
        edgeMesh.position.copy(ramp.position);
        edgeMesh.rotation.copy(ramp.rotation);
        this.scene.add(edgeMesh);
        this.obstacles.push({
            position: new THREE.Vector3(x, y + height / 2, z),
            size: new THREE.Vector3(width, height, length)
        });
    }
    getBounds() {
        const halfSize = this.size / 2;
        return {
            minX: -halfSize,
            maxX: halfSize,
            minZ: -halfSize,
            maxZ: halfSize
        };
    }
    getGroundHeight(x, z) {
        return 0;
    }
}
