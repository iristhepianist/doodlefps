class Player {
    constructor(camera, arena) {
        this.camera = camera;
        this.arena = arena;
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.height = 2;
        this.radius = 0.5;
        this.health = 100;
        this.maxHealth = 100;
        this.moveSpeed = 20;
        this.airSpeed = 16;
        this.jumpForce = 14;
        this.gravity = 42;
        this.groundAccel = 90;
        this.groundFriction = 16;
        this.airAccel = 18;
        this.airFriction = 1.0;
        this.momentumBank = 0;
        this.maxMomentumBank = 100;
        this.momentumGainRate = 0.8;
        this.momentumDecayRate = 0.3;
        this.lastSpeed = 0;
        this.lastDirection = new THREE.Vector3();
        this.turnBoostCooldown = 0;
        this.turnBoostMultiplier = 1.0;
        this.targetVelocity = new THREE.Vector3();
        this.velocitySmoothing = 0.15;
        this.overshootAmount = 0;
        this.snapBackForce = 0;
        this.airDodgeCooldown = 0;
        this.airDodgeCharges = 2;
        this.maxAirDodgeCharges = 2;
        this.dashSpeed = 65;
        this.dashDuration = 0.18;
        this.dashCooldown = 0.4;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.isDashing = false;
        this.dashDirection = new THREE.Vector3();
        this.dashCancelWindow = true;
        this.slideSpeed = 42;
        this.slideDuration = 0.7;
        this.slideMinSpeed = 14;
        this.slideDecel = 22;
        this.slideTimer = 0;
        this.isSliding = false;
        this.slideDirection = new THREE.Vector3();
        this.slideMomentum = 0;
        this.slideJumpSpeedBoost = 1.0;
        this.slideJumpBoostTimer = 0;
        this.smudgeLevel = 0;
        this.maxSmudgeLevel = 100;
        this.isSmudged = false;
        this.smudgeDuration = 0;
        this.smudgeDecayRate = 15;
        this.trailPoints = [];
        this.maxTrailPoints = 30;
        this.trailTimer = 0;
        this.isGrounded = false;
        this.isMoving = false;
        this.wasGrounded = false;
        this.isWallSliding = false;
        this.wallNormal = new THREE.Vector3();
        this.isWallRunning = false;
        this.wallRunTimer = 0;
        this.wallRunMaxTime = 2.0;
        this.wallRunSpeed = 20;
        this.wallRunExitTimer = 0;
        this.wallRunExitWindow = 1.0;
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            dash: false,
            slide: false
        };
        this.mouseSensitivity = 0.002;
        this.bobTime = 0;
        this.bobAmount = 0;
        this.cameraTilt = 0;
        this.targetCameraTilt = 0;
        this.coyoteTime = 0.12;
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.12;
        this.jumpBufferTimer = 0;
        this.speedLinesElement = document.getElementById('speed-lines');
    }
    reset() {
        this.position.set(0, 2, 0);
        this.velocity.set(0, 0, 0);
        this.rotation.set(0, 0, 0, 'YXZ');
        this.health = this.maxHealth;
        this.isGrounded = false;
        this.isDashing = false;
        this.isSliding = false;
        this.dashCooldownTimer = 0;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.momentumBank = 0;
        this.turnBoostCooldown = 0;
        this.turnBoostMultiplier = 1.0;
        this.overshootAmount = 0;
        this.isWallRunning = false;
        this.wallRunTimer = 0;
        this.snapBackForce = 0;
        this.airDodgeCharges = this.maxAirDodgeCharges;
        this.smudgeLevel = 0;
        this.isSmudged = false;
        this.smudgeDuration = 0;
        this.trailPoints = [];
        this.cameraTilt = 0;
        this.targetCameraTilt = 0;
        this.updateCamera();
    }
    handleKeyDown(code) {
        switch(code) {
            case 'KeyW': this.input.forward = true; break;
            case 'KeyS': this.input.backward = true; break;
            case 'KeyA': this.input.left = true; break;
            case 'KeyD': this.input.right = true; break;
            case 'Space': this.input.jump = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.input.dash = true; break;
            case 'KeyC': this.input.slide = true; break;
        }
    }
    handleKeyUp(code) {
        switch(code) {
            case 'KeyW': this.input.forward = false; break;
            case 'KeyS': this.input.backward = false; break;
            case 'KeyA': this.input.left = false; break;
            case 'KeyD': this.input.right = false; break;
            case 'Space': this.input.jump = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.input.dash = false; break;
            case 'KeyC': this.input.slide = false; break;
        }
    }
    handleMouseMove(dx, dy) {
        const turnSpeed = Math.abs(dx) * this.mouseSensitivity;
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        const curveFactor = 1.0 + Math.min(horizSpeed / 40, 0.15); 
        this.rotation.y -= dx * this.mouseSensitivity * curveFactor;
        this.rotation.x -= dy * this.mouseSensitivity;
        this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x));
        if (turnSpeed > 0.015 && this.turnBoostCooldown <= 0 && horizSpeed > 8) {
            this.turnBoostMultiplier = 1.0 + Math.min(turnSpeed * 20, 0.3);
            this.turnBoostCooldown = 0.3;
            this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + turnSpeed * 50);
        }
        this.targetCameraTilt += dx * 0.0003;
        this.targetCameraTilt = Math.max(-0.08, Math.min(0.08, this.targetCameraTilt));
    }
    fixedUpdate(dt) {
        this.updateMomentumBank(dt);
        this.updateSmudgeState(dt);
        this.updateTrailSystem(dt);
        if (this.turnBoostCooldown > 0) {
            this.turnBoostCooldown -= dt;
            this.turnBoostMultiplier = 1.0 + (this.turnBoostMultiplier - 1.0) * 0.9;
        }
        if (this.slideJumpBoostTimer > 0) {
            this.slideJumpBoostTimer -= dt;
            if (this.slideJumpBoostTimer <= 0) {
                this.slideJumpSpeedBoost = 1.0;
            } else {
                this.slideJumpSpeedBoost = 1.0 + (this.slideJumpSpeedBoost - 1.0) * Math.pow(0.98, dt * 60);
            }
        }
        this.cameraTilt += (this.targetCameraTilt - this.cameraTilt) * 0.15;
        this.targetCameraTilt *= 0.92;
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= dt;
        }
        if (this.isGrounded && this.airDodgeCharges < this.maxAirDodgeCharges) {
            this.airDodgeCooldown -= dt;
            if (this.airDodgeCooldown <= 0) {
                this.airDodgeCharges = this.maxAirDodgeCharges;
            }
        }
        if (this.wasGrounded && !this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
        }
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= dt;
        }
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= dt;
        }
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCancelWindow = false;
                this.isDashing = false;
                if (this.speedLinesElement) {
                    this.speedLinesElement.classList.remove('active');
                }
                this.velocity.x = this.dashDirection.x * this.moveSpeed * 1.2;
                this.velocity.z = this.dashDirection.z * this.moveSpeed * 1.2;
            } else {
                this.velocity.x = this.dashDirection.x * this.dashSpeed;
                this.velocity.z = this.dashDirection.z * this.dashSpeed;
            }
        }
        else if (this.isSliding) {
            this.slideTimer -= dt;
            this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + 25 * dt);
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                if (this.speedLinesElement) {
                    this.speedLinesElement.classList.remove('active');
                }
                if (window.game && window.game.sounds && window.game.sounds.sliding) {
                    window.game.sounds.sliding.pause();
                    window.game.sounds.sliding.currentTime = 0;
                }
                const exitSpeed = Math.max(this.slideMinSpeed, this.slideMomentum * 0.5);
                this.velocity.x = this.slideDirection.x * exitSpeed;
                this.velocity.z = this.slideDirection.z * exitSpeed;
            } else {
                const slideProgress = this.slideTimer / this.slideDuration;
                const speedCurve = slideProgress * (2 - slideProgress);
                const currentSpeed = this.slideMinSpeed + (this.slideMomentum - this.slideMinSpeed) * speedCurve;
                this.velocity.x = this.slideDirection.x * currentSpeed;
                this.velocity.z = this.slideDirection.z * currentSpeed;
                const yaw = this.rotation.y;
                const forwardX = -Math.sin(yaw);
                const forwardZ = -Math.cos(yaw);
                const rightX = Math.cos(yaw);
                const rightZ = -Math.sin(yaw);
                let steerX = 0, steerZ = 0;
                if (this.input.left) { steerX -= rightX; steerZ -= rightZ; }
                if (this.input.right) { steerX += rightX; steerZ += rightZ; }
                if (steerX !== 0 || steerZ !== 0) {
                    const steerForce = 6 * dt;
                    this.slideDirection.x += steerX * steerForce;
                    this.slideDirection.z += steerZ * steerForce;
                    this.slideDirection.normalize();
                }
            }
        }
        else {
            this.handleMovement(dt);
        }
        this.checkWallRunning(dt);
        if (this.isWallRunning) {
            this.handleWallRunning(dt);
        }
        this.handleActions(dt);
        if (!this.isGrounded && !this.isWallRunning) {
            this.velocity.y -= this.gravity * dt;
            this.velocity.y = Math.max(this.velocity.y, -50);
        }
        if (this.wallRunExitTimer > 0) {
            this.wallRunExitTimer -= dt;
        }
        this.wasGrounded = this.isGrounded;
        this.moveWithCollision(dt);
        this.updateCamera();
    }
    moveWithCollision(dt) {
        const oldX = this.position.x;
        this.position.x += this.velocity.x * dt;
        this.handleCollision('x', oldX);
        const oldZ = this.position.z;
        this.position.z += this.velocity.z * dt;
        this.handleCollision('z', oldZ);
        const oldY = this.position.y;
        this.position.y += this.velocity.y * dt;
        this.checkGround();
    }
    handleMovement(dt) {
        const yaw = this.rotation.y;
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        let moveX = 0;
        let moveZ = 0;
        if (this.input.forward) {
            moveX += forwardX;
            moveZ += forwardZ;
        }
        if (this.input.backward) {
            moveX -= forwardX;
            moveZ -= forwardZ;
        }
        if (this.input.left) {
            moveX -= rightX;
            moveZ -= rightZ;
        }
        if (this.input.right) {
            moveX += rightX;
            moveZ += rightZ;
        }
        this.isMoving = (moveX !== 0 || moveZ !== 0);
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        const currentDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
        if (this.isMoving) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= len;
            moveZ /= len;
            const newDir = new THREE.Vector3(moveX, 0, moveZ);
            const dirDot = currentDir.dot(newDir);
            if (dirDot < 0.5 && currentSpeed > 10 && this.isGrounded) {
                const turnMagnitude = (1 - dirDot) * 0.5;
                this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + turnMagnitude * 30);
            }
            const speed = (this.isGrounded ? this.moveSpeed : this.airSpeed) * this.turnBoostMultiplier * this.slideJumpSpeedBoost;
            const targetVelX = moveX * speed;
            const targetVelZ = moveZ * speed;
            const accel = this.isGrounded ? this.groundAccel : this.airAccel;
            const diffX = targetVelX - this.velocity.x;
            const diffZ = targetVelZ - this.velocity.z;
            const targetChange = Math.sqrt(diffX * diffX + diffZ * diffZ);
            if (targetChange > speed * 0.5) {
                this.overshootAmount = Math.min(0.3, targetChange / speed * 0.15);
            }
            const accelMult = 1.0 + this.overshootAmount;
            this.velocity.x += diffX * accel * accelMult * dt;
            this.velocity.z += diffZ * accel * accelMult * dt;
            this.overshootAmount *= 0.92;
            if (this.isSmudged) {
                const wobble = 0.05 * (this.smudgeLevel / this.maxSmudgeLevel);
                this.velocity.x += (Math.random() - 0.5) * wobble * currentSpeed;
                this.velocity.z += (Math.random() - 0.5) * wobble * currentSpeed;
            }
            if (!this.isDashing && !this.isSliding) {
                const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const maxSpeed = speed * (1 + this.momentumBank / this.maxMomentumBank * 0.3);
                if (horizSpeed > maxSpeed) {
                    const drag = 0.96 + this.overshootAmount * 0.02;
                    this.velocity.x *= drag;
                    this.velocity.z *= drag;
                }
            }
        } else if (this.isGrounded) {
            const friction = this.groundFriction;
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (speed > 0.1) {
                const drop = speed * friction * dt;
                const newSpeed = Math.max(0, speed - drop);
                const scale = newSpeed / speed;
                this.velocity.x *= scale;
                this.velocity.z *= scale;
            } else {
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
        }
        this.lastSpeed = currentSpeed;
        this.lastDirection.copy(currentDir);
    }
    handleActions(dt) {
        if (this.input.jump) {
            this.jumpBufferTimer = this.jumpBufferTime;
        }
        const canJump = this.isGrounded || this.coyoteTimer > 0 || this.isWallRunning;
        const wantsJump = this.jumpBufferTimer > 0;
        if (wantsJump && canJump && !this.isDashing) {
            const wasSliding = this.isSliding;
            const wasWallRunning = this.isWallRunning;
            const slideMomentumAtJump = this.slideMomentum;
            if (wasSliding) {
                this.isSliding = false;
                this.slideTimer = 0;
                if (this.speedLinesElement) {
                    this.speedLinesElement.classList.remove('active');
                }
                if (window.game && window.game.sounds && window.game.sounds.sliding) {
                    window.game.sounds.sliding.pause();
                    window.game.sounds.sliding.currentTime = 0;
                }
            }
            const momentumBonus = this.momentumBank / this.maxMomentumBank;
            let jumpPower = this.jumpForce * (1 + momentumBonus * 0.4);
            if (wasSliding && momentumBonus > 0.5) {
                const slideJumpBoost = momentumBonus * 1.5;
                jumpPower *= (1 + slideJumpBoost * 0.3);
                this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + momentumBonus * 35);
                this.slideJumpSpeedBoost = 1.0 + momentumBonus * 0.6;
                this.slideJumpBoostTimer = 2.5;
                const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const wallrunExtraBoost = (slideMomentumAtJump > this.slideSpeed) ? 1.3 : 1.0;
                const boostMult = (1.4 + momentumBonus * 0.4) * wallrunExtraBoost;
                this.velocity.x *= boostMult;
                this.velocity.z *= boostMult;
            }
            this.velocity.y = jumpPower;
            if (window.game && window.game.sounds && window.game.sounds.jump) {
                window.game.sounds.jump.currentTime = 0;
                window.game.sounds.jump.play().catch(() => {});
            }
            this.isGrounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.momentumBank *= 0.5;
            if (wasWallRunning) {
                this.isWallRunning = false;
                this.wallRunTimer = 0;
                if (this.speedLinesElement) {
                    this.speedLinesElement.classList.remove('active');
                }
                this.velocity.x += this.wallNormal.x * 15;
                this.velocity.z += this.wallNormal.z * 15;
                this.cameraTilt = 0;
                this.targetCameraTilt = 0;
            }
            if (this.isMoving && !wasSliding) {
                const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const boostMult = 1.15 + momentumBonus * 0.2;
                this.velocity.x *= boostMult;
                this.velocity.z *= boostMult;
            }
        }
        if (wantsJump && !this.isGrounded && this.airDodgeCharges > 0 && !this.isDashing) {
            this.performAirDodge();
            this.jumpBufferTimer = 0;
        }
        if (this.input.dash && this.dashCooldownTimer <= 0 && !this.isDashing && !this.isSliding) {
            this.startDash();
            this.input.dash = false;
        }
        if (this.input.slide && this.isGrounded && !this.isSliding && !this.isDashing) {
            const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (horizSpeed > 2 || this.isMoving) {
                this.startSlide();
            }
        }
    }
    startDash() {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
        this.dashCancelWindow = true;
        if (this.speedLinesElement) {
            this.speedLinesElement.classList.add('active');
        }
        if (window.game && window.game.sounds && window.game.sounds.jump) {
            const dashSound = window.game.sounds.jump.cloneNode();
            dashSound.volume = 0.3;
            dashSound.playbackRate = 0.8;
            dashSound.play().catch(() => {});
        }
        const momentumBonus = this.momentumBank / this.maxMomentumBank;
        const dashPower = this.dashSpeed * (1 + momentumBonus * 0.3);
        this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + 30);
        const yaw = this.rotation.y;
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        let dashX = 0;
        let dashZ = 0;
        if (this.input.forward) {
            dashX += forwardX;
            dashZ += forwardZ;
        }
        if (this.input.backward) {
            dashX -= forwardX;
            dashZ -= forwardZ;
        }
        if (this.input.left) {
            dashX -= rightX;
            dashZ -= rightZ;
        }
        if (this.input.right) {
            dashX += rightX;
            dashZ += rightZ;
        }
        if (dashX === 0 && dashZ === 0) {
            dashX = forwardX;
            dashZ = forwardZ;
        }
        const len = Math.sqrt(dashX * dashX + dashZ * dashZ);
        this.dashDirection.set(dashX / len, 0, dashZ / len);
        this.velocity.x = this.dashDirection.x * dashPower;
        this.velocity.z = this.dashDirection.z * dashPower;
        if (!this.isGrounded) {
            this.velocity.y = Math.max(this.velocity.y, 8);
        }
        this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + 15);
    }
    performAirDodge() {
        if (this.airDodgeCharges <= 0) return;
        this.airDodgeCharges--;
        this.airDodgeCooldown = 1.5;
        const yaw = this.rotation.y;
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        let dodgeX = 0, dodgeZ = 0;
        if (this.input.forward) { dodgeX += forwardX; dodgeZ += forwardZ; }
        if (this.input.backward) { dodgeX -= forwardX; dodgeZ -= forwardZ; }
        if (this.input.left) { dodgeX -= rightX; dodgeZ -= rightZ; }
        if (this.input.right) { dodgeX += rightX; dodgeZ += rightZ; }
        if (dodgeX === 0 && dodgeZ === 0) {
            dodgeX = forwardX;
            dodgeZ = forwardZ;
        }
        const len = Math.sqrt(dodgeX * dodgeX + dodgeZ * dodgeZ);
        dodgeX /= len;
        dodgeZ /= len;
        const airDodgePower = this.dashSpeed * 0.6;
        this.velocity.x = dodgeX * airDodgePower;
        this.velocity.z = dodgeZ * airDodgePower;
        this.velocity.y = Math.max(this.velocity.y, 3); 
        this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + 10);
    }
    startSlide() {
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        if (this.speedLinesElement) {
            this.speedLinesElement.classList.add('active');
        }
        if (window.game && window.game.sounds && window.game.sounds.sliding) {
            window.game.sounds.sliding.currentTime = 0;
            window.game.sounds.sliding.play().catch(() => {});
        }
        const wasRecentlyWallrunning = this.wallRunExitTimer > 0;
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (horizSpeed > 1) {
            this.slideDirection.set(this.velocity.x / horizSpeed, 0, this.velocity.z / horizSpeed);
        } else {
            const yaw = this.rotation.y;
            this.slideDirection.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        }
        const momentumBonus = this.momentumBank / this.maxMomentumBank;
        const wallrunBoost = wasRecentlyWallrunning ? 1.5 : 1.0;
        this.slideMomentum = (this.slideSpeed + Math.min(horizSpeed * 0.6, 18) + momentumBonus * 12) * wallrunBoost;
        this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + horizSpeed * 0.8 + 15);
        this.velocity.x = this.slideDirection.x * this.slideMomentum;
        this.velocity.z = this.slideDirection.z * this.slideMomentum;
        if (wasRecentlyWallrunning) {
            this.wallRunExitTimer = 0;
        }
        this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + 8);
    }
    handleCollision(axis, oldPos) {
        const bounds = this.arena.getBounds();
        if (axis === 'x') {
            if (this.position.x < bounds.minX + this.radius) {
                this.position.x = bounds.minX + this.radius;
                this.velocity.x = 0;
            }
            if (this.position.x > bounds.maxX - this.radius) {
                this.position.x = bounds.maxX - this.radius;
                this.velocity.x = 0;
            }
        } else if (axis === 'z') {
            if (this.position.z < bounds.minZ + this.radius) {
                this.position.z = bounds.minZ + this.radius;
                this.velocity.z = 0;
            }
            if (this.position.z > bounds.maxZ - this.radius) {
                this.position.z = bounds.maxZ - this.radius;
                this.velocity.z = 0;
            }
        }
        for (const obstacle of this.arena.obstacles) {
            if (this.collideWithBoxAxis(obstacle, axis, oldPos)) {
                break; 
            }
        }
    }
    collideWithBoxAxis(box, axis, oldPos) {
        const halfSize = box.size.clone().multiplyScalar(0.5);
        const minX = box.position.x - halfSize.x - this.radius;
        const maxX = box.position.x + halfSize.x + this.radius;
        const minY = box.position.y - halfSize.y;
        const maxY = box.position.y + halfSize.y;
        const minZ = box.position.z - halfSize.z - this.radius;
        const maxZ = box.position.z + halfSize.z + this.radius;
        const insideX = this.position.x > minX && this.position.x < maxX;
        const insideZ = this.position.z > minZ && this.position.z < maxZ;
        const insideY = this.position.y > minY && this.position.y < maxY + this.height;
        if (insideX && insideZ && insideY) {
            if (axis === 'x') {
                if (oldPos < box.position.x) {
                    this.position.x = minX;
                } else {
                    this.position.x = maxX;
                }
                this.velocity.x = 0;
                return true;
            } else if (axis === 'z') {
                if (oldPos < box.position.z) {
                    this.position.z = minZ;
                } else {
                    this.position.z = maxZ;
                }
                this.velocity.z = 0;
                return true;
            }
        }
        return false;
    }
    checkGround() {
        const groundY = this.arena.getGroundHeight(this.position.x, this.position.z);
        if (this.position.y <= groundY + this.height / 2) {
            this.position.y = groundY + this.height / 2;
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
            this.isGrounded = true;
        } else {
            let onObstacle = false;
            for (const obstacle of this.arena.obstacles) {
                if (this.isOnTopOf(obstacle)) {
                    onObstacle = true;
                    break;
                }
            }
            this.isGrounded = onObstacle;
        }
    }
    isOnTopOf(box) {
        const halfSize = box.size.clone().multiplyScalar(0.5);
        const topY = box.position.y + halfSize.y;
        if (this.position.x >= box.position.x - halfSize.x - this.radius &&
            this.position.x <= box.position.x + halfSize.x + this.radius &&
            this.position.z >= box.position.z - halfSize.z - this.radius &&
            this.position.z <= box.position.z + halfSize.z + this.radius) {
            if (this.position.y <= topY + this.height / 2 + 0.1 &&
                this.position.y >= topY + this.height / 2 - 0.5) {
                this.position.y = topY + this.height / 2;
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                }
                return true;
            }
        }
        return false;
    }
    checkWallRunning(dt) {
        if (this.isGrounded || this.isDashing || this.wallRunTimer >= this.wallRunMaxTime) {
            this.isWallRunning = false;
            this.wallRunTimer = 0;
            if (this.speedLinesElement && !this.isDashing && !this.isSliding) {
                this.speedLinesElement.classList.remove('active');
            }
            return;
        }
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (horizSpeed < 8 || this.velocity.y > 5) {
            this.isWallRunning = false;
            this.wallRunTimer = 0;
            if (this.speedLinesElement && !this.isDashing && !this.isSliding) {
                this.speedLinesElement.classList.remove('active');
            }
            return;
        }
        const checkDist = this.radius + 0.3;
        const bounds = this.arena.getBounds();
        const halfSize = this.arena.size / 2;
        let wallDetected = false;
        let normal = new THREE.Vector3();
        if (this.position.x <= -halfSize + checkDist) {
            wallDetected = true;
            normal.set(1, 0, 0);
        } else if (this.position.x >= halfSize - checkDist) {
            wallDetected = true;
            normal.set(-1, 0, 0);
        } else if (this.position.z <= -halfSize + checkDist) {
            wallDetected = true;
            normal.set(0, 0, 1);
        } else if (this.position.z >= halfSize - checkDist) {
            wallDetected = true;
            normal.set(0, 0, -1);
        }
        if (!wallDetected) {
            for (const obstacle of this.arena.obstacles) {
                const halfObstacle = obstacle.size.clone().multiplyScalar(0.5);
                const minX = obstacle.position.x - halfObstacle.x - checkDist;
                const maxX = obstacle.position.x + halfObstacle.x + checkDist;
                const minY = obstacle.position.y - halfObstacle.y;
                const maxY = obstacle.position.y + halfObstacle.y;
                const minZ = obstacle.position.z - halfObstacle.z - checkDist;
                const maxZ = obstacle.position.z + halfObstacle.z + checkDist;
                if (this.position.y > minY && this.position.y < maxY + this.height) {
                    if (Math.abs(this.position.x - minX) < 0.5 && 
                        this.position.z > obstacle.position.z - halfObstacle.z && 
                        this.position.z < obstacle.position.z + halfObstacle.z) {
                        wallDetected = true;
                        normal.set(1, 0, 0);
                        break;
                    } else if (Math.abs(this.position.x - maxX) < 0.5 && 
                               this.position.z > obstacle.position.z - halfObstacle.z && 
                               this.position.z < obstacle.position.z + halfObstacle.z) {
                        wallDetected = true;
                        normal.set(-1, 0, 0);
                        break;
                    } else if (Math.abs(this.position.z - minZ) < 0.5 && 
                               this.position.x > obstacle.position.x - halfObstacle.x && 
                               this.position.x < obstacle.position.x + halfObstacle.x) {
                        wallDetected = true;
                        normal.set(0, 0, 1);
                        break;
                    } else if (Math.abs(this.position.z - maxZ) < 0.5 && 
                               this.position.x > obstacle.position.x - halfObstacle.x && 
                               this.position.x < obstacle.position.x + halfObstacle.x) {
                        wallDetected = true;
                        normal.set(0, 0, -1);
                        break;
                    }
                }
            }
        }
        if (wallDetected && this.velocity.y < 5) {
            if (!this.isWallRunning) {
                this.isWallRunning = true;
                this.wallRunTimer = 0;
                this.wallNormal.copy(normal);
                if (this.speedLinesElement) {
                    this.speedLinesElement.classList.add('active');
                }
                this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + 20);
            } else {
                this.wallNormal.copy(normal);
            }
        } else {
            if (this.isWallRunning) {
                this.isWallRunning = false;
                this.wallRunExitTimer = this.wallRunExitWindow;
                if (this.speedLinesElement && !this.isDashing && !this.isSliding) {
                    this.speedLinesElement.classList.remove('active');
                }
            }
            this.wallRunTimer = 0;
        }
    }
    handleWallRunning(dt) {
        this.wallRunTimer += dt;
        if (this.wallRunTimer >= this.wallRunMaxTime) {
            this.isWallRunning = false;
            if (this.speedLinesElement) {
                this.speedLinesElement.classList.remove('active');
            }
            return;
        }
        this.velocity.y = Math.max(this.velocity.y, -2);
        const wallDir = new THREE.Vector3(-this.wallNormal.z, 0, this.wallNormal.x);
        const currentDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
        const dot = currentDir.dot(wallDir);
        const runDir = dot > 0 ? wallDir : wallDir.clone().negate();
        this.velocity.x = runDir.x * this.wallRunSpeed;
        this.velocity.z = runDir.z * this.wallRunSpeed;
        const tilt = dot > 0 ? 0.3 : -0.3;
        this.targetCameraTilt = tilt;
        this.cameraTilt += (this.targetCameraTilt - this.cameraTilt) * 0.15;
    }
    updateCamera() {
        if (this.isMoving && this.isGrounded && !this.isDashing && !this.isSliding && !this.isWallRunning) {
            this.bobTime += 0.15;
            this.bobAmount = Math.sin(this.bobTime) * 0.05;
        } else {
            this.bobAmount *= 0.9;
        }
        let heightOffset = 0;
        if (this.isSliding) {
            heightOffset = -0.5;
        }
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        const baseFOV = 90;
        const speedFOVBoost = Math.min(horizSpeed / 50, 0.15) * 10;
        this.camera.fov = baseFOV + speedFOVBoost + (this.isSmudged ? 5 : 0);
        this.camera.updateProjectionMatrix();
        this.camera.position.set(
            this.position.x,
            this.position.y + this.bobAmount + heightOffset,
            this.position.z
        );
        this.camera.rotation.copy(this.rotation);
        if (!this.isWallRunning) {
            this.cameraTilt *= 0.9;
        }
        this.camera.rotation.z = this.cameraTilt;
        if (this.isDashing || this.isSliding || this.isWallRunning) {
            const moveTilt = (this.velocity.x * Math.cos(this.rotation.y) - this.velocity.z * Math.sin(this.rotation.y)) * 0.002;
            this.camera.rotation.z += moveTilt;
        }
    }
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
        this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + amount * 0.5);
    }
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    dashCooldownPercent() {
        return Math.max(0, 1 - this.dashCooldownTimer / this.dashCooldown);
    }
    updateMomentumBank(dt) {
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (horizSpeed > this.moveSpeed * 0.8) {
            const gainRate = (horizSpeed / this.moveSpeed) * this.momentumGainRate;
            this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + gainRate * dt * 60);
        } else {
            this.momentumBank = Math.max(0, this.momentumBank - this.momentumDecayRate * dt * 60);
        }
    }
    updateSmudgeState(dt) {
        if (this.smudgeLevel > 0) {
            this.smudgeLevel = Math.max(0, this.smudgeLevel - this.smudgeDecayRate * dt);
        }
        if (this.smudgeLevel >= this.maxSmudgeLevel * 0.7 && !this.isSmudged) {
            this.isSmudged = true;
            this.smudgeDuration = 2.0;
        }
        if (this.isSmudged) {
            this.smudgeDuration -= dt;
            if (this.smudgeDuration <= 0 || this.smudgeLevel < this.maxSmudgeLevel * 0.3) {
                this.isSmudged = false;
            }
        }
    }
    getSmudgePowerMultiplier() {
        if (!this.isSmudged) return 1.0;
        return 1.0 + (this.smudgeLevel / this.maxSmudgeLevel) * 0.5; 
    }
    getSmudgeAccuracyPenalty() {
        if (!this.isSmudged) return 1.0;
        return 1.0 + (this.smudgeLevel / this.maxSmudgeLevel) * 0.8; 
    }
    updateTrailSystem(dt) {
        this.trailTimer += dt;
        const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (horizSpeed > 10 && this.trailTimer > 0.05) {
            this.trailTimer = 0;
            this.trailPoints.push({
                position: this.position.clone(),
                velocity: this.velocity.clone(),
                time: performance.now(),
                speed: horizSpeed,
                isDashing: this.isDashing,
                isSliding: this.isSliding,
                isSmudged: this.isSmudged
            });
            while (this.trailPoints.length > this.maxTrailPoints) {
                this.trailPoints.shift();
            }
        }
    }
    getTrailData() {
        return this.trailPoints;
    }
    canDashCancel() {
        return this.isDashing && this.dashCancelWindow && this.dashTimer < this.dashDuration * 0.7;
    }
    performDashCancel() {
        if (!this.canDashCancel()) return false;
        this.isDashing = false;
        this.dashCancelWindow = false;
        this.velocity.x *= 0.7;
        this.velocity.z *= 0.7;
        this.momentumBank = Math.min(this.maxMomentumBank, this.momentumBank + 20);
        return true;
    }
    applyRecoilTraversal(recoilX, recoilZ, recoilY = 0) {
        this.velocity.x += recoilX;
        this.velocity.z += recoilZ;
        this.velocity.y += recoilY;
        const recoilMagnitude = Math.sqrt(recoilX * recoilX + recoilZ * recoilZ + recoilY * recoilY);
        this.smudgeLevel = Math.min(this.maxSmudgeLevel, this.smudgeLevel + recoilMagnitude * 0.3);
    }
    getCurrentSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    }
    getMomentumPercent() {
        return (this.momentumBank / this.maxMomentumBank) * 100;
    }
    getSmudgePercent() {
        return (this.smudgeLevel / this.maxSmudgeLevel) * 100;
    }
}
