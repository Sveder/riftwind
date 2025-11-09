/**
 * Riftwind Ward Placement Game
 * Practice vision control by placing wards and tracking enemy movement
 */

// Game state
const game = {
    canvas: null,
    ctx: null,
    mapImage: new Image(),
    wards: [],
    maxWards: 3,
    enemy: {
        x: 400,
        y: 400,
        radius: 8,
        speed: 2,
        targetX: 400,
        targetY: 400,
        isSpotted: false,
        totalSpots: 0
    },
    stats: {
        wardUptime: 0,
        spotCount: 0,
        timeElapsed: 0,
        visionScore: 0
    },
    gameStarted: false,
    lastUpdate: Date.now()
};

// Constants
const WARD_VISION_RADIUS = 80;
const WARD_MIN_DURATION = 10000; // 10 seconds
const WARD_MAX_DURATION = 30000; // 30 seconds
const MAP_SIZE = 800;
const FOG_ALPHA = 0.7;

// Initialize game
$(document).ready(function() {
    console.log('[WARD GAME] Initializing...');

    game.canvas = document.getElementById('mapCanvas');
    game.ctx = game.canvas.getContext('2d');

    // Load map image
    game.mapImage.src = '/static/map.jpg';
    game.mapImage.onload = function() {
        console.log('[WARD GAME] Map loaded');
        drawGame();
    };

    // Show instructions modal
    const modal = new bootstrap.Modal(document.getElementById('instructionsModal'));
    modal.show();

    // Start game after modal closes
    $('#instructionsModal').on('hidden.bs.modal', function() {
        startGame();
    });

    // Canvas click handler for placing wards
    game.canvas.addEventListener('click', function(e) {
        if (!game.gameStarted) return;

        const rect = game.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        placeWard(x, y);
    });
});

function startGame() {
    console.log('[WARD GAME] Starting game...');
    game.gameStarted = true;
    game.lastUpdate = Date.now();

    // Start game loop
    setInterval(updateGame, 16); // ~60 FPS
    setInterval(updateStats, 100); // Update stats 10 times per second

    // Give enemy a new target every 3-5 seconds
    setInterval(moveEnemy, 3000);
    moveEnemy(); // Initial movement
}

function updateGame() {
    const now = Date.now();
    const deltaTime = now - game.lastUpdate;
    game.lastUpdate = now;

    // Update enemy position
    const dx = game.enemy.targetX - game.enemy.x;
    const dy = game.enemy.targetY - game.enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > game.enemy.speed) {
        game.enemy.x += (dx / dist) * game.enemy.speed;
        game.enemy.y += (dy / dist) * game.enemy.speed;
    }

    // Update wards
    game.wards = game.wards.filter(ward => {
        ward.timeRemaining -= deltaTime;
        return ward.timeRemaining > 0;
    });

    // Check if enemy is spotted
    const wasSpotted = game.enemy.isSpotted;
    game.enemy.isSpotted = isEnemySpotted();

    if (game.enemy.isSpotted && !wasSpotted) {
        // Enemy just became spotted
        game.stats.spotCount++;
        game.enemy.totalSpots++;
        console.log('[WARD GAME] Enemy spotted! Total:', game.stats.spotCount);
    }

    // Draw everything
    drawGame();
    updateUI();
}

function updateStats() {
    // Increment time elapsed
    game.stats.timeElapsed += 0.1;

    // Add ward uptime (0.1 second per active ward)
    game.stats.wardUptime += game.wards.length * 0.1;

    // Calculate vision score: (uptime in seconds) + (spots × 10)
    game.stats.visionScore = Math.floor(game.stats.wardUptime + (game.stats.spotCount * 10));
}

function placeWard(x, y) {
    // Check if we have wards available
    if (game.wards.length >= game.maxWards) {
        console.log('[WARD GAME] No wards available!');
        return;
    }

    // Random duration between 10-30 seconds
    const duration = WARD_MIN_DURATION + Math.random() * (WARD_MAX_DURATION - WARD_MIN_DURATION);

    const ward = {
        x: x,
        y: y,
        radius: WARD_VISION_RADIUS,
        timeRemaining: duration,
        maxDuration: duration
    };

    game.wards.push(ward);
    console.log(`[WARD GAME] Ward placed at (${x}, ${y}) for ${(duration/1000).toFixed(1)}s`);
}

function moveEnemy() {
    // Pick random target on map
    const margin = 50;
    game.enemy.targetX = margin + Math.random() * (MAP_SIZE - 2 * margin);
    game.enemy.targetY = margin + Math.random() * (MAP_SIZE - 2 * margin);
}

function isEnemySpotted() {
    // Check if enemy is within vision range of any ward
    for (const ward of game.wards) {
        const dx = ward.x - game.enemy.x;
        const dy = ward.y - game.enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= ward.radius) {
            return true;
        }
    }
    return false;
}

function drawGame() {
    const ctx = game.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Draw map background
    ctx.drawImage(game.mapImage, 0, 0, MAP_SIZE, MAP_SIZE);

    // Draw wards first (under fog)
    game.wards.forEach(ward => {
        // Ward indicator
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(ward.x, ward.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ward.x, ward.y, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Timer bar
        const barWidth = 30;
        const barHeight = 4;
        const timePercent = ward.timeRemaining / ward.maxDuration;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(ward.x - barWidth/2, ward.y + 20, barWidth, barHeight);

        ctx.fillStyle = timePercent > 0.3 ? '#FFD700' : '#FF6B6B';
        ctx.fillRect(ward.x - barWidth/2, ward.y + 20, barWidth * timePercent, barHeight);
    });

    // Draw fog of war
    ctx.fillStyle = `rgba(0, 0, 0, ${FOG_ALPHA})`;
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Cut out vision circles using compositing
    ctx.globalCompositeOperation = 'destination-out';
    game.wards.forEach(ward => {
        const gradient = ctx.createRadialGradient(ward.x, ward.y, 0, ward.x, ward.y, ward.radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ward.x, ward.y, ward.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // Draw enemy (only if spotted or for debugging)
    if (game.enemy.isSpotted) {
        // Spotted - draw with alert
        ctx.fillStyle = '#FF4444';
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(game.enemy.x, game.enemy.y, game.enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Alert ring
        const time = Date.now() / 200;
        const ringRadius = game.enemy.radius + 5 + Math.sin(time) * 3;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(game.enemy.x, game.enemy.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        // Hidden - draw faintly (for debugging)
        ctx.fillStyle = 'rgba(100, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(game.enemy.x, game.enemy.y, game.enemy.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateUI() {
    // Update ward count
    $('#wardCount').text(game.maxWards - game.wards.length);

    // Update stats
    $('#wardUptime').text(game.stats.wardUptime.toFixed(1) + 's');
    $('#spotCount').text(game.stats.spotCount);
    $('#timeElapsed').text(game.stats.timeElapsed.toFixed(1) + 's');
    $('#visionScore').text(game.stats.visionScore);
}
