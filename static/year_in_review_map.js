/**
 * Riftwind - Isometric Map Year in Review
 * Navigate through Summoner's Rift to explore your stats
 */

// IndexedDB helper functions
const dbName = 'RiftwindDB';
const storeName = 'summonerData';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };
    });
}

function getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = () => reject(request.error);
        }).catch(reject);
    });
}

function saveToIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ id: key, data: data, timestamp: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }).catch(reject);
    });
}

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
    edgeScrollSpeed: 10,
    mapWidth: 3000,  // Map dimensions
    mapHeight: 3000
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

    // === Mouse Drag Navigation ===
    container.on('mousedown', function(e) {
        mapState.isDragging = true;
        mapState.lastMouseX = e.clientX;
        mapState.lastMouseY = e.clientY;
        container.css('cursor', 'grabbing');
    });

    $(document).on('mousemove', function(e) {
        if (mapState.isDragging) {
            const deltaX = e.clientX - mapState.lastMouseX;
            const deltaY = e.clientY - mapState.lastMouseY;

            mapState.x += deltaX;
            mapState.y += deltaY;

            mapState.lastMouseX = e.clientX;
            mapState.lastMouseY = e.clientY;

            updateViewport();
            checkCardVisibility();
        }
    });

    $(document).on('mouseup', function() {
        if (mapState.isDragging) {
            mapState.isDragging = false;
            container.css('cursor', 'grab');
        }
    });

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
        // Skip edge scrolling if dragging
        if (mapState.isDragging) return;

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
    const container = $('#mapContainer');

    // Get container dimensions
    const containerWidth = container.width();
    const containerHeight = container.height();

    // Calculate scaled map dimensions
    const scaledMapWidth = mapState.mapWidth * mapState.zoom;
    const scaledMapHeight = mapState.mapHeight * mapState.zoom;

    // Calculate boundaries
    // When map is larger than container, constrain to show map edges
    // When map is smaller than container, center it
    let minX, maxX, minY, maxY;

    if (scaledMapWidth > containerWidth) {
        // Map is wider than container
        minX = -(scaledMapWidth - containerWidth);
        maxX = 0;
    } else {
        // Map is narrower than container - center it
        minX = maxX = (containerWidth - scaledMapWidth) / 2;
    }

    if (scaledMapHeight > containerHeight) {
        // Map is taller than container
        minY = -(scaledMapHeight - containerHeight);
        maxY = 0;
    } else {
        // Map is shorter than container - center it
        minY = maxY = (containerHeight - scaledMapHeight) / 2;
    }

    // Constrain position to boundaries
    mapState.x = Math.max(minX, Math.min(maxX, mapState.x));
    mapState.y = Math.max(minY, Math.min(maxY, mapState.y));

    // Apply transform
    viewport.css({
        'transform': `translate(${mapState.x}px, ${mapState.y}px) scale(${mapState.zoom})`,
        'transform-origin': '0 0'
    });
}

async function loadYearInReview() {
    console.log('[MAP] Loading year in review data...');

    // Check if we have URL parameters (shared link)
    const urlParams = new URLSearchParams(window.location.search);
    const summonerParam = urlParams.get('summoner');
    const regionParam = urlParams.get('region');

    let summonerData = window.currentSummonerData;

    if (!summonerData) {
        try {
            // Load from IndexedDB
            summonerData = await getFromIndexedDB('summonerData');

            // If URL has summoner info and it doesn't match cached data, fetch it
            if (summonerParam && regionParam && (!summonerData || summonerData.summoner.name !== summonerParam || summonerData.region !== regionParam)) {
                console.log('[MAP] Loading data from URL parameters:', summonerParam, regionParam);

                // Show loading message
                $('#loadingOverlay').show().html(`
                    <div class="spinner"></div>
                    <p style="margin-top: 20px;">Loading ${summonerParam}'s data...</p>
                `);

                // Fetch data from API
                try {
                    const response = await $.ajax({
                        url: '/api/summoner',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            gameName: summonerParam.split('#')[0],
                            tagLine: summonerParam.split('#')[1] || regionParam,
                            region: regionParam
                        })
                    });

                    // Save to IndexedDB for future use
                    response.region = regionParam;
                    await saveToIndexedDB('summonerData', response);
                    summonerData = response;
                    console.log('[MAP] Data fetched and saved from API');
                } catch (error) {
                    console.error('[MAP] Failed to fetch summoner data:', error);
                    alert('Failed to load summoner data. Please try again.');
                    window.location.href = '/';
                    return;
                }
            }

            if (summonerData) {
                window.currentSummonerData = summonerData;
                console.log('[MAP] Loaded summoner data from IndexedDB');
                console.log('[MAP] Timelines available:', summonerData.matchTimelines?.length || 0);
            }
        } catch (error) {
            console.error('[MAP] Error loading from IndexedDB:', error);
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
