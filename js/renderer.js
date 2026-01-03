class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f0e6); 
        this.camera = new THREE.PerspectiveCamera(
            90, 
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 0);
        this.webglRenderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, 
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.webglRenderer.shadowMap.enabled = false;
        this.jitterAmount = 0;
        this.basePosition = new THREE.Vector3();
        this.time = 0;
        this.setupPostProcessing();
    }
    setupPostProcessing() {
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                samples: 4 
            }
        );
        this.sketchShader = {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                jitterAmount: { value: 0.002 },
                noiseAmount: { value: 0.03 },
                motionBlur: { value: 0.0 },
                motionDir: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform vec2 resolution;
                uniform float jitterAmount;
                uniform float noiseAmount;
                uniform float motionBlur;
                uniform vec2 motionDir;
                varying vec2 vUv;
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                void main() {
                    float wobbleFreq = 3.0;
                    float wobbleTime = time * 2.0;
                    vec2 jitteredUv = vUv;
                    jitteredUv.x += sin(vUv.y * wobbleFreq + wobbleTime) * jitterAmount;
                    jitteredUv.y += cos(vUv.x * wobbleFreq + wobbleTime) * jitterAmount;
                    vec4 color = vec4(0.0);
                    if (motionBlur > 0.01) {
                        int samples = 8;
                        vec2 blurDir = motionDir * motionBlur * 0.03;
                        for (int i = 0; i < 8; i++) {
                            float t = float(i) / 7.0 - 0.5;
                            color += texture2D(tDiffuse, jitteredUv + blurDir * t);
                        }
                        color /= 8.0;
                    } else {
                        color = texture2D(tDiffuse, jitteredUv);
                    }
                    float grain = noise(vUv * resolution * 0.5 + time * 10.0) * noiseAmount;
                    color.rgb += grain - noiseAmount * 0.5;
                    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
                    float edgeDarken = smoothstep(0.0, 0.1, edgeDist);
                    color.rgb *= 0.9 + 0.1 * edgeDarken;
                    gl_FragColor = color;
                }
            `
        };
        this.postMaterial = new THREE.ShaderMaterial(this.sketchShader);
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.postQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.postMaterial
        );
        this.postScene.add(this.postQuad);
    }
    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.webglRenderer.setSize(width, height);
        this.renderTarget.setSize(width, height);
        this.sketchShader.uniforms.resolution.value.set(width, height);
    }
    applyJitter(isMoving, screenShake = 0) {
        if (isMoving) {
            this.jitterAmount = Math.min(this.jitterAmount + 0.01, 0.015);
        } else {
            this.jitterAmount = Math.max(this.jitterAmount - 0.02, 0.003);
        }
        const totalShake = this.jitterAmount + screenShake;
        this.camera.rotation.z = (Math.random() - 0.5) * totalShake;
        this.sketchShader.uniforms.jitterAmount.value = 0.001 + totalShake * 0.05;
    }
    render() {
        this.time += 0.016;
        this.sketchShader.uniforms.time.value = this.time;
        this.webglRenderer.setRenderTarget(this.renderTarget);
        this.webglRenderer.render(this.scene, this.camera);
        this.sketchShader.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.webglRenderer.setRenderTarget(null);
        this.webglRenderer.render(this.postScene, this.postCamera);
    }
    static createOutlinedMesh(geometry, color = 0x1a1a1a, outlineColor = 0x1a1a1a) {
        const group = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
            color: outlineColor,
            wireframe: true,
            wireframeLinewidth: 2
        });
        const outline = new THREE.Mesh(geometry, outlineMaterial);
        outline.scale.multiplyScalar(1.02);
        group.add(outline);
        return group;
    }
    static createEdgeOutline(geometry, fillColor = 0xf5f0e6, edgeColor = 0x1a1a1a) {
        const group = new THREE.Group();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: edgeColor,
            side: THREE.BackSide
        });
        const outline = new THREE.Mesh(geometry.clone(), outlineMaterial);
        outline.scale.multiplyScalar(1.05);
        group.add(outline);
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: fillColor
        });
        const fill = new THREE.Mesh(geometry, fillMaterial);
        group.add(fill);
        return group;
    }
    initTrailSystem() {
        this.trailLines = [];
        this.trailMaterial = new THREE.LineBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.4,
            linewidth: 2
        });
        this.trailGroup = new THREE.Group();
        this.scene.add(this.trailGroup);
    }
    updateTrails(trailData) {
        if (!this.trailGroup) {
            this.initTrailSystem();
        }
        if (!trailData || trailData.length < 2) return;
        while (this.trailGroup.children.length > 0) {
            const child = this.trailGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            this.trailGroup.remove(child);
        }
        const points = trailData.map(p => new THREE.Vector3(p.x, p.y - 0.5, p.z));
        for (let i = 1; i < points.length; i++) {
            const alpha = (i / points.length) * 0.3; 
            const segmentMaterial = new THREE.LineBasicMaterial({
                color: 0x1a1a1a,
                transparent: true,
                opacity: alpha
            });
            const geometry = new THREE.BufferGeometry().setFromPoints([points[i-1], points[i]]);
            const line = new THREE.Line(geometry, segmentMaterial);
            this.trailGroup.add(line);
        }
        this.trailGroup.children.forEach((line, idx) => {
            const wobble = Math.sin(this.time * 5 + idx * 0.3) * 0.02;
            line.position.y += wobble;
        });
    }
    renderSmudgeEffect(isSmudged, smudgePercent) {
        if (isSmudged && smudgePercent > 70) {
            this.sketchShader.uniforms.noiseAmount.value = 0.03 + (smudgePercent / 100) * 0.05;
            this.sketchShader.uniforms.jitterAmount.value += 0.003;
        }
    }
    setMotionBlur(amount, dirX = 0, dirZ = 0) {
        this.sketchShader.uniforms.motionBlur.value = amount;
        this.sketchShader.uniforms.motionDir.value.set(dirX, dirZ);
    }
}
