class Minimap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 150;
        this.canvas.height = 150;
        this.scale = 2;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.arenaSize = 50;
        this.enemyColors = {
            chaser: '#1a1a1a',    
            swarmer: '#666666',   
            ranged: '#3366aa',    
            tank: '#aa3333',      
            bruiser: '#aa0000'    
        };
        this.enemySizes = {
            chaser: 4,
            swarmer: 3,
            ranged: 5,
            tank: 7,
            bruiser: 9
        };
        this.bgColor = 'rgba(245, 240, 230, 0.92)';
        this.borderColor = '#1a1a1a';
        this.playerColor = '#1a1a1a';
        this.gridColor = 'rgba(100, 100, 100, 0.15)';
        this.smoothEnemyPositions = new Map();
        this.time = 0;
    }
    update(playerPos, playerRotation, enemies, dt = 0.016) {
        this.time += dt;
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawArenaBorder();
        for (const enemy of enemies) {
            if (enemy.isAlive || enemy.health !== undefined) {
                this.drawEnemy(enemy, playerPos, dt);
            }
        }
        this.drawPlayer(playerRotation);
        this.drawBorder();
    }
    drawGrid() {
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;
        const gridSpacing = 15;
        for (let x = 0; x < this.canvas.width; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        this.ctx.strokeStyle = 'rgba(180, 180, 220, 0.3)';
        for (let y = 0; y < this.canvas.height; y += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    drawArenaBorder() {
        this.ctx.strokeStyle = this.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        const size = this.arenaSize * this.scale;
        this.ctx.strokeRect(
            Math.max(2, this.centerX - size / 2),
            Math.max(2, this.centerY - size / 2),
            Math.min(this.canvas.width - 4, size),
            Math.min(this.canvas.height - 4, size)
        );
        this.ctx.setLineDash([]);
    }
    drawPlayer(rotation) {
        const x = this.centerX;
        const y = this.centerY;
        const size = 8;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(-rotation + Math.PI);
        this.ctx.shadowColor = '#1a1a1a';
        this.ctx.shadowBlur = 3;
        this.ctx.fillStyle = this.playerColor;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(-size * 0.6, size * 0.6);
        this.ctx.lineTo(0, size * 0.3);
        this.ctx.lineTo(size * 0.6, size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#f5f0e6';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    }
    drawEnemy(enemy, playerPos, dt) {
        const id = enemy.position.x + ',' + enemy.position.z;
        let smoothPos = this.smoothEnemyPositions.get(id);
        if (!smoothPos) {
            smoothPos = { x: enemy.position.x, z: enemy.position.z };
            this.smoothEnemyPositions.set(id, smoothPos);
        }
        const lerpSpeed = 10 * dt;
        smoothPos.x += (enemy.position.x - smoothPos.x) * lerpSpeed;
        smoothPos.z += (enemy.position.z - smoothPos.z) * lerpSpeed;
        const relX = (smoothPos.x - playerPos.x) * this.scale;
        const relZ = (smoothPos.z - playerPos.z) * this.scale;
        const x = this.centerX + relX;
        const y = this.centerY - relZ;
        const margin = 10;
        if (x < -margin || x > this.canvas.width + margin || 
            y < -margin || y > this.canvas.height + margin) {
            this.drawEdgeIndicator(x, y, enemy.type);
            return;
        }
        const type = enemy.type || 'chaser';
        const color = this.enemyColors[type] || this.enemyColors.chaser;
        const baseSize = this.enemySizes[type] || 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        const pulseScale = healthPercent < 0.5 ? 1 + Math.sin(this.time * 10) * 0.2 : 1;
        const size = baseSize * pulseScale;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#f5f0e6';
        this.ctx.lineWidth = 1;
        switch(type) {
            case 'chaser':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -size);
                this.ctx.lineTo(-size, size);
                this.ctx.lineTo(size, size);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'swarmer':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -size);
                this.ctx.lineTo(-size, 0);
                this.ctx.lineTo(0, size);
                this.ctx.lineTo(size, 0);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 'ranged':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.fillStyle = '#f5f0e6';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'tank':
                this.ctx.fillRect(-size, -size, size * 2, size * 2);
                this.ctx.strokeRect(-size, -size, size * 2, size * 2);
                break;
            case 'bruiser':
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(-size, -size);
                this.ctx.lineTo(size, size);
                this.ctx.moveTo(size, -size);
                this.ctx.lineTo(-size, size);
                this.ctx.stroke();
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            default:
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size, 0, Math.PI * 2);
                this.ctx.fill();
        }
        if (type !== 'swarmer' && healthPercent < 1) {
            this.ctx.fillStyle = healthPercent > 0.5 ? '#55aa55' : (healthPercent > 0.25 ? '#aaaa55' : '#aa5555');
            const barWidth = size * 2;
            const barHeight = 2;
            this.ctx.fillRect(-barWidth/2, size + 2, barWidth * healthPercent, barHeight);
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(-barWidth/2, size + 2, barWidth, barHeight);
        }
        this.ctx.restore();
    }
    drawEdgeIndicator(x, y, type) {
        const margin = 8;
        const clampedX = Math.max(margin, Math.min(this.canvas.width - margin, x));
        const clampedY = Math.max(margin, Math.min(this.canvas.height - margin, y));
        if (clampedX === x && clampedY === y) return;
        const color = this.enemyColors[type] || this.enemyColors.chaser;
        this.ctx.save();
        this.ctx.translate(clampedX, clampedY);
        const angle = Math.atan2(y - clampedY, x - clampedX);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(6, 0);
        this.ctx.lineTo(-2, -4);
        this.ctx.lineTo(-2, 4);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
    drawBorder() {
        this.ctx.strokeStyle = this.borderColor;
        this.ctx.lineWidth = 3;
        const wobble = Math.sin(this.time * 2) * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(1 + wobble, 1);
        this.ctx.lineTo(this.canvas.width - 1, 1 - wobble);
        this.ctx.lineTo(this.canvas.width - 1 + wobble, this.canvas.height - 1);
        this.ctx.lineTo(1, this.canvas.height - 1 + wobble);
        this.ctx.closePath();
        this.ctx.stroke();
    }
    cleanupSmoothPositions(enemies) {
        const activeIds = new Set();
        for (const enemy of enemies) {
            if (enemy.isAlive) {
                activeIds.add(enemy.position.x + ',' + enemy.position.z);
            }
        }
        for (const [id] of this.smoothEnemyPositions) {
            if (!activeIds.has(id)) {
                this.smoothEnemyPositions.delete(id);
            }
        }
    }
}
