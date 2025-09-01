class RiverRaidGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Stan gry
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.fuel = 100;
        this.gameSpeed = 2;
        this.lastTime = 0;

        // Gracz
        this.player = {
            x: this.width / 2 - 15,
            y: this.height - 80,
            width: 30,
            height: 40,
            speed: 5,
            bullets: []
        };

        // Wrogowie i przeszkody
        this.enemies = [];
        this.obstacles = [];
        this.fuelTanks = [];
        this.explosions = [];
        this.particles = [];

        // River (brzegi rzeki)
        this.riverLeft = 100;
        this.riverRight = this.width - 100;
        this.riverWidth = this.riverRight - this.riverLeft;

        // Kontrole
        this.keys = {};
        this.setupControls();
        this.setupUI();

        // Timery
        this.enemySpawnTimer = 0;
        this.obstacleSpawnTimer = 0;
        this.fuelTankSpawnTimer = 0;
        this.fuelDecreaseTimer = 0;

        this.gameLoop();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupUI() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.resetGame();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }

    restartGame() {
        document.getElementById('gameOver').classList.add('hidden');
        this.startGame();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.fuel = 100;
        this.gameSpeed = 2;

        this.player.x = this.width / 2 - 15;
        this.player.y = this.height - 80;
        this.player.bullets = [];

        this.enemies = [];
        this.obstacles = [];
        this.fuelTanks = [];
        this.explosions = [];
        this.particles = [];

        this.enemySpawnTimer = 0;
        this.obstacleSpawnTimer = 0;
        this.fuelTankSpawnTimer = 0;
        this.fuelDecreaseTimer = 0;

        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('fuel').textContent = Math.max(0, Math.floor(this.fuel));
        document.getElementById('lives').textContent = this.lives;
    }

    handleInput() {
        if (this.gameState !== 'playing') return;

        // Ruch gracza
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x += this.player.speed;
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.player.y -= this.player.speed;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.player.y += this.player.speed;
        }

        // Ograniczenia ruchu gracza
        this.player.x = Math.max(this.riverLeft + 10, Math.min(this.riverRight - this.player.width - 10, this.player.x));
        this.player.y = Math.max(50, Math.min(this.height - this.player.height - 10, this.player.y));
    }

    shoot() {
        if (this.gameState !== 'playing') return;

        this.player.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 10,
            speed: 8
        });
    }

    spawnEnemies() {
        this.enemySpawnTimer += 16;
        if (this.enemySpawnTimer > 1500 - (this.gameSpeed * 100)) {
            this.enemySpawnTimer = 0;

            // Spawn różnych typów wrogów z ruchem poziomym
            const enemyType = Math.random();
            const side = Math.random() < 0.5 ? 'left' : 'right';
            let enemy;

            if (enemyType < 0.6) {
                // Zwykły wróg
                enemy = {
                    x: side === 'left' ? this.riverLeft - 25 : this.riverRight + 25,
                    y: Math.random() * (this.height - 150) + 50,
                    width: 25,
                    height: 25,
                    speed: 1.5 + Math.random() * 1.5,
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'normal',
                    color: '#ff4444',
                    side: side
                };
            } else if (enemyType < 0.8) {
                // Szybki wróg
                enemy = {
                    x: side === 'left' ? this.riverLeft - 20 : this.riverRight + 20,
                    y: Math.random() * (this.height - 150) + 50,
                    width: 20,
                    height: 20,
                    speed: 2.5 + Math.random() * 2,
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'fast',
                    color: '#ff8844',
                    side: side
                };
            } else {
                // Duży wróg
                enemy = {
                    x: side === 'left' ? this.riverLeft - 40 : this.riverRight + 40,
                    y: Math.random() * (this.height - 150) + 50,
                    width: 40,
                    height: 30,
                    speed: 1 + Math.random() * 1,
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'big',
                    color: '#ff0000',
                    health: 3,
                    side: side
                };
            }

            this.enemies.push(enemy);
        }
    }

    spawnObstacles() {
        this.obstacleSpawnTimer += 16;
        if (this.obstacleSpawnTimer > 2000) {
            this.obstacleSpawnTimer = 0;

            // Przeszkody poruszające się poziomo przez rzekę
            if (Math.random() < 0.7) {
                const side = Math.random() < 0.5 ? 'left' : 'right';
                const obstacle = {
                    x: side === 'left' ? this.riverLeft - 30 : this.riverRight + 30,
                    y: Math.random() * (this.height - 100) + 50,
                    width: 30,
                    height: 40,
                    speed: 2 + Math.random() * 2,
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'rock',
                    side: side
                };
                this.obstacles.push(obstacle);
            }
        }
    }

    spawnFuelTanks() {
        this.fuelTankSpawnTimer += 16;
        if (this.fuelTankSpawnTimer > 8000) {
            this.fuelTankSpawnTimer = 0;

            if (this.fuel < 60) {
                const side = Math.random() < 0.5 ? 'left' : 'right';
                const fuelTank = {
                    x: side === 'left' ? this.riverLeft - 25 : this.riverRight + 25,
                    y: Math.random() * (this.height - 150) + 50,
                    width: 25,
                    height: 25,
                    speed: 1.5 + Math.random(),
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    side: side
                };
                this.fuelTanks.push(fuelTank);
            }
        }
    }

    updateBullets() {
        this.player.bullets = this.player.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > -10;
        });
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            // Ruch poziomy główny
            enemy.x += enemy.horizontalSpeed * enemy.speed;

            // Lekki ruch pionowy w dół
            enemy.y += this.gameSpeed * 0.3;

            // Dodaj specjalne zachowania dla różnych typów wrogów
            if (enemy.type === 'fast') {
                // Szybki wróg ma sinusoidalny ruch pionowy
                enemy.y += Math.sin(enemy.x * 0.02) * 0.8;
            } else if (enemy.type === 'big') {
                // Duży wróg porusza się wolniej pionowo
                enemy.y += this.gameSpeed * 0.1;
            }

            // Usuń wrogów, którzy wyszli poza ekran
            return enemy.x > -50 && enemy.x < this.width + 50 && enemy.y < this.height + 50;
        });
    }

    updateObstacles() {
        this.obstacles = this.obstacles.filter(obstacle => {
            // Ruch poziomy
            obstacle.x += obstacle.horizontalSpeed * obstacle.speed;
            // Lekki ruch pionowy w dół
            obstacle.y += this.gameSpeed * 0.5;

            // Usuń przeszkody, które wyszły poza ekran
            return obstacle.x > -50 && obstacle.x < this.width + 50 && obstacle.y < this.height + 50;
        });
    }

    updateFuelTanks() {
        this.fuelTanks = this.fuelTanks.filter(tank => {
            // Ruch poziomy
            tank.x += tank.horizontalSpeed * tank.speed;
            // Lekki ruch pionowy w dół
            tank.y += this.gameSpeed * 0.4;

            // Usuń zbiorniki, które wyszły poza ekran
            return tank.x > -50 && tank.x < this.width + 50 && tank.y < this.height + 50;
        });
    }

    updateExplosions() {
        this.explosions = this.explosions.filter(explosion => {
            explosion.timer += 16;
            explosion.radius += explosion.expandSpeed;
            explosion.alpha -= 0.05;
            return explosion.timer < explosion.duration && explosion.alpha > 0;
        });
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 1;
            particle.alpha = particle.life / particle.maxLife;
            return particle.life > 0;
        });
    }

    checkCollisions() {
        // Kolizje pocisków z wrogami
        this.player.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.player.bullets.splice(bulletIndex, 1);

                    if (enemy.health) {
                        enemy.health--;
                        if (enemy.health <= 0) {
                            this.enemies.splice(enemyIndex, 1);
                            this.addScore(enemy.type === 'big' ? 50 : enemy.type === 'fast' ? 30 : 20);
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        }
                    } else {
                        this.enemies.splice(enemyIndex, 1);
                        this.addScore(enemy.type === 'fast' ? 30 : 20);
                        this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    }
                }
            });
        });

        // Kolizje gracza z wrogami
        this.enemies.forEach((enemy, index) => {
            if (this.isColliding(this.player, enemy)) {
                this.enemies.splice(index, 1);
                this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                this.loseLife();
            }
        });

        // Kolizje gracza z przeszkodami
        this.obstacles.forEach((obstacle, index) => {
            if (this.isColliding(this.player, obstacle)) {
                this.createExplosion(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
                this.loseLife();
            }
        });

        // Kolizje gracza z paliwem
        this.fuelTanks.forEach((tank, index) => {
            if (this.isColliding(this.player, tank)) {
                this.fuelTanks.splice(index, 1);
                this.fuel = Math.min(100, this.fuel + 30);
                this.addScore(10);
                this.createParticles(tank.x + tank.width / 2, tank.y + tank.height / 2, '#00ff88');
            }
        });

        // Sprawdź czy gracz nie wyszedł poza rzekę
        if (this.player.x < this.riverLeft || this.player.x + this.player.width > this.riverRight) {
            this.loseLife();
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: 40,
            expandSpeed: 2,
            timer: 0,
            duration: 500,
            alpha: 1
        });

        this.createParticles(x, y, '#ff4444');
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                alpha: 1,
                color: color
            });
        }
    }

    addScore(points) {
        this.score += points;

        // Zwiększ prędkość gry co 1000 punktów
        this.gameSpeed = 2 + Math.floor(this.score / 1000) * 0.5;
    }

    loseLife() {
        this.lives--;
        this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Respawn gracza
            this.player.x = this.width / 2 - 15;
            this.player.y = this.height - 80;
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }

    updateFuel() {
        this.fuelDecreaseTimer += 16;
        if (this.fuelDecreaseTimer > 200) {
            this.fuelDecreaseTimer = 0;
            this.fuel -= 0.2;

            if (this.fuel <= 0) {
                this.loseLife();
                this.fuel = 20; // Daj trochę paliwa po stracie życia
            }
        }
    }

    update() {
        if (this.gameState !== 'playing') return;

        this.handleInput();

        this.spawnEnemies();
        this.spawnObstacles();
        this.spawnFuelTanks();

        this.updateBullets();
        this.updateEnemies();
        this.updateObstacles();
        this.updateFuelTanks();
        this.updateExplosions();
        this.updateParticles();

        this.checkCollisions();
        this.updateFuel();

        this.updateUI();
    }

    draw() {
        // Wyczyść canvas
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Narysuj rzekę
        this.drawRiver();

        if (this.gameState === 'playing' || this.gameState === 'paused') {
            // Narysuj gracza
            this.drawPlayer();

            // Narysuj pociski
            this.drawBullets();

            // Narysuj wrogów
            this.drawEnemies();

            // Narysuj przeszkody
            this.drawObstacles();

            // Narysuj paliwo
            this.drawFuelTanks();

            // Narysuj eksplozje
            this.drawExplosions();

            // Narysuj cząsteczki
            this.drawParticles();

            if (this.gameState === 'paused') {
                this.drawPauseScreen();
            }
        } else if (this.gameState === 'menu') {
            this.drawMenuScreen();
        }
    }

    drawRiver() {
        // Tło rzeki
        this.ctx.fillStyle = '#0066cc';
        this.ctx.fillRect(this.riverLeft, 0, this.riverWidth, this.height);

        // Brzegi rzeki
        this.ctx.fillStyle = '#228833';
        this.ctx.fillRect(0, 0, this.riverLeft, this.height);
        this.ctx.fillRect(this.riverRight, 0, this.width - this.riverRight, this.height);

        // Efekt wody
        for (let i = 0; i < this.height; i += 20) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.sin((i + Date.now() * 0.001) * 0.1) * 0.05})`;
            this.ctx.fillRect(this.riverLeft, i, this.riverWidth, 2);
        }
    }

    drawPlayer() {
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Szczegóły samolotu
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.player.x + 10, this.player.y + 5, 10, 5);
        this.ctx.fillRect(this.player.x + 5, this.player.y + 15, 20, 3);
    }

    drawBullets() {
        this.ctx.fillStyle = '#ffff00';
        this.player.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

            // Dodatkowe szczegóły dla różnych typów wrogów
            if (enemy.type === 'big') {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 10, 5);
            }
        });
    }

    drawObstacles() {
        this.ctx.fillStyle = '#666666';
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    }

    drawFuelTanks() {
        this.ctx.fillStyle = '#00ff88';
        this.fuelTanks.forEach(tank => {
            this.ctx.fillRect(tank.x, tank.y, tank.width, tank.height);

            // Symbol paliwa
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(tank.x + 5, tank.y + 5, 15, 3);
            this.ctx.fillRect(tank.x + 10, tank.y + 10, 5, 10);
            this.ctx.fillStyle = '#00ff88';
        });
    }

    drawExplosions() {
        this.explosions.forEach(explosion => {
            this.ctx.save();
            this.ctx.globalAlpha = explosion.alpha;

            const gradient = this.ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.5, '#ff4444');
            gradient.addColorStop(1, 'transparent');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 2, 2);
            this.ctx.restore();
        });
    }

    drawPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUZA', this.width / 2, this.height / 2);
    }

    drawMenuScreen() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '36px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Naciśnij START aby rozpocząć', this.width / 2, this.height / 2);

        this.ctx.font = '18px Courier New';
        this.ctx.fillText('Sterowanie: Strzałki lub WASD, Spacja - strzał', this.width / 2, this.height / 2 + 50);
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update();
        this.draw();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Uruchom grę gdy strona się załaduje
document.addEventListener('DOMContentLoaded', () => {
    new RiverRaidGame();
});
