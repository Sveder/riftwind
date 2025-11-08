/**
 * Riftwind - Isometric Map Year in Review
 * Navigate through Summoner's Rift to explore your stats
 */

// Map State
const mapState = {
    x: -1200, // Start centered
    y: -1200,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    keys: {},
    moveSpeed: 5,
    edgeScrollZone: 50, // pixels from edge to trigger scroll
    edgeScrollSpeed: 10
};

// Card positions (will be populated with actual cards)
let cards = [];

// Initialize when page loads
$(document).ready(function() {
    console.log('[MAP] Initializing isometric map...');

    // Get summoner data from URL params or stored data
    initializeMap();
    setupNavigation();
    loadYearInReview();
});

function initializeMap() {
    console.log('[MAP] Setting up map container...');

    // Start at center of map
    updateViewport();

    // Update todo list
    console.log('[MAP] ✅ Map container created');
}

function setupNavigation() {
    console.log('[MAP] Setting up navigation controls...');

    const container = $('#mapContainer');
    const viewport = $('#mapViewport');

    // === WASD Keyboard Controls ===
    $(document).on('keydown', function(e) {
        mapState.keys[e.key.toLowerCase()] = true;
    });

    $(document).on('keyup', function(e) {
        mapState.keys[e.key.toLowerCase()] = false;
    });

    // Game loop for smooth movement
    setInterval(function() {
        let moved = false;

        if (mapState.keys['w']) {
            mapState.y += mapState.moveSpeed;
            moved = true;
        }
        if (mapState.keys['s']) {
            mapState.y -= mapState.moveSpeed;
            moved = true;
        }
        if (mapState.keys['a']) {
            mapState.x += mapState.moveSpeed;
            moved = true;
        }
        if (mapState.keys['d']) {
            mapState.x -= mapState.moveSpeed;
            moved = true;
        }

        if (moved) {
            updateViewport();
            checkCardVisibility();
        }
    }, 16); // ~60fps

    // === Edge Scrolling ===
    container.on('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let moved = false;

        // Left edge
        if (mouseX < mapState.edgeScrollZone) {
            mapState.x += mapState.edgeScrollSpeed;
            moved = true;
        }
        // Right edge
        else if (mouseX > rect.width - mapState.edgeScrollZone) {
            mapState.x -= mapState.edgeScrollSpeed;
            moved = true;
        }

        // Top edge
        if (mouseY < mapState.edgeScrollZone) {
            mapState.y += mapState.edgeScrollSpeed;
            moved = true;
        }
        // Bottom edge
        else if (mouseY > rect.height - mapState.edgeScrollZone) {
            mapState.y -= mapState.edgeScrollSpeed;
            moved = true;
        }

        if (moved) {
            updateViewport();
            checkCardVisibility();
        }
    });

    // === Mouse Wheel Zoom ===
    container.on('wheel', function(e) {
        e.preventDefault();

        const delta = e.originalEvent.deltaY;
        const zoomFactor = 0.1;

        if (delta < 0) {
            // Zoom in
            mapState.zoom = Math.min(mapState.maxZoom, mapState.zoom + zoomFactor);
        } else {
            // Zoom out
            mapState.zoom = Math.max(mapState.minZoom, mapState.zoom - zoomFactor);
        }

        updateViewport();
    });

    // === Zoom Buttons ===
    $('#zoomIn').on('click', function() {
        mapState.zoom = Math.min(mapState.maxZoom, mapState.zoom + 0.1);
        updateViewport();
    });

    $('#zoomOut').on('click', function() {
        mapState.zoom = Math.max(mapState.minZoom, mapState.zoom - 0.1);
        updateViewport();
    });

    console.log('[MAP] ✅ Navigation controls ready');
}

function updateViewport() {
    const viewport = $('#mapViewport');

    // Apply transform
    viewport.css({
        'transform': `translate(${mapState.x}px, ${mapState.y}px) scale(${mapState.zoom})`,
        'transform-origin': '0 0'
    });
}

function loadYearInReview() {
    console.log('[MAP] Loading year in review data...');

    // Get data from window or sessionStorage
    let summonerData = window.currentSummonerData;

    if (!summonerData) {
        // Try to load from sessionStorage
        const stored = sessionStorage.getItem('currentSummonerData');
        if (stored) {
            summonerData = JSON.parse(stored);
            window.currentSummonerData = summonerData;
            console.log('[MAP] Loaded summoner data from sessionStorage');
        }
    }

    if (summonerData) {
        generateMapCards(summonerData);
    } else {
        // Redirect back to index if no data
        console.log('[MAP] No summoner data found, redirecting...');
        window.location.href = '/';
    }
}

function generateMapCards(summonerData) {
    console.log('[MAP] Generating cards on map...');

    // Start loading year in review analysis
    $.ajax({
        url: '/api/year-in-review',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            matches: summonerData.recentMatches,
            summonerName: summonerData.summoner.name,
            region: summonerData.region,
            timelines: summonerData.matchTimelines || []
        }),
        success: function(data) {
            console.log('[MAP] ✅ Analysis received, placing cards...');

            const analysis = data.analysis;

            // Place cards on map in grid
            placeCardsOnMap(analysis, summonerData);

            // Hide loading
            $('#loadingOverlay').fadeOut();
        },
        error: function(xhr) {
            console.error('[MAP] ❌ Error loading analysis:', xhr);
            $('#loadingOverlay').html(`
                <div class="loading-text" style="color: #ff6464;">Failed to load analysis</div>
                <div>${xhr.responseText || 'Unknown error'}</div>
                <button onclick="window.location.href='/'" style="margin-top: 20px; padding: 10px 20px; background: #C79B3B; border: none; border-radius: 5px; color: #000; cursor: pointer;">
                    Return Home
                </button>
            `);
        }
    });
}

function placeCardsOnMap(analysis, summonerData) {
    console.log('[MAP] Placing cards in grid layout...');

    const riftMap = $('#riftMap');
    cards = [];

    // Grid layout configuration
    const gridCols = 4;
    const gridRows = 4;
    const cardSpacing = 400;
    const startX = 600;
    const startY = 600;

    // Card data array
    const cardData = buildCardData(analysis, summonerData);

    // Place cards in grid
    cardData.forEach((card, index) => {
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);

        let x = startX + (col * cardSpacing);
        let y = startY + (row * cardSpacing);

        // Special position for Roast card at Dragon pit
        if (card.isRoast) {
            x = 1800; // Dragon pit X
            y = 2000; // Dragon pit Y
        }

        const cardElement = $(`
            <div class="map-card ${card.isRoast ? 'roast-card' : ''}"
                 style="left: ${x}px; top: ${y}px;"
                 data-card-index="${index}">
                <h2>${card.title}</h2>
                ${card.content}
            </div>
        `);

        riftMap.append(cardElement);

        cards.push({
            element: cardElement,
            x: x,
            y: y,
            visible: false
        });
    });

    console.log(`[MAP] ✅ Placed ${cards.length} cards on map`);

    // Initial visibility check
    checkCardVisibility();
}

function buildCardData(analysis, summonerData) {
    const cardData = [];

    // Card 1: Overview
    cardData.push({
        title: '📊 Your Season',
        content: `
            <div class="stat-number">${summonerData.recentMatches.length}</div>
            <p style="font-size: 1.2rem;">Games Played in 2025</p>
        `
    });

    // Card 2: Win Rate
    const wins = summonerData.recentMatches.filter(m => m.win).length;
    const winrate = ((wins / summonerData.recentMatches.length) * 100).toFixed(1);
    cardData.push({
        title: '🏆 Win Rate',
        content: `
            <div class="stat-number">${winrate}%</div>
            <p>${wins}W ${summonerData.recentMatches.length - wins}L</p>
        `
    });

    // Card 3: Most Played
    if (summonerData.mostPlayedChampion) {
        cardData.push({
            title: '⭐ Your Main',
            content: `
                <div class="stat-number">${summonerData.mostPlayedChampion.championName || 'Champion'}</div>
                <p>Level ${summonerData.mostPlayedChampion.championLevel}</p>
            `
        });
    }

    // Card 4: Nemesis
    if (analysis.nemesis) {
        cardData.push({
            title: '😈 Your Nemesis',
            content: `
                <div class="stat-number">${analysis.nemesis.name}</div>
                <p>Lost ${analysis.nemesis.losses} times</p>
            `
        });
    }

    // Card 5: BFF
    if (analysis.bff) {
        cardData.push({
            title: '💙 Your BFF',
            content: `
                <div class="stat-number">${analysis.bff.name}</div>
                <p>Played ${analysis.bff.games_together} games together</p>
            `
        });
    }

    // Card 6: Hot Streak
    if (analysis.hot_streak_month) {
        cardData.push({
            title: '🔥 Hot Streak',
            content: `
                <div class="stat-number">${analysis.hot_streak_month.winrate}%</div>
                <p>${analysis.hot_streak_month.month}</p>
            `
        });
    }

    // Card 7: CS Efficiency
    if (analysis.cs_efficiency) {
        cardData.push({
            title: '🎯 CS Efficiency',
            content: `
                <div class="stat-number">${analysis.cs_efficiency.overall_cs_per_min}</div>
                <p>CS per Minute</p>
            `
        });
    }

    // Card 8: Kill Steals
    if (analysis.kill_steals && analysis.kill_steals.total_kills > 0) {
        cardData.push({
            title: '🥷 Kill Participation',
            content: `
                <div class="stat-number">${analysis.kill_steals.average_damage_contribution}%</div>
                <p>Damage on Kills</p>
            `
        });
    }

    // Card 9: Highlights
    if (analysis.highlight_stats) {
        cardData.push({
            title: '✨ Highlights',
            content: `
                <p style="font-size: 1.1rem;">
                    Pentakills: ${analysis.highlight_stats.pentakills}<br>
                    Quadras: ${analysis.highlight_stats.quadrakills}
                </p>
            `
        });
    }

    // Card 10: Total Hours
    if (analysis.total_hours) {
        cardData.push({
            title: '⏰ Time Played',
            content: `
                <div class="stat-number">${analysis.total_hours}</div>
                <p>Hours in the Rift</p>
            `
        });
    }

    // ROAST CARD - Always last and at Dragon pit
    cardData.push({
        title: '🔥 THE ROAST',
        content: `
            <p style="font-size: 1.1rem; line-height: 1.6;">
                ${analysis.roast || "You're so good, even AI can't roast you!"}
            </p>
        `,
        isRoast: true
    });

    return cardData;
}

function checkCardVisibility() {
    const containerWidth = $('#mapContainer').width();
    const containerHeight = $('#mapContainer').height();

    cards.forEach(card => {
        // Calculate card position in viewport
        const cardScreenX = (card.x + mapState.x) * mapState.zoom;
        const cardScreenY = (card.y + mapState.y) * mapState.zoom;

        // Check if card is in view (with some margin)
        const margin = 200;
        const isVisible =
            cardScreenX > -margin &&
            cardScreenX < containerWidth + margin &&
            cardScreenY > -margin &&
            cardScreenY < containerHeight + margin;

        // Only add visible class if not already visible
        if (isVisible && !card.visible) {
            card.element.addClass('visible');
            card.visible = true;
            console.log(`[MAP] Card revealed at (${card.x}, ${card.y})`);
        }
    });
}
