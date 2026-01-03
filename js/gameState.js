class GameState {
    constructor() {
        this.reset();
    }
    reset() {
        this.score = 0;
        this.wave = 1;
        this.kills = 0;
        this.killsThisWave = 0;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.baseSpawnInterval = 1.5;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesPerWave = this.getEnemiesForWave(1);
        this.difficultyMultiplier = 1.0;
        this.isIntermission = false;
        this.intermissionTimer = 0;
        this.intermissionDuration = 8;
    }
    update(dt) {
        if (this.isIntermission) {
            this.intermissionTimer += dt;
            if (this.intermissionTimer >= this.intermissionDuration) {
                this.endIntermission();
            }
            return;
        }
        this.spawnTimer += dt;
        this.difficultyMultiplier = 1 + (this.wave - 1) * 0.15;
    }
    advanceWave() {
        this.wave++;
        this.killsThisWave = 0;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesPerWave = this.getEnemiesForWave(this.wave);
        this.score += this.wave * 100;
    }
    getEnemiesForWave(wave) {
        return 8 + (wave - 1) * 3;
    }
    getSpawnInterval() {
        return Math.max(0.5, this.baseSpawnInterval / this.difficultyMultiplier);
    }
    shouldSpawnEnemy() {
        if (this.enemiesSpawnedThisWave >= this.enemiesPerWave) {
            return false;
        }
        if (this.spawnTimer >= this.getSpawnInterval()) {
            return true;
        }
        return false;
    }
    enemySpawned() {
        this.spawnTimer = 0;
        this.enemiesSpawnedThisWave++;
    }
    addScore(points, multiplier = 1.0) {
        this.score += Math.floor(points * this.difficultyMultiplier * multiplier);
    }
    addKill() {
        this.kills++;
        this.killsThisWave++;
    }
    startIntermission() {
        this.isIntermission = true;
        this.intermissionTimer = 0;
    }
    endIntermission() {
        this.isIntermission = false;
        this.intermissionTimer = 0;
        this.advanceWave();
        if (this.healthPackManager) {
            this.healthPackManager.clearHealthPacks();
        }
    }
    getEnemiesRemaining() {
        return this.enemiesPerWave - this.killsThisWave;
    }
}
