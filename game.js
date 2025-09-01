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

        // River (brzegi rzeki) - dynamiczna mapa
        this.riverSegments = [];
        this.segmentHeight = 20;
        this.mapSpeed = 2;
        this.riverVariationSpeed = 0.02;
        this.riverTime = 0;
        this.initializeRiver();

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

    initializeRiver() {
        // Inicjalizuj segmenty rzeki
        for (let i = 0; i < Math.ceil(this.height / this.segmentHeight) + 5; i++) {
            const y = i * this.segmentHeight;
            const baseLeft = 100;
            const baseRight = this.width - 100;

            this.riverSegments.push({
                y: y,
                leftBank: baseLeft,
                rightBank: baseRight,
                width: baseRight - baseLeft
            });
        }
    }

    updateRiver() {
        this.riverTime += this.riverVariationSpeed;

        // Przesuń wszystkie segmenty w dół
        this.riverSegments.forEach(segment => {
            segment.y += this.mapSpeed;
        });

        // Usuń segmenty, które wyszły poza dolną krawędź
        this.riverSegments = this.riverSegments.filter(segment => segment.y < this.height + 50);

        // Dodaj nowe segmenty na górze
        while (this.riverSegments.length === 0 || this.riverSegments[0].y > -this.segmentHeight) {
            const topY = this.riverSegments.length > 0 ? this.riverSegments[0].y - this.segmentHeight : -this.segmentHeight;

            // Łagodniejszy kształt rzeki z większymi zmianami szerokości
            let leftBank, rightBank;

            // Zmniejszone falowanie dla mniej krętej rzeki
            const timeOffset = -topY * 0.003; // zmniejszony mnożnik dla łagodniejszych zakrętów

            // Główne, łagodne falowanie rzeki
            const mainCurve = Math.sin(timeOffset * 0.4 + this.riverTime * 0.8) * 40; // zmniejszona częstotliwość i amplituda

            // Bardziej wyraźne zmiany szerokości rzeki
            const widthVariation = Math.sin(timeOffset * 0.3 + this.riverTime * 0.5) * 80; // większa zmiana szerokości
            const baseWidth = 250 + widthVariation; // zwiększona bazowa szerokość

            // Centrum rzeki z łagodnymi krzywizną
            const centerX = this.width / 2 + mainCurve;

            // Oblicz pozycje brzegów
            leftBank = centerX - baseWidth / 2;
            rightBank = centerX + baseWidth / 2;

            // Zapewnij, że rzeka nie wyjdzie poza granice ekranu
            const minBorder = 50;
            const maxBorder = this.width - 50;

            if (leftBank < minBorder) {
                const shift = minBorder - leftBank;
                leftBank = minBorder;
                rightBank += shift;
            }
            if (rightBank > maxBorder) {
                const shift = rightBank - maxBorder;
                rightBank = maxBorder;
                leftBank -= shift;
            }

            // Zapewnij minimalną szerokość rzeki (większą niż wcześniej)
            const minWidth = 200;
            if (rightBank - leftBank < minWidth) {
                const center = (leftBank + rightBank) / 2;
                leftBank = center - minWidth / 2;
                rightBank = center + minWidth / 2;

                // Ponownie sprawdź granice
                if (leftBank < minBorder) {
                    leftBank = minBorder;
                    rightBank = leftBank + minWidth;
                }
                if (rightBank > maxBorder) {
                    rightBank = maxBorder;
                    leftBank = rightBank - minWidth;
                }
            }

            this.riverSegments.unshift({
                y: topY,
                leftBank: leftBank,
                rightBank: rightBank,
                width: rightBank - leftBank
            });
        }
    } getCurrentRiverBounds(y) {
        // Znajdź segmenty rzeki dla danej pozycji Y
        const segment = this.riverSegments.find(seg =>
            y >= seg.y && y < seg.y + this.segmentHeight
        );

        if (segment) {
            return {
                left: segment.leftBank,
                right: segment.rightBank
            };
        }

        // Fallback do domyślnych granic
        return {
            left: 100,
            right: this.width - 100
        };
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

        // Reset rzeki
        this.riverSegments = [];
        this.riverTime = 0;
        this.initializeRiver();

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

        // Ograniczenia ruchu gracza - używaj dynamicznych granic rzeki
        const riverBounds = this.getCurrentRiverBounds(this.player.y);
        this.player.x = Math.max(riverBounds.left + 10, Math.min(riverBounds.right - this.player.width - 10, this.player.x));
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
        if (this.enemySpawnTimer > 2500 - (this.gameSpeed * 100)) { // Zwiększony czas spawn (było 1500)
            this.enemySpawnTimer = 0;

            // Pobierz aktualne granice rzeki dla spawnu
            const spawnY = Math.random() * (this.height - 150) + 50;
            const riverBounds = this.getCurrentRiverBounds(spawnY);

            // Spawn różnych typów wrogów w rzece z ruchem poziomym
            const enemyType = Math.random();
            const side = Math.random() < 0.5 ? 'left' : 'right';
            let enemy;

            if (enemyType < 0.6) {
                // Zwykły wróg - spawn na brzegu rzeki
                enemy = {
                    x: side === 'left' ? riverBounds.left : riverBounds.right - 25,
                    y: spawnY,
                    width: 25,
                    height: 25,
                    speed: 1.5 + Math.random() * 1.0, // prędkość pozioma
                    horizontalSpeed: side === 'left' ? 1 : -1, // kierunek ruchu
                    type: 'normal',
                    color: '#ff4444'
                };
            } else if (enemyType < 0.8) {
                // Szybki wróg - spawn na brzegu rzeki
                enemy = {
                    x: side === 'left' ? riverBounds.left : riverBounds.right - 20,
                    y: spawnY,
                    width: 20,
                    height: 20,
                    speed: 2.0 + Math.random() * 1.5, // szybszy ruch poziomy
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'fast',
                    color: '#ff8844'
                };
            } else {
                // Duży wróg - spawn na brzegu rzeki
                enemy = {
                    x: side === 'left' ? riverBounds.left : riverBounds.right - 40,
                    y: spawnY,
                    width: 40,
                    height: 30,
                    speed: 1.0 + Math.random() * 0.8, // wolniejszy ale silniejszy
                    horizontalSpeed: side === 'left' ? 1 : -1,
                    type: 'big',
                    color: '#ff0000',
                    health: 3
                };
            }

            this.enemies.push(enemy);
        }
    }

    spawnObstacles() {
        this.obstacleSpawnTimer += 16;
        if (this.obstacleSpawnTimer > 3500) { // Zwiększony czas spawn (było 2000)
            this.obstacleSpawnTimer = 0;

            // Przeszkody w rzece - spawn na górze
            if (Math.random() < 0.15) { // mniejsza szansa na przeszkody
                const spawnY = -50;
                const riverBounds = this.getCurrentRiverBounds(100);

                const obstacle = {
                    x: riverBounds.left + Math.random() * (riverBounds.right - riverBounds.left - 30),
                    y: spawnY,
                    width: 30,
                    height: 40,
                    type: 'rock'
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
                const spawnY = -50;
                const riverBounds = this.getCurrentRiverBounds(100);

                const fuelTank = {
                    x: riverBounds.left + Math.random() * (riverBounds.right - riverBounds.left - 25),
                    y: spawnY,
                    width: 25,
                    height: 25
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
            // Ruch poziomy
            enemy.x += enemy.horizontalSpeed * enemy.speed;

            // Sprawdź granice rzeki i odbij się od brzegów
            const riverBounds = this.getCurrentRiverBounds(enemy.y);
            if (enemy.x <= riverBounds.left || enemy.x + enemy.width >= riverBounds.right) {
                enemy.horizontalSpeed *= -1; // zmień kierunek
            }

            // Trzymaj wrogów w granicach rzeki
            enemy.x = Math.max(riverBounds.left, Math.min(riverBounds.right - enemy.width, enemy.x));

            // Usuń wrogów tylko gdy są bardzo daleko poza ekranem
            return enemy.x > -100 && enemy.x < this.width + 100;
        });
    }

    updateObstacles() {
        this.obstacles = this.obstacles.filter(obstacle => {
            // Ruch pionowy w dół
            obstacle.y += this.mapSpeed;

            // Usuń przeszkody, które wyszły poza ekran
            return obstacle.y < this.height + 50;
        });
    }

    updateFuelTanks() {
        this.fuelTanks = this.fuelTanks.filter(tank => {
            // Ruch pionowy w dół
            tank.y += this.mapSpeed;

            // Usuń zbiorniki, które wyszły poza ekran
            return tank.y < this.height + 50;
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
        const playerRiverBounds = this.getCurrentRiverBounds(this.player.y);
        if (this.player.x < playerRiverBounds.left || this.player.x + this.player.width > playerRiverBounds.right) {
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

        // Aktualizuj rzekę
        this.updateRiver();

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
        // Narysuj segmenty rzeki z płynnymi przejściami
        this.riverSegments.forEach((segment, index) => {
            const nextSegment = this.riverSegments[index + 1];

            // Tło rzeki - narysuj płynne trapezy między segmentami
            this.ctx.fillStyle = '#0066cc';
            if (nextSegment) {
                this.ctx.beginPath();
                this.ctx.moveTo(segment.leftBank, segment.y);
                this.ctx.lineTo(segment.rightBank, segment.y);
                this.ctx.lineTo(nextSegment.rightBank, nextSegment.y);
                this.ctx.lineTo(nextSegment.leftBank, nextSegment.y);
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // Ostatni segment - narysuj prostokąt
                this.ctx.fillRect(segment.leftBank, segment.y, segment.width, this.segmentHeight);
            }

            // Brzegi rzeki z naturalnymi kolorami - lewa strona (ziemia/trawa)
            this.ctx.fillStyle = '#4a7c59'; // ciemniejszy zielony dla bardziej naturalnego wyglądu
            this.ctx.fillRect(0, segment.y, segment.leftBank, this.segmentHeight);

            // Brzegi rzeki - prawa strona
            this.ctx.fillRect(segment.rightBank, segment.y, this.width - segment.rightBank, this.segmentHeight);

            // Dodaj gradację na brzegach dla lepszego efektu
            const gradient = this.ctx.createLinearGradient(segment.leftBank - 10, 0, segment.leftBank + 10, 0);
            gradient.addColorStop(0, '#4a7c59');
            gradient.addColorStop(1, '#0066cc');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(segment.leftBank - 5, segment.y, 10, this.segmentHeight);

            const rightGradient = this.ctx.createLinearGradient(segment.rightBank - 10, 0, segment.rightBank + 10, 0);
            rightGradient.addColorStop(0, '#0066cc');
            rightGradient.addColorStop(1, '#4a7c59');
            this.ctx.fillStyle = rightGradient;
            this.ctx.fillRect(segment.rightBank - 5, segment.y, 10, this.segmentHeight);
        });

        // Efekt wody - bardziej realistyczne falowanie
        this.riverSegments.forEach(segment => {
            const time = Date.now() * 0.002;
            for (let i = 0; i < segment.width; i += 15) {
                const x = segment.leftBank + i;
                const waveOffset = Math.sin((x + time * 50) * 0.05) * 0.08;
                const opacity = 0.15 + waveOffset;
                this.ctx.fillStyle = `rgba(135, 206, 235, ${Math.abs(opacity)})`;
                this.ctx.fillRect(x, segment.y, 3, this.segmentHeight);

                // Dodatkowe małe fale
                if (i % 30 === 0) {
                    const smallWave = Math.sin((x + time * 80) * 0.1) * 0.05;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.abs(smallWave)})`;
                    this.ctx.fillRect(x + 5, segment.y, 1, this.segmentHeight);
                }
            }
        });
    }

    drawPlayer() {
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;

        // Kadłub samolotu (główna część)
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(x + w / 3, y, w / 3, h * 0.8);

        // Nos samolotu (ostry przód)
        this.ctx.fillStyle = '#00cc66';
        this.ctx.beginPath();
        this.ctx.moveTo(x + w / 2, y);
        this.ctx.lineTo(x + w / 3, y + h * 0.2);
        this.ctx.lineTo(x + 2 * w / 3, y + h * 0.2);
        this.ctx.closePath();
        this.ctx.fill();

        // Skrzydła (większe, bardziej realistyczne)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x, y + h * 0.3, w, h * 0.15);

        // Mniejsze skrzydełka tylne
        this.ctx.fillRect(x + w * 0.2, y + h * 0.7, w * 0.6, h * 0.1);

        // Silniki na skrzydłach
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x + w * 0.1, y + h * 0.25, w * 0.1, h * 0.25);
        this.ctx.fillRect(x + w * 0.8, y + h * 0.25, w * 0.1, h * 0.25);

        // Kabina pilota
        this.ctx.fillStyle = '#0088ff';
        this.ctx.fillRect(x + w * 0.4, y + h * 0.15, w * 0.2, h * 0.2);

        // Ogon samolotu
        this.ctx.fillStyle = '#00aa55';
        this.ctx.fillRect(x + w * 0.45, y + h * 0.8, w * 0.1, h * 0.2);
    }

    drawBullets() {
        this.ctx.fillStyle = '#ffff00';
        this.player.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            const x = enemy.x;
            const y = enemy.y;
            const w = enemy.width;
            const h = enemy.height;

            if (enemy.type === 'normal') {
                // Helikopter wroga
                this.ctx.fillStyle = '#ff4444';
                // Kabina
                this.ctx.fillRect(x + w * 0.2, y + h * 0.4, w * 0.6, h * 0.4);

                // Nos helikoptera
                this.ctx.beginPath();
                this.ctx.moveTo(x + w * 0.2, y + h * 0.6);
                this.ctx.lineTo(x, y + h * 0.6);
                this.ctx.lineTo(x + w * 0.2, y + h * 0.4);
                this.ctx.closePath();
                this.ctx.fill();

                // Ogon
                this.ctx.fillRect(x + w * 0.8, y + h * 0.5, w * 0.2, h * 0.2);

                // Wirnik główny
                this.ctx.fillStyle = '#666666';
                this.ctx.fillRect(x + w * 0.1, y, w * 0.8, h * 0.1);

                // Wirnik ogonowy
                this.ctx.fillRect(x + w * 0.9, y + h * 0.2, w * 0.1, h * 0.6);

                // Podwozie
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(x + w * 0.15, y + h * 0.8, w * 0.1, h * 0.2);
                this.ctx.fillRect(x + w * 0.75, y + h * 0.8, w * 0.1, h * 0.2);

            } else if (enemy.type === 'fast') {
                // Mały myśliwiec wroga
                this.ctx.fillStyle = '#ff8844';
                // Kadłub
                this.ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.9);

                // Nos ostry
                this.ctx.beginPath();
                this.ctx.moveTo(x + w / 2, y);
                this.ctx.lineTo(x + w * 0.3, y + h * 0.3);
                this.ctx.lineTo(x + w * 0.7, y + h * 0.3);
                this.ctx.closePath();
                this.ctx.fill();

                // Skrzydła (małe, delta)
                this.ctx.fillStyle = '#cc4422';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + h * 0.5);
                this.ctx.lineTo(x + w * 0.3, y + h * 0.3);
                this.ctx.lineTo(x + w * 0.3, y + h * 0.7);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.moveTo(x + w, y + h * 0.5);
                this.ctx.lineTo(x + w * 0.7, y + h * 0.3);
                this.ctx.lineTo(x + w * 0.7, y + h * 0.7);
                this.ctx.closePath();
                this.ctx.fill();

                // Silnik
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(x + w * 0.35, y + h * 0.8, w * 0.3, h * 0.2);

            } else if (enemy.type === 'big') {
                // Okręt wojenny
                this.ctx.fillStyle = '#ff0000';
                // Kadłub okrętu
                this.ctx.fillRect(x, y + h * 0.6, w, h * 0.4);

                // Nadbudówka
                this.ctx.fillStyle = '#cc0000';
                this.ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.3);

                // Kominiaster
                this.ctx.fillStyle = '#880000';
                this.ctx.fillRect(x + w * 0.3, y, w * 0.15, h * 0.5);
                this.ctx.fillRect(x + w * 0.55, y, w * 0.15, h * 0.5);

                // Działa
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(x + w * 0.1, y + h * 0.4, w * 0.2, h * 0.1);
                this.ctx.fillRect(x + w * 0.7, y + h * 0.4, w * 0.2, h * 0.1);

                // Radar/anteny
                this.ctx.fillStyle = '#666666';
                this.ctx.fillRect(x + w * 0.45, y, w * 0.05, h * 0.3);
                this.ctx.fillRect(x + w * 0.4, y, w * 0.15, h * 0.05);

                // Linia wodna
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x, y + h * 0.85, w, h * 0.05);
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
