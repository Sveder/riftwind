let reviewData = null;
let currentCard = 0;

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

// Configure marked library for inline rendering
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true
    });
}

// Markdown to HTML converter using marked library
function formatMarkdown(text) {
    if (!text) return text;

    // Use marked library if available, otherwise fallback to simple replacement
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }

    // Fallback: basic markdown support
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Create animated background particles
function createParticles() {
    const particles = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particles.appendChild(particle);
    }
}

// Start the review experience
async function startReview() {
    console.log('[YEAR IN REVIEW] Starting review experience...');

    try {
        // Check if we have URL parameters (shared link)
        const urlParams = new URLSearchParams(window.location.search);
        const summonerParam = urlParams.get('summoner');
        const regionParam = urlParams.get('region');

        let data = await getFromIndexedDB('summonerData');

        // If URL has summoner info and it doesn't match cached data, fetch it
        if (summonerParam && regionParam) {
            if (!data || data.summoner.name !== summonerParam || data.region !== regionParam) {
                console.log('[YEAR IN REVIEW] Loading data from URL parameters:', summonerParam, regionParam);

                // Show loading immediately
                document.getElementById('introSection').style.display = 'none';
                document.getElementById('loadingOverlay').style.display = 'flex';
                document.getElementById('loadingOverlay').innerHTML = `
                    <div class="spinner"></div>
                    <p style="margin-top: 20px;">Loading ${summonerParam}'s data...</p>
                `;

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
                    data = response;
                    console.log('[YEAR IN REVIEW] Data fetched and saved from API');
                } catch (error) {
                    console.error('[YEAR IN REVIEW] Failed to fetch summoner data:', error);
                    alert('Failed to load summoner data. Please try again.');
                    window.location.href = '/';
                    return;
                }
            }
        }

        if (!data) {
            console.error('[YEAR IN REVIEW] No summoner data found in IndexedDB!');
            alert('Please search for a summoner first!');
            window.location.href = '/';
            return;
        }

        // Data already includes timelines if they were saved
        if (!data.matchTimelines) {
            data.matchTimelines = [];
        }
        console.log('[YEAR IN REVIEW] Summoner data loaded:', data.summoner.name);
        console.log('[YEAR IN REVIEW] Total matches to analyze:', data.recentMatches.length);
        console.log('[YEAR IN REVIEW] Timelines available:', data.matchTimelines.length);

        // Hide intro, show loading
        document.getElementById('introSection').style.display = 'none';
        document.getElementById('loadingOverlay').style.display = 'flex';

        console.log('[YEAR IN REVIEW] Generating year in review...');

        // Go straight to full analysis
        generateYearInReview(data);
    } catch (error) {
        console.error('[YEAR IN REVIEW] Error loading data from IndexedDB:', error);
        alert('Failed to load summoner data. Please search for a summoner again.');
        window.location.href = '/';
    }
}

// Show preview stats before full analysis
function showPreviewStats(summonerData) {
    console.log('[PREVIEW] Getting preview stats...');

    $.ajax({
        url: '/api/preview-stats',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            matches: summonerData.recentMatches
        }),
        success: function(previewData) {
            console.log('[PREVIEW] Preview data received:', previewData);

            // Update loading screen with preview
            document.getElementById('loadingOverlay').innerHTML = `
                <div style="text-align: center; max-width: 600px;">
                    <h2 style="color: #C79B3B; font-size: 2.5rem; margin-bottom: 30px;">Quick Preview</h2>
                    <div style="background: rgba(30, 35, 40, 0.8); border: 2px solid #C79B3B; border-radius: 15px; padding: 30px; margin-bottom: 30px;">
                        <p style="font-size: 1.3rem; margin-bottom: 20px;">Based on your first ${previewData.matches_analyzed} matches in 2025:</p>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                            <div>
                                <div style="font-size: 0.9rem; color: #A09B8C;">Win Rate</div>
                                <div style="font-size: 2rem; color: #3BC77B; font-weight: bold;">${previewData.winrate}%</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #A09B8C;">KDA</div>
                                <div style="font-size: 2rem; color: #C79B3B; font-weight: bold;">${previewData.kda}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #A09B8C;">Avg K/D/A</div>
                                <div style="font-size: 1.5rem; color: #E4E1D8;">${previewData.avg_kills}/${previewData.avg_deaths}/${previewData.avg_assists}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: #A09B8C;">Most Played</div>
                                <div style="font-size: 1.2rem; color: #E4E1D8;">${previewData.most_played_champion}</div>
                            </div>
                        </div>
                    </div>
                    <button onclick="continueToFullAnalysis()" style="background: linear-gradient(135deg, #C79B3B 0%, #D4AF37 100%); border: none; color: #0A1428; font-size: 1.3rem; font-weight: bold; padding: 15px 40px; border-radius: 50px; cursor: pointer; transition: transform 0.3s;">
                        Continue to Full Analysis →
                    </button>
                    <p style="margin-top: 20px; color: #A09B8C; font-size: 0.9rem;">This will analyze all ${summonerData.recentMatches.length} matches</p>
                </div>
            `;

            // Store summoner data for later
            // Only use window storage - sessionStorage has quota issues with large timeline data
            window.currentSummonerData = summonerData;
        },
        error: function(xhr) {
            console.error('[PREVIEW] Error getting preview:', xhr);
            // Fall back to direct full analysis
            generateYearInReview(summonerData);
        }
    });
}

// Continue to full analysis after preview
function continueToFullAnalysis() {
    console.log('[YEAR IN REVIEW] Continuing to full analysis...');

    document.getElementById('loadingOverlay').innerHTML = `
        <div class="spinner"></div>
        <p style="margin-top: 20px;">Analyzing your 2025 League journey...</p>
        <p style="font-size: 0.9rem; color: #A09B8C; margin-top: 10px;">This may take a moment...</p>
    `;

    // Generate year in review
    generateYearInReview(window.currentSummonerData);
}

// Generate year in review from API
function generateYearInReview(summonerData) {
    const startTime = Date.now();
    console.log('[YEAR IN REVIEW] Sending API request with initial matches...');
    console.log('[YEAR IN REVIEW] Initial matches count:', summonerData.recentMatches.length);

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
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[YEAR IN REVIEW] ✅ Initial analysis received in ${elapsed}s`);

            reviewData = data;
            console.log('[YEAR IN REVIEW] Analysis data:', reviewData.analysis);
            console.log('[YEAR IN REVIEW] Total matches analyzed:', reviewData.total_matches);

            // Hide loading
            console.log('[YEAR IN REVIEW] Hiding loading overlay...');
            document.getElementById('loadingOverlay').style.display = 'none';

            // Build story cards
            console.log('[YEAR IN REVIEW] Building story cards...');
            buildStoryCards(summonerData, reviewData);
            console.log('[YEAR IN REVIEW] Story cards built successfully!');

            // Show champion recommendations section
            document.getElementById('championRecsSection').style.display = 'flex';

            // Show roast section
            document.getElementById('roastSection').style.display = 'flex';

            // Show share section
            document.getElementById('shareSection').style.display = 'flex';

            // Initialize scroll animations
            console.log('[YEAR IN REVIEW] Initializing scroll animations...');
            initScrollAnimations();
            console.log('[YEAR IN REVIEW] ✨ Initial review complete!');

            // Trigger background fetch for full data (500 matches) only if we have less than 500
            if (summonerData.recentMatches.length < 500) {
                console.log(`[YEAR IN REVIEW] Have ${summonerData.recentMatches.length} matches, fetching more...`);
                triggerFullDataFetch(summonerData);
            } else {
                console.log(`[YEAR IN REVIEW] Already have ${summonerData.recentMatches.length} matches, skipping background fetch`);
            }
        },
        error: function(xhr) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.error(`[YEAR IN REVIEW] ❌ API error after ${elapsed}s:`, xhr);
            console.error('[YEAR IN REVIEW] Status:', xhr.status);
            console.error('[YEAR IN REVIEW] Response:', xhr.responseText);

            document.getElementById('loadingOverlay').innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; padding: 30px; background: #1E2328; border: 2px solid #C73B3B; border-radius: 15px;">
                    <p style="color: #C73B3B; font-size: 1.5rem; margin-bottom: 20px;">Error generating review</p>
                    <p style="color: #E4E1D8; margin-bottom: 20px;">Please try again or contact us if the problem persists.</p>
                    <hr style="margin: 20px 0; border-color: #C79B3B;">
                    <div style="margin-top: 20px;">
                        <a href="mailto:m@sveder.com" style="color: #D4AF37; text-decoration: underline; margin-right: 20px;">Contact support</a>
                        <a href="/" style="color: #D4AF37; text-decoration: underline;">Back to form</a>
                    </div>
                </div>
            `;
        }
    });
}

// Trigger background fetch for full data (500 matches)
function triggerFullDataFetch(summonerData) {
    console.log('[FULL DATA] Starting background fetch for additional matches...');

    // Show a prominent notification at top-right
    const notification = document.createElement('div');
    notification.id = 'backgroundLoadNotification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(30, 35, 40, 0.98);
        border: 3px solid #C79B3B;
        border-radius: 15px;
        padding: 20px 30px;
        color: #E4E1D8;
        font-size: 1.1rem;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.7);
        min-width: 320px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div class="spinner" style="width: 30px; height: 30px; border-width: 3px;"></div>
            <span style="font-weight: 600;">Loading full match history...</span>
        </div>
    `;
    document.body.appendChild(notification);

    const [gameName, tagLine] = summonerData.summoner.name.split('#');

    $.ajax({
        url: '/api/summoner/full',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            gameName: gameName,
            tagLine: tagLine,
            region: summonerData.region
        }),
        success: function(fullData) {
            console.log(`[FULL DATA] ✅ Full data received: ${fullData.total_matches} matches`);

            // Update notification
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #3BC77B; font-size: 1.5rem;">✓</span>
                    <span style="font-weight: 600;">Loaded ${fullData.total_matches} total matches! Refreshing analysis...</span>
                </div>
            `;

            // Merge new matches with existing data
            summonerData.recentMatches = fullData.matches;

            // Save updated data to IndexedDB
            saveToIndexedDB('summonerData', summonerData).then(() => {
                console.log('[FULL DATA] Updated data saved to IndexedDB');
            });

            // Re-generate analysis with full data
            setTimeout(() => {
                // Update notification to show we're analyzing
                notification.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="spinner" style="width: 30px; height: 30px; border-width: 3px;"></div>
                        <span style="font-weight: 600;">Re-analyzing with ${fullData.total_matches} matches...</span>
                    </div>
                `;

                // Re-run analysis
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
                        console.log('[FULL DATA] ✅ Full analysis complete!');
                        reviewData = data;

                        // Remove notification
                        notification.style.opacity = '0';
                        setTimeout(() => notification.remove(), 500);

                        // Rebuild story cards with updated data
                        buildStoryCards(summonerData, reviewData);

                        // Ensure sections are visible
                        document.getElementById('championRecsSection').style.display = 'flex';
                        document.getElementById('roastSection').style.display = 'flex';
                        document.getElementById('shareSection').style.display = 'flex';

                        // Re-initialize scroll animations
                        initScrollAnimations();

                        // Scroll to top to see updated content
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    },
                    error: function(xhr) {
                        console.error('[FULL DATA] Error re-analyzing:', xhr);

                        // Show error in notification
                        notification.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="color: #C73B3B; font-size: 1.5rem;">✗</span>
                                <span style="font-weight: 600;">Error updating analysis. Showing initial results.</span>
                            </div>
                        `;

                        // Remove notification after 3 seconds
                        setTimeout(() => {
                            notification.style.opacity = '0';
                            setTimeout(() => notification.remove(), 500);
                        }, 3000);
                    }
                });
            }, 2000);
        },
        error: function(xhr) {
            console.error('[FULL DATA] ❌ Error fetching full data:', xhr);
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #C73B3B; font-size: 1.5rem;">✗</span>
                    <span style="font-weight: 600;">Could not load full history. Analysis based on ${summonerData.recentMatches.length} matches.</span>
                </div>
            `;
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
    });
}

// Build all story cards
function buildStoryCards(summonerData, reviewData) {
    console.log('[BUILD CARDS] Starting to build story cards...');
    const container = document.getElementById('storyCards');
    const analysis = reviewData.analysis;

    const cards = [];
    console.log('[BUILD CARDS] Analysis data available:', Object.keys(analysis));

    // Card 1: Welcome & Total Games - Full Width
    cards.push(`
        <div class="story-card" id="welcomeCard">
            <h2>Welcome Back, ${summonerData.summoner.name.split('#')[0]}!</h2>
            <div class="stat-number">${reviewData.total_matches}</div>
            <p>Games Played in Your League Journey</p>
            <p style="margin-top: 30px; color: #A09B8C;">${formatMarkdown(reviewData.narrative)}</p>
        </div>
    `);

    // Card 2: Win Rate & Performance
    const wins = summonerData.recentMatches.filter(m => m.win).length;
    const winRate = ((wins / reviewData.total_matches) * 100).toFixed(1);
    cards.push(`
        <div class="story-card">
            <h2>Your Battle Record</h2>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="label">Win Rate</div>
                    <div class="value">${winRate}%</div>
                </div>
                <div class="stat-box">
                    <div class="label">Victories</div>
                    <div class="value">${wins}</div>
                </div>
                <div class="stat-box">
                    <div class="label">Defeats</div>
                    <div class="value">${reviewData.total_matches - wins}</div>
                </div>
            </div>
        </div>
    `);

    // Card 2.5: Total Hours Played
    if (analysis.total_hours) {
        const hours = analysis.total_hours.total_hours;
        const avgGameMinutes = analysis.total_hours.average_game_minutes;
        const longestGame = analysis.total_hours.longest_game_minutes;
        const shortestGame = analysis.total_hours.shortest_game_minutes;

        cards.push(`
            <div class="story-card">
                <h2>⏱️ Time in the Rift ⏱️</h2>
                <div class="stat-number">${hours}</div>
                <p style="font-size: 1.5rem; margin-bottom: 30px;">Hours Played</p>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Avg Game Length</div>
                        <div class="value">${avgGameMinutes} min</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Longest Game</div>
                        <div class="value">${longestGame} min</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Shortest Game</div>
                        <div class="value">${shortestGame} min</div>
                    </div>
                </div>
                <p style="margin-top: 30px; color: #A09B8C;">That's ${Math.round(hours / 24)} days worth of League!</p>
            </div>
        `);
    }

    // Card 3: Nemesis
    if (analysis.nemesis) {
        cards.push(`
            <div class="story-card">
                <h2>Your Nemesis 😈</h2>
                <div class="nemesis-card">
                    <h3 style="color: #C73B3B; font-size: 2.5rem;">${analysis.nemesis.name}</h3>
                    <p style="font-size: 1.8rem; margin: 20px 0;">
                        Lost <span style="color: #C73B3B; font-weight: bold;">${analysis.nemesis.losses}</span> times against them
                    </p>
                    <p style="color: #A09B8C;">This player has your number. Time for revenge in 2025!</p>
                </div>
            </div>
        `);
    }

    // Card 4: BFF/Duo Partner
    if (analysis.bff) {
        cards.push(`
            <div class="story-card">
                <h2>Your Dynamic Duo 🤝</h2>
                <div class="bff-card">
                    <h3 style="color: #3BC77B; font-size: 2.5rem;">${analysis.bff.name}</h3>
                    <p style="font-size: 1.8rem; margin: 20px 0;">
                        <span style="color: #3BC77B; font-weight: bold;">${analysis.bff.games}</span> games together
                    </p>
                    <p style="font-size: 1.5rem; margin: 10px 0;">
                        ${analysis.bff.winrate}% Win Rate
                    </p>
                    <p style="color: #A09B8C;">Your most reliable teammate!</p>
                </div>
            </div>
        `);
    }

    // Card 5: Hot Streak Month
    if (analysis.hot_streak_month) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthDate = new Date(analysis.hot_streak_month.month + '-01');
        const monthName = monthNames[monthDate.getMonth()] + ' ' + monthDate.getFullYear();

        cards.push(`
            <div class="story-card">
                <h2>🔥 Peak Performance 🔥</h2>
                <h3 style="font-size: 3rem; color: #FFD700; margin: 30px 0;">${monthName}</h3>
                <p style="font-size: 1.8rem;">Your hottest month!</p>
                <div class="stats-grid" style="margin-top: 40px;">
                    <div class="stat-box">
                        <div class="label">Win Rate</div>
                        <div class="value">${analysis.hot_streak_month.winrate}%</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">KDA</div>
                        <div class="value">${analysis.hot_streak_month.kda}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Games</div>
                        <div class="value">${analysis.hot_streak_month.games}</div>
                    </div>
                </div>
            </div>
        `);
    }

    // Card 6: Slump Month (if different from hot streak)
    if (analysis.slump_month && analysis.slump_month.month !== analysis.hot_streak_month?.month) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthDate = new Date(analysis.slump_month.month + '-01');
        const monthName = monthNames[monthDate.getMonth()] + ' ' + monthDate.getFullYear();

        cards.push(`
            <div class="story-card">
                <h2>The Struggle Was Real 😅</h2>
                <h3 style="font-size: 3rem; color: #A09B8C; margin: 30px 0;">${monthName}</h3>
                <p style="font-size: 1.8rem;">We all have rough patches...</p>
                <p style="font-size: 1.5rem; margin-top: 30px; color: #C73B3B;">
                    ${analysis.slump_month.winrate}% Win Rate
                </p>
                <p style="color: #A09B8C; margin-top: 20px;">But you bounced back! That's what matters.</p>
            </div>
        `);
    }

    // Card 7: Glow Up
    if (analysis.glow_up && analysis.glow_up.improvement.winrate > 5) {
        cards.push(`
            <div class="story-card">
                <h2>✨ The Glow Up ✨</h2>
                <p style="font-size: 1.5rem; margin: 30px 0;">You improved throughout the year!</p>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Win Rate Improvement</div>
                        <div class="value" style="color: #3BC77B;">+${analysis.glow_up.improvement.winrate}%</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">KDA Improvement</div>
                        <div class="value" style="color: #3BC77B;">+${analysis.glow_up.improvement.kda}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Fewer Deaths</div>
                        <div class="value" style="color: #3BC77B;">-${analysis.glow_up.improvement.deaths_reduction.toFixed(1)}</div>
                    </div>
                </div>
                <p style="color: #A09B8C; margin-top: 30px;">From good to great! Keep it up!</p>
            </div>
        `);
    }

    // Card 8: Highlight Stats
    if (analysis.highlight_stats) {
        const highlights = analysis.highlight_stats;
        const highlightCards = [];

        if (highlights.total_pentakills > 0) {
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">⭐ Pentakills</div>
                    <div class="value">${highlights.total_pentakills}</div>
                </div>
            `);
        }

        if (highlights.total_quadrakills > 0) {
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">Quadra Kills</div>
                    <div class="value">${highlights.total_quadrakills}</div>
                </div>
            `);
        }

        if (highlights.longest_living > 0) {
            const livingDetails = highlights.longest_living_details ? `
                <div style="font-size: 0.9rem; color: #A09B8C; margin-top: 10px;">
                    ${highlights.longest_living_details.champion}<br>
                    ${highlights.longest_living_details.date}
                </div>
            ` : '';
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">Longest Time Living</div>
                    <div class="value">${Math.floor(highlights.longest_living / 60)}m</div>
                    ${livingDetails}
                </div>
            `);
        }

        if (highlights.largest_crit > 0) {
            const critDetails = highlights.largest_crit_details ? `
                <div style="font-size: 0.9rem; color: #A09B8C; margin-top: 10px;">
                    ${highlights.largest_crit_details.champion}<br>
                    ${highlights.largest_crit_details.date}
                </div>
            ` : '';
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">Largest Critical Strike</div>
                    <div class="value">${highlights.largest_crit}</div>
                    ${critDetails}
                </div>
            `);
        }

        if (highlights.most_kills_game > 0) {
            const killDetails = highlights.most_kills_details ? `
                <div style="font-size: 0.9rem; color: #A09B8C; margin-top: 10px;">
                    ${highlights.most_kills_details.champion}<br>
                    ${highlights.most_kills_details.date}<br>
                    ${highlights.most_kills_details.kda}
                </div>
            ` : '';
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">Most Kills (One Game)</div>
                    <div class="value">${highlights.most_kills_game}</div>
                    ${killDetails}
                </div>
            `);
        }

        if (highlights.largest_spree > 0) {
            const spreeDetails = highlights.largest_spree_details ? `
                <div style="font-size: 0.9rem; color: #A09B8C; margin-top: 10px;">
                    ${highlights.largest_spree_details.champion}<br>
                    ${highlights.largest_spree_details.date}
                </div>
            ` : '';
            highlightCards.push(`
                <div class="stat-box">
                    <div class="label">Longest Killing Spree</div>
                    <div class="value">${highlights.largest_spree}</div>
                    ${spreeDetails}
                </div>
            `);
        }

        if (highlightCards.length > 0) {
            cards.push(`
                <div class="story-card">
                    <h2>🏆 Highlight Reel 🏆</h2>
                    <p style="font-size: 1.5rem; margin-bottom: 40px;">Your most epic moments</p>
                    <div class="stats-grid">
                        ${highlightCards.join('')}
                    </div>
                </div>
            `);
        }
    }

    // Card 9: Win Streak
    if (analysis.longest_win_streak && analysis.longest_win_streak.streak > 3) {
        const streakDetails = analysis.longest_win_streak.start_game ? `
            <div style="margin-top: 30px; padding: 20px; background: rgba(199, 155, 59, 0.1); border-radius: 15px;">
                <p style="font-size: 1.2rem; color: #C79B3B; margin-bottom: 15px;">
                    Started with <strong>${analysis.longest_win_streak.start_game.champion}</strong> on ${analysis.longest_win_streak.start_game.date}
                </p>
                <p style="font-size: 1rem; color: #A09B8C;">
                    KDA: ${analysis.longest_win_streak.start_game.kda}
                </p>
                <p style="font-size: 1.2rem; color: #C79B3B; margin-top: 15px;">
                    Ended with <strong>${analysis.longest_win_streak.end_game.champion}</strong> on ${analysis.longest_win_streak.end_game.date}
                </p>
                <p style="font-size: 1rem; color: #A09B8C;">
                    KDA: ${analysis.longest_win_streak.end_game.kda}
                </p>
            </div>
        ` : '';

        cards.push(`
            <div class="story-card">
                <h2>🔥 Unstoppable 🔥</h2>
                <div class="stat-number">${analysis.longest_win_streak.streak}</div>
                <p style="font-size: 1.8rem; margin: 30px 0;">Game Win Streak</p>
                ${streakDetails}
                <p style="color: #A09B8C; margin-top: 20px;">You were on fire!</p>
            </div>
        `);
    }

    // Card 10: AFK Stats (if significant)
    if (analysis.afk_stats && analysis.afk_stats.won_with_afk > 0) {
        cards.push(`
            <div class="story-card">
                <h2>💪 Against All Odds 💪</h2>
                <p style="font-size: 1.8rem; margin: 30px 0;">
                    Won <span style="color: #3BC77B; font-size: 3rem; font-weight: bold;">${analysis.afk_stats.won_with_afk}</span>
                    ${analysis.afk_stats.won_with_afk === 1 ? 'game' : 'games'} with an AFK teammate
                </p>
                <p style="color: #A09B8C;">True carry potential!</p>
            </div>
        `);
    }

    // Card 11: Miracle Comeback
    if (analysis.miracle_comeback) {
        const comeback = analysis.miracle_comeback;
        cards.push(`
            <div class="story-card">
                <h2>🌟 Miracle Comeback 🌟</h2>
                <p style="font-size: 1.5rem; margin: 20px 0;">
                    Died <strong style="color: #C73B3B; font-size: 2.5rem;">${comeback.deaths}</strong> times but still won!
                </p>
                <div style="margin-top: 30px; padding: 20px; background: rgba(59, 199, 123, 0.1); border-radius: 15px;">
                    <p style="font-size: 1.2rem; color: #3BC77B; margin-bottom: 10px;">
                        <strong>${comeback.championName}</strong>
                    </p>
                    <p style="font-size: 1rem; color: #A09B8C;">
                        ${comeback.date} at ${comeback.time}
                    </p>
                    <p style="font-size: 1.3rem; color: #C79B3B; margin-top: 15px;">
                        Final KDA: ${comeback.kills}/${comeback.deaths}/${comeback.assists} (${comeback.kda})
                    </p>
                </div>
                <p style="color: #A09B8C; margin-top: 20px;">Never give up, never surrender!</p>
            </div>
        `);
    }

    // Card 12: Pentakill Breaker
    if (analysis.pentakill_breaker && analysis.pentakill_breaker.count > 0) {
        cards.push(`
            <div class="story-card">
                <h2>💔 So Close... 💔</h2>
                <div class="stat-number">${analysis.pentakill_breaker.count}</div>
                <p style="font-size: 1.8rem; margin: 30px 0;">
                    ${analysis.pentakill_breaker.count === 1 ? 'Quadra kill' : 'Quadra kills'} that didn't become Pentas
                </p>
                <p style="color: #A09B8C;">Next year, they won't stop you!</p>
            </div>
        `);
    }

    // Card 12: What-If Scenarios
    if (analysis.what_if_scenarios) {
        const whatIf = analysis.what_if_scenarios.main_champion_only;
        const diffText = whatIf.difference > 0 ? `+${whatIf.difference}%` : `${whatIf.difference}%`;
        const diffColor = whatIf.difference > 0 ? '#3BC77B' : '#C73B3B';

        cards.push(`
            <div class="story-card">
                <h2>🤔 What If...? 🤔</h2>
                <p style="font-size: 1.5rem; margin: 30px 0;">
                    If you ONLY played ${whatIf.champion}...
                </p>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Games on ${whatIf.champion}</div>
                        <div class="value">${whatIf.games_played}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Win Rate</div>
                        <div class="value">${whatIf.winrate}%</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Difference</div>
                        <div class="value" style="color: ${diffColor};">${diffText}</div>
                    </div>
                </div>
                <p style="color: #A09B8C; margin-top: 30px;">
                    ${whatIf.difference > 5 ? 'Maybe stick to your main! 🎯' : whatIf.difference < -5 ? 'Variety is the spice of life! 🌈' : 'You are doing great either way! ✨'}
                </p>
            </div>
        `);
    }

    // Card 13: Time Analysis
    if (analysis.time_analysis && analysis.time_analysis.best_time) {
        const timeData = analysis.time_analysis;
        const bestTime = timeData.best_time;
        const bestStats = timeData[bestTime];

        cards.push(`
            <div class="story-card">
                <h2>⏰ Peak Hours ⏰</h2>
                <p style="font-size: 1.8rem; margin: 30px 0;">
                    You play best during: <span style="color: #FFD700;">${bestTime}</span>
                </p>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="label">Win Rate</div>
                        <div class="value">${bestStats.winrate}%</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Games Played</div>
                        <div class="value">${bestStats.games}</div>
                    </div>
                </div>
            </div>
        `);
    }

    // Card 14: Champion Diversity
    if (analysis.champion_diversity) {
        const diversity = analysis.champion_diversity;
        cards.push(`
            <div class="story-card">
                <h2>${diversity.one_trick ? '🎯 One-Trick Pony' : '🌈 Champion Pool'} </h2>
                <div class="stat-number">${diversity.unique_champions}</div>
                <p style="font-size: 1.8rem; margin: 30px 0;">Unique Champions Played</p>
                <div class="stats-grid">
                    ${diversity.top_3_champions.map((champ, idx) => `
                        <div class="stat-box">
                            <div class="label">${idx + 1}. ${champ.name}</div>
                            <div class="value">${champ.games}</div>
                        </div>
                    `).join('')}
                </div>
                <p style="color: #A09B8C; margin-top: 30px;">
                    ${diversity.one_trick ? 'You know what you love! 💪' : 'Versatility is your strength! 🌟'}
                </p>
            </div>
        `);
    }

    // Card 14.5: Build Comparison (OP.GG)
    if (analysis.build_comparison && analysis.build_comparison.optimal_build) {
        const buildData = analysis.build_comparison;
        const optimal = buildData.optimal_build;
        const playerItems = buildData.player_most_common_items || [];

        cards.push(`
            <div class="story-card">
                <h2>📊 Build Check (OP.GG)</h2>
                <h3 style="color: #C79B3B; font-size: 1.8rem; margin-bottom: 10px;">${buildData.champion} ${buildData.position}</h3>
                <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 30px;">Based on ${buildData.games_analyzed} games analyzed</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
                    <div style="background: rgba(59, 199, 123, 0.1); border: 2px solid #3BC77B; border-radius: 15px; padding: 20px;">
                        <h4 style="color: #3BC77B; margin-bottom: 15px;">✓ Meta Build</h4>
                        <p style="font-size: 0.85rem; color: #A09B8C; margin-bottom: 10px;">Win Rate: ${optimal.win_rate}%</p>

                        ${optimal.core_items && optimal.core_items.length > 0 ? `
                            <div style="margin-top: 15px;">
                                <p style="color: #E4E1D8; font-size: 0.9rem; margin-bottom: 10px;">Core Items:</p>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                    ${optimal.core_items.slice(0, 6).map(item => `
                                        <div style="background: rgba(255, 255, 255, 0.1); padding: 5px; border-radius: 5px; text-align: center;" title="${getItemName(item)}">
                                            <img src="${getItemImage(item)}" style="width: 40px; height: 40px; border-radius: 3px; display: block; margin: 0 auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                            <span style="display: none; font-size: 0.7rem; color: #A09B8C;">${item}</span>
                                            <div style="font-size: 0.65rem; margin-top: 3px; color: #E4E1D8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getItemName(item)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${optimal.boots && optimal.boots.length > 0 ? `
                            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                                <p style="font-size: 0.85rem; color: #A09B8C; margin-bottom: 5px;">Boots:</p>
                                <div style="display: inline-block; background: rgba(255, 255, 255, 0.1); padding: 5px; border-radius: 5px;">
                                    <img src="${getItemImage(optimal.boots[0])}" style="width: 40px; height: 40px; border-radius: 3px; vertical-align: middle;" onerror="this.style.display='none';" />
                                    <span style="font-size: 0.75rem; margin-left: 5px; vertical-align: middle;">${getItemName(optimal.boots[0])}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div style="background: rgba(199, 59, 59, 0.1); border: 2px solid #C73B3B; border-radius: 15px; padding: 20px;">
                        <h4 style="color: #C73B3B; margin-bottom: 15px;">✗ Your Build</h4>
                        <p style="font-size: 0.85rem; color: #A09B8C; margin-bottom: 10px;">Most Common Items</p>

                        ${playerItems.length > 0 ? `
                            <div style="margin-top: 15px;">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                    ${playerItems.slice(0, 6).map(item => {
                                        const isInMeta = optimal.core_items && optimal.core_items.includes(item);
                                        return `
                                            <div style="background: ${isInMeta ? 'rgba(59, 199, 123, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; padding: 5px; border-radius: 5px; text-align: center; border: 2px solid ${isInMeta ? '#3BC77B' : 'transparent'};" title="${getItemName(item)}">
                                                <img src="${getItemImage(item)}" style="width: 40px; height: 40px; border-radius: 3px; display: block; margin: 0 auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                                <span style="display: none; font-size: 0.7rem; color: #A09B8C;">${item}</span>
                                                <div style="font-size: 0.65rem; margin-top: 3px; color: ${isInMeta ? '#3BC77B' : '#E4E1D8'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getItemName(item)}</div>
                                                ${isInMeta ? '<div style="font-size: 0.6rem; color: #3BC77B;">✓</div>' : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : '<p style="color: #A09B8C;">No builds recorded</p>'}
                    </div>
                </div>

                ${buildData.meta_winrate ? `
                    <div style="margin-top: 25px; padding: 15px; background: rgba(199, 155, 59, 0.1); border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.9rem;">
                            ${buildData.champion} has a ${buildData.meta_winrate}% win rate in the meta.
                            Items with <span style="color: #3BC77B; font-weight: bold;">✓</span> match the optimal build!
                        </p>
                    </div>
                ` : ''}
            </div>
        `);
    }

    // Card 15: CS Efficiency
    if (analysis.cs_efficiency) {
        const cs = analysis.cs_efficiency;
        const monthlyData = cs.monthly_data || [];

        // Find min and max CS values for proper scaling
        const csValues = monthlyData.map(m => m.cs_per_min);
        const minCs = Math.min(...csValues);
        const maxCs = Math.max(...csValues);
        const csRange = maxCs - minCs || 1;

        // Generate sparkline chart data with proper scaling and padding
        const chartPoints = monthlyData.map((m, idx) => {
            const x = (idx / Math.max(monthlyData.length - 1, 1)) * 100;
            // Scale to use 20-80% of the height (leaving padding top and bottom)
            const y = 80 - ((m.cs_per_min - minCs) / csRange * 60);
            return `${x},${y}`;
        }).join(' ');

        // Determine display message based on role
        let comparisonHtml;
        if (cs.is_jungler) {
            comparisonHtml = `
                <div style="margin-top: 20px; padding: 15px; background: rgba(199, 155, 59, 0.1); border-radius: 10px;">
                    <p style="color: #C79B3B; font-size: 1.1rem; margin: 5px 0;">
                        <strong>Jungle Main</strong>
                    </p>
                    <p style="color: #A09B8C; font-size: 0.95rem; margin: 5px 0;">
                        ${cs.jungle_percentage}% of games in the jungle
                    </p>
                    <p style="color: #A09B8C; font-size: 0.85rem; margin: 5px 0; font-style: italic;">
                        CS comparisons work best for laners
                    </p>
                </div>
            `;
        } else {
            const rankBenchmark = cs.benchmarks[cs.estimated_rank] || 5.0;
            const percentAboveBenchmark = ((cs.overall_cs_per_min - rankBenchmark) / rankBenchmark * 100).toFixed(0);
            comparisonHtml = `
                <div style="margin-top: 20px; padding: 15px; background: rgba(199, 155, 59, 0.1); border-radius: 10px;">
                    <p style="color: #C79B3B; font-size: 1.1rem; margin: 5px 0;">
                        <strong>${cs.estimated_rank}</strong> Level Farming
                    </p>
                    <p style="color: #A09B8C; font-size: 0.95rem; margin: 5px 0;">
                        ${percentAboveBenchmark > 0 ? `${percentAboveBenchmark}% above` : `${Math.abs(percentAboveBenchmark)}% below`} ${cs.estimated_rank} average
                    </p>
                </div>
            `;
        }

        cards.push(`
            <div class="story-card">
                <h2>🎯 CS Efficiency</h2>
                <div class="stat-number">${cs.overall_cs_per_min}</div>
                <p style="font-size: 1.3rem; margin-bottom: 20px;">CS per Minute</p>

                <!-- Mini chart with proper viewBox -->
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 80px; margin: 20px 0;">
                    <polyline points="${chartPoints}" fill="none" stroke="#C79B3B" stroke-width="2" vector-effect="non-scaling-stroke" />
                    ${monthlyData.map((m, idx) => {
                        const x = (idx / Math.max(monthlyData.length - 1, 1)) * 100;
                        const y = 80 - ((m.cs_per_min - minCs) / csRange * 60);
                        return `<circle cx="${x}" cy="${y}" r="2" fill="#FFD700" />`;
                    }).join('')}
                </svg>

                ${comparisonHtml}

                <p style="color: #A09B8C; margin-top: 15px; font-size: 0.9rem;">
                    Total CS: ${cs.total_cs.toLocaleString()}
                </p>

                <div style="margin-top: 20px; padding: 15px; background: rgba(59, 199, 123, 0.1); border: 2px solid #3BC77B; border-radius: 10px;">
                    <p style="color: #3BC77B; font-size: 1rem; margin-bottom: 10px; font-weight: bold;">
                        🎮 Improve Your Vision Skills!
                    </p>
                    <p style="color: #A09B8C; font-size: 0.85rem; margin-bottom: 10px;">
                        Practice ward placement and last-hitting in our interactive mini-game.
                    </p>
                    <a href="/ward-game" style="display: inline-block; background: linear-gradient(135deg, #3BC77B 0%, #4CAF50 100%); color: #0A1428; padding: 10px 20px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 0.9rem;">
                        Play Vision Game →
                    </a>
                </div>
            </div>
        `);
    }

    // Card 16: Kill Steals
    if (analysis.kill_steals && analysis.kill_steals.total_kills > 0) {
        const ks = analysis.kill_steals;

        // Determine message based on kill steal rate
        let ksMessage = "";
        let ksEmoji = "";
        if (ks.kill_steal_rate > 30) {
            ksEmoji = "🥷";
            ksMessage = "Professional Kill Stealer";
        } else if (ks.kill_steal_rate > 15) {
            ksEmoji = "😏";
            ksMessage = "Opportunistic Finisher";
        } else if (ks.kill_steal_rate > 5) {
            ksEmoji = "🎯";
            ksMessage = "Efficient Damage Dealer";
        } else {
            ksEmoji = "💪";
            ksMessage = "True Carry";
        }

        cards.push(`
            <div class="story-card">
                <h2>${ksEmoji} Kill Participation</h2>
                <div class="stat-number">${ks.average_damage_contribution}%</div>
                <p style="font-size: 1.3rem; margin-bottom: 20px;">Average Damage on Kills</p>

                <div style="margin-top: 20px; padding: 15px; background: rgba(199, 155, 59, 0.1); border-radius: 10px;">
                    <p style="color: #C79B3B; font-size: 1.1rem; margin: 5px 0;">
                        <strong>${ksMessage}</strong>
                    </p>
                    <p style="color: #A09B8C; font-size: 0.95rem; margin: 10px 0;">
                        ${ks.kill_steals} kills with <15% damage (${ks.kill_steal_rate}%)
                    </p>
                </div>

                ${ks.most_shameless_kill ? `
                    <div style="margin-top: 15px; padding: 12px; background: rgba(255, 100, 100, 0.1); border-radius: 8px; border-left: 3px solid #ff6464;">
                        <p style="color: #ff6464; font-size: 0.9rem; margin: 0; font-weight: bold;">
                            Most Shameless Kill Steal
                        </p>
                        <p style="color: #A09B8C; font-size: 0.85rem; margin: 5px 0 0 0;">
                            ${ks.most_shameless_kill.damage_percentage}% damage contribution
                        </p>
                        <p style="color: #A09B8C; font-size: 0.8rem; margin: 3px 0 0 0; font-style: italic;">
                            (${ks.most_shameless_kill.killer_damage} of ${ks.most_shameless_kill.team_damage} team damage)
                        </p>
                    </div>
                ` : ''}

                <p style="color: #A09B8C; margin-top: 15px; font-size: 0.9rem;">
                    Analyzed ${ks.total_kills} kills across recent matches
                </p>
            </div>
        `);
    }

    // Card 17: Tilt Detection
    if (analysis.tilt_detection) {
        const tilt = analysis.tilt_detection;

        // Determine status message and styling based on tilt_status
        let tiltColor, tiltEmoji, tiltStatusText, tiltMessage;

        switch(tilt.tilt_status) {
            case 'heavily_tilting':
                tiltColor = '#8B0000'; // Dark red
                tiltEmoji = '💀';
                tiltStatusText = 'Heavily Tilting';
                tiltMessage = `With a ${tilt.baseline_winrate}% win rate, you're in a serious slump. Time to take a break and reset!`;
                break;
            case 'tilting':
                tiltColor = '#C73B3B'; // Red
                tiltEmoji = '🔥';
                tiltStatusText = 'Tilt Detected';
                tiltMessage = `Your performance drops significantly after losses. Consider taking breaks to maintain your edge.`;
                break;
            case 'tilt_prone':
                tiltColor = '#D4AF37'; // Gold/Warning
                tiltEmoji = '⚠️';
                tiltStatusText = 'Tilt Prone';
                tiltMessage = `You've had ${tilt.tilt_episodes} tilt episodes. Watch for signs of frustration and take breaks when needed.`;
                break;
            case 'struggling':
                tiltColor = '#FFA500'; // Orange
                tiltEmoji = '😰';
                tiltStatusText = 'Struggling';
                tiltMessage = `${tilt.baseline_winrate}% win rate suggests you're having a rough patch. Don't worry, everyone has off periods!`;
                break;
            default: // tilt_proof
                tiltColor = '#3BC77B'; // Green
                tiltEmoji = '🧘';
                tiltStatusText = 'Mental Fortress';
                tiltMessage = 'You maintain composure after losses - keep it up!';
        }

        cards.push(`
            <div class="story-card">
                <h2>${tiltEmoji} Tilt Analysis</h2>
                <h3 style="color: ${tiltColor}; font-size: 1.8rem; margin-bottom: 10px;">${tiltStatusText}</h3>
                <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 20px;">Overall Win Rate: <strong style="color: #C79B3B;">${tilt.baseline_winrate}%</strong></p>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">Baseline WR</p>
                        <p style="color: #3BC77B; font-size: 1.5rem; font-weight: bold; margin: 0;">${tilt.wr_normal}%</p>
                        <p style="color: #A09B8C; font-size: 0.65rem; margin-top: 3px; font-style: italic;">With momentum</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">After 2 Losses</p>
                        <p style="color: ${tilt.wr_after_2_losses < tilt.wr_normal ? '#C73B3B' : '#3BC77B'}; font-size: 1.5rem; font-weight: bold; margin: 0;">${tilt.wr_after_2_losses}%</p>
                        <p style="color: #A09B8C; font-size: 0.65rem; margin-top: 3px;">${tilt.games_analyzed_after_2_losses} games</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">After 3 Losses</p>
                        <p style="color: ${tilt.wr_after_3_losses < tilt.wr_normal ? '#C73B3B' : '#3BC77B'}; font-size: 1.5rem; font-weight: bold; margin: 0;">${tilt.wr_after_3_losses}%</p>
                        <p style="color: #A09B8C; font-size: 0.65rem; margin-top: 3px;">${tilt.games_analyzed_after_3_losses} games</p>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: ${tilt.is_tilting || tilt.is_heavily_tilting ? 'rgba(199, 59, 59, 0.1)' : 'rgba(59, 199, 123, 0.1)'}; border-radius: 10px; border-left: 3px solid ${tiltColor};">
                    <p style="color: ${tiltColor}; font-size: 1.1rem; margin: 5px 0; font-weight: bold;">
                        ${tilt.is_heavily_tilting ? '⚠️ Critical Status' : tilt.is_tilting ? '⚠️ Warning' : '✨ Status'}
                    </p>
                    <p style="color: #A09B8C; font-size: 0.95rem; margin: 10px 0;">
                        ${tiltMessage}
                    </p>
                    ${tilt.tilt_drop_2_losses >= 10 ? `
                        <p style="color: #A09B8C; font-size: 0.85rem; margin: 5px 0; font-style: italic;">
                            💡 Tip: Your win rate drops ${tilt.tilt_drop_2_losses}% after losing 2 games in a row. Take breaks!
                        </p>
                    ` : ''}
                </div>

                <div style="margin-top: 15px; display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">Tilt Episodes</p>
                        <p style="color: #E4E1D8; font-size: 1.2rem; font-weight: bold; margin: 0;">${tilt.tilt_episodes}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">Longest Loss Streak</p>
                        <p style="color: #E4E1D8; font-size: 1.2rem; font-weight: bold; margin: 0;">${tilt.longest_loss_streak}</p>
                    </div>
                </div>
            </div>
        `);
    }

    // Card 18: Champion Fatigue
    if (analysis.champion_fatigue && analysis.champion_fatigue.has_fatigue) {
        const fatigue = analysis.champion_fatigue;
        const topFatigue = fatigue.fatigued_champions[0];

        cards.push(`
            <div class="story-card">
                <h2>😴 Champion Fatigue</h2>
                <h3 style="color: #C79B3B; font-size: 1.5rem; margin-bottom: 20px;">Performance Drop on Repeat Picks</h3>

                ${topFatigue ? `
                    <div style="background: rgba(199, 59, 59, 0.1); border: 2px solid #C73B3B; border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                        <p style="color: #C73B3B; font-size: 1.3rem; margin-bottom: 15px; font-weight: bold;">${topFatigue.champion}</p>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div style="background: rgba(59, 199, 123, 0.1); padding: 12px; border-radius: 8px;">
                                <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">Games 1-3</p>
                                <p style="color: #3BC77B; font-size: 1.4rem; font-weight: bold; margin: 0;">${topFatigue.early_wr}%</p>
                                <p style="color: #A09B8C; font-size: 0.75rem; margin-top: 3px;">${topFatigue.early_games} games</p>
                            </div>
                            <div style="background: rgba(199, 59, 59, 0.1); padding: 12px; border-radius: 8px;">
                                <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">Games 5+</p>
                                <p style="color: #C73B3B; font-size: 1.4rem; font-weight: bold; margin: 0;">${topFatigue.late_wr}%</p>
                                <p style="color: #A09B8C; font-size: 0.75rem; margin-top: 3px;">${topFatigue.late_games} games</p>
                            </div>
                        </div>

                        <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px;">
                            <p style="color: #C73B3B; font-size: 1.2rem; font-weight: bold; margin: 0;">
                                -${topFatigue.drop}% Win Rate Drop
                            </p>
                            <p style="color: #A09B8C; font-size: 0.85rem; margin-top: 5px;">
                                After playing ${topFatigue.champion} repeatedly
                            </p>
                        </div>
                    </div>
                ` : ''}

                ${fatigue.fatigued_champions.length > 1 ? `
                    <div style="margin-top: 15px;">
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 10px;">Other Fatigued Champions:</p>
                        ${fatigue.fatigued_champions.slice(1, 3).map(champ => `
                            <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                                <span style="color: #E4E1D8; font-weight: bold;">${champ.champion}</span>
                                <span style="color: #C73B3B; margin-left: 10px;">-${champ.drop}%</span>
                                <span style="color: #A09B8C; font-size: 0.85rem; margin-left: 10px;">(${champ.early_wr}% → ${champ.late_wr}%)</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <p style="color: #A09B8C; margin-top: 20px; font-size: 0.85rem; font-style: italic;">
                    💡 Tip: Mix up your champion pool to avoid fatigue!
                </p>
            </div>
        `);
    }

    // Card 19: Learning Curves
    if (analysis.learning_curves) {
        const learning = analysis.learning_curves;
        const improvementColor = learning.is_improving ? '#3BC77B' : '#C79B3B';
        const improvementEmoji = learning.is_improving ? '📈' : '📊';

        cards.push(`
            <div class="story-card">
                <h2>${improvementEmoji} Learning Curve</h2>
                <h3 style="color: ${improvementColor}; font-size: 1.5rem; margin-bottom: 20px;">
                    ${learning.is_improving ? 'Leveling Up!' : 'Holding Steady'}
                </h3>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <!-- CS/min Progress -->
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.85rem; margin-bottom: 10px; text-align: center;">CS/min</p>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <p style="color: #A09B8C; font-size: 0.7rem;">Early</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.cs_per_min.early}</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #C79B3B; font-size: 0.7rem;">→</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: #A09B8C; font-size: 0.7rem;">Late</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.cs_per_min.late}</p>
                            </div>
                        </div>
                        <p style="color: ${learning.cs_per_min.improvement > 0 ? '#3BC77B' : '#C73B3B'}; font-size: 0.9rem; text-align: center; font-weight: bold;">
                            ${learning.cs_per_min.improvement > 0 ? '+' : ''}${learning.cs_per_min.improvement}
                        </p>
                    </div>

                    <!-- KDA Progress -->
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.85rem; margin-bottom: 10px; text-align: center;">KDA</p>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <p style="color: #A09B8C; font-size: 0.7rem;">Early</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.kda.early}</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #C79B3B; font-size: 0.7rem;">→</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: #A09B8C; font-size: 0.7rem;">Late</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.kda.late}</p>
                            </div>
                        </div>
                        <p style="color: ${learning.kda.improvement > 0 ? '#3BC77B' : '#C73B3B'}; font-size: 0.9rem; text-align: center; font-weight: bold;">
                            ${learning.kda.improvement > 0 ? '+' : ''}${learning.kda.improvement}
                        </p>
                    </div>

                    <!-- Win Rate Progress -->
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.85rem; margin-bottom: 10px; text-align: center;">Win Rate</p>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <p style="color: #A09B8C; font-size: 0.7rem;">Early</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.winrate.early}%</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="color: #C79B3B; font-size: 0.7rem;">→</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: #A09B8C; font-size: 0.7rem;">Late</p>
                                <p style="color: #E4E1D8; font-size: 1.1rem; font-weight: bold;">${learning.winrate.late}%</p>
                            </div>
                        </div>
                        <p style="color: ${learning.winrate.improvement > 0 ? '#3BC77B' : '#C73B3B'}; font-size: 0.9rem; text-align: center; font-weight: bold;">
                            ${learning.winrate.improvement > 0 ? '+' : ''}${learning.winrate.improvement}%
                        </p>
                    </div>
                </div>

                ${learning.is_improving ? `
                    <div style="background: rgba(59, 199, 123, 0.1); border-radius: 10px; padding: 15px; border-left: 3px solid #3BC77B;">
                        <p style="color: #3BC77B; font-size: 1.1rem; margin: 0; font-weight: bold;">
                            You're on the grind! 💪
                        </p>
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                            Your performance has measurably improved over the year
                        </p>
                    </div>
                ` : `
                    <div style="background: rgba(199, 155, 59, 0.1); border-radius: 10px; padding: 15px; border-left: 3px solid #C79B3B;">
                        <p style="color: #C79B3B; font-size: 1.1rem; margin: 0; font-weight: bold;">
                            Consistent Performance
                        </p>
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                            You're maintaining your skill level
                        </p>
                    </div>
                `}
            </div>
        `);
    }

    // Card 20: Meta Adaptation
    if (analysis.meta_adaptation) {
        const meta = analysis.meta_adaptation;
        const adaptColor = meta.is_adapting ? '#3BC77B' : '#C79B3B';

        cards.push(`
            <div class="story-card">
                <h2>🔄 Meta Adaptation</h2>
                <h3 style="color: ${adaptColor}; font-size: 1.5rem; margin-bottom: 20px;">
                    ${meta.is_adapting ? 'Meta Chaser' : 'Creature of Habit'}
                </h3>

                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 10px;">Patches Played: <strong style="color: #E4E1D8;">${meta.patches_played}</strong></p>
                    <p style="color: #A09B8C; font-size: 0.9rem; margin: 0;">Diversity Score: <strong style="color: ${adaptColor};">${meta.avg_diversity_score}</strong></p>
                    <p style="color: #A09B8C; font-size: 0.75rem; margin-top: 5px; font-style: italic;">
                        (Higher = more champion variety per patch)
                    </p>
                </div>

                ${meta.patch_data && meta.patch_data.length > 0 ? `
                    <div style="margin-top: 15px;">
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 10px;">Recent Patches:</p>
                        ${meta.patch_data.slice(0, 3).map(patch => `
                            <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="color: #C79B3B; font-weight: bold;">Patch ${patch.patch}</span>
                                        <span style="color: #A09B8C; font-size: 0.85rem; margin-left: 10px;">${patch.games} games</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="color: ${patch.winrate >= 50 ? '#3BC77B' : '#C73B3B'}; font-weight: bold;">${patch.winrate}%</span>
                                    </div>
                                </div>
                                <p style="color: #A09B8C; font-size: 0.75rem; margin-top: 5px;">
                                    ${patch.unique_champions} unique champions
                                </p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${meta.is_adapting ? `
                    <div style="margin-top: 20px; background: rgba(59, 199, 123, 0.1); border-radius: 10px; padding: 15px; border-left: 3px solid #3BC77B;">
                        <p style="color: #3BC77B; font-size: 1.1rem; margin: 0; font-weight: bold;">
                            Adapting to the Meta
                        </p>
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                            You explore different champions each patch - keeping up with the meta!
                        </p>
                    </div>
                ` : `
                    <div style="margin-top: 20px; background: rgba(199, 155, 59, 0.1); border-radius: 10px; padding: 15px; border-left: 3px solid #C79B3B;">
                        <p style="color: #C79B3B; font-size: 1.1rem; margin: 0; font-weight: bold;">
                            Comfort Pick Player
                        </p>
                        <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                            You stick to your favorite champions regardless of patch changes
                        </p>
                    </div>
                `}
            </div>
        `);
    }

    // NEW INSIGHTS CARDS

    // Card 21: Comeback Potential
    if (analysis.comeback_potential && analysis.comeback_potential.total_deficit_games > 0) {
        const comeback = analysis.comeback_potential;
        const comebackColor = comeback.comeback_rate >= 40 ? '#3BC77B' : comeback.comeback_rate >= 25 ? '#C79B3B' : '#C73B3B';

        cards.push(`
            <div class="story-card">
                <h2>👑 Comeback King Score</h2>
                <div class="stat-number" style="color: ${comebackColor};">${comeback.comeback_score}</div>
                <p style="font-size: 1.3rem; margin-bottom: 20px;">Resilience Rating</p>

                <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-bottom: 10px;">
                        When Behind at 15 Minutes:
                    </p>
                    <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                        <div style="text-align: center;">
                            <p style="color: #C79B3B; font-size: 2rem; font-weight: bold; margin: 0;">${comeback.comeback_games}</p>
                            <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 5px;">Comeback Wins</p>
                        </div>
                        <div style="text-align: center;">
                            <p style="color: ${comebackColor}; font-size: 2rem; font-weight: bold; margin: 0;">${comeback.comeback_rate}%</p>
                            <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 5px;">Success Rate</p>
                        </div>
                    </div>
                </div>

                <div style="background: ${comeback.comeback_rate >= 40 ? 'rgba(59, 199, 123, 0.1)' : 'rgba(199, 155, 59, 0.1)'}; border-radius: 10px; padding: 15px; border-left: 3px solid ${comebackColor};">
                    <p style="color: ${comebackColor}; font-size: 1.1rem; margin: 0; font-weight: bold;">
                        ${comeback.comeback_rate >= 40 ? '🔥 Never Give Up Attitude!' : comeback.comeback_rate >= 25 ? '💪 Solid Mental Game' : '📈 Room to Improve'}
                    </p>
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                        ${comeback.comeback_rate >= 40 ?
                            'You thrive under pressure and turn deficits into victories!' :
                            comeback.comeback_rate >= 25 ?
                            'You stay competitive even when behind - keep fighting!' :
                            'Focus on playing safer when behind and look for comeback opportunities'}
                    </p>
                </div>
            </div>
        `);
    }

    // Card 22: Power Spikes
    if (analysis.power_spikes) {
        const spikes = analysis.power_spikes;
        const phaseEmojis = {early: '🌅', mid: '⚔️', late: '🌙'};
        const phaseNames = {early: 'Early Game', mid: 'Mid Game', late: 'Late Game'};

        cards.push(`
            <div class="story-card">
                <h2>⚡ Power Spike Analysis</h2>
                <div class="stat-number">${phaseEmojis[spikes.best_phase]} ${phaseNames[spikes.best_phase]}</div>
                <p style="font-size: 1.3rem; margin-bottom: 20px;">Your Strongest Phase</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0;">
                    ${['early', 'mid', 'late'].map(phase => {
                        const isBest = phase === spikes.best_phase;
                        return `
                            <div style="background: ${isBest ? 'rgba(199, 155, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; padding: 15px; border-radius: 10px; border: ${isBest ? '2px solid #C79B3B' : 'none'};">
                                <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">${phaseEmojis[phase]} ${phaseNames[phase]}</p>
                                <p style="color: ${isBest ? '#C79B3B' : '#E4E1D8'}; font-size: 1.8rem; font-weight: bold; margin: 0;">${spikes.phase_stats[phase].kda.toFixed(2)}</p>
                                <p style="color: #A09B8C; font-size: 0.7rem; margin-top: 3px;">KDA</p>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="background: rgba(199, 155, 59, 0.1); border-radius: 10px; padding: 15px; border-left: 3px solid #C79B3B;">
                    <p style="color: #C79B3B; font-size: 1.1rem; margin: 0; font-weight: bold;">
                        💡 Strategy Tip
                    </p>
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                        ${spikes.best_phase === 'early' ?
                            'You excel in early game! Pick aggressive champions and snowball your lead.' :
                            spikes.best_phase === 'mid' ?
                            'Mid game is your sweet spot! Focus on team fights and objective control.' :
                            'You shine in late game! Play safe early and scale into a monster.'}
                    </p>
                </div>
            </div>
        `);
    }

    // Card 23: Objective Priority
    if (analysis.objective_priority) {
        const obj = analysis.objective_priority;
        const impactColor = obj.objective_impact > 10 ? '#3BC77B' : obj.objective_impact > 0 ? '#C79B3B' : '#C73B3B';

        cards.push(`
            <div class="story-card">
                <h2>🐉 Objective Mastery</h2>
                <div class="stat-number" style="color: ${impactColor};">+${Math.abs(obj.objective_impact)}%</div>
                <p style="font-size: 1.3rem; margin-bottom: 20px;">Win Rate Impact</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; text-align: center;">
                        <p style="color: #9966FF; font-size: 3rem; margin: 0;">🐉</p>
                        <p style="color: #E4E1D8; font-size: 1.8rem; font-weight: bold; margin: 10px 0;">${obj.avg_dragons_per_game}</p>
                        <p style="color: #A09B8C; font-size: 0.9rem;">Dragons/Game</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; text-align: center;">
                        <p style="color: #7B68EE; font-size: 3rem; margin: 0;">👑</p>
                        <p style="color: #E4E1D8; font-size: 1.8rem; font-weight: bold; margin: 10px 0;">${obj.avg_barons_per_game}</p>
                        <p style="color: #A09B8C; font-size: 0.9rem;">Barons/Game</p>
                    </div>
                </div>

                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <p style="color: #A09B8C; font-size: 0.9rem; margin: 0;">With 2+ Objectives:</p>
                        <p style="color: #3BC77B; font-size: 1.5rem; font-weight: bold; margin: 0;">${obj.high_obj_winrate}%</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <p style="color: #A09B8C; font-size: 0.9rem; margin: 0;">Overall Win Rate:</p>
                        <p style="color: #E4E1D8; font-size: 1.5rem; font-weight: bold; margin: 0;">${obj.overall_winrate}%</p>
                    </div>
                </div>

                <div style="background: ${obj.is_objective_focused ? 'rgba(59, 199, 123, 0.1)' : 'rgba(199, 155, 59, 0.1)'}; border-radius: 10px; padding: 15px; border-left: 3px solid ${impactColor};">
                    <p style="color: ${impactColor}; font-size: 1.1rem; margin: 0; font-weight: bold;">
                        ${obj.is_objective_focused ? '🎯 Macro God!' : '💡 Focus More on Objectives'}
                    </p>
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                        ${obj.is_objective_focused ?
                            'Objectives significantly boost your win rate - keep prioritizing them!' :
                            'Try focusing more on dragons and barons to increase your win rate!'}
                    </p>
                </div>
            </div>
        `);
    }

    // Card 24: Tilt Factor (Mental Fortitude)
    if (analysis.tilt_factor) {
        const tilt = analysis.tilt_factor;
        const fortitudeColors = {
            'Unshakeable': '#3BC77B',
            'Strong': '#4CAF50',
            'Average': '#C79B3B',
            'Needs Work': '#C73B3B'
        };
        const fortitudeColor = fortitudeColors[tilt.mental_fortitude] || '#C79B3B';

        cards.push(`
            <div class="story-card">
                <h2>🧠 Mental Fortitude</h2>
                <div class="stat-number" style="color: ${fortitudeColor};">${tilt.tilt_score}</div>
                <p style="font-size: 1.3rem; margin-bottom: 10px;">Tilt Resistance Score</p>
                <p style="color: ${fortitudeColor}; font-size: 1.5rem; font-weight: bold; margin-bottom: 20px;">${tilt.mental_fortitude}</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">After Wins</p>
                        <p style="color: #3BC77B; font-size: 1.8rem; font-weight: bold; margin: 0;">${tilt.after_win_kda}</p>
                        <p style="color: #A09B8C; font-size: 0.7rem; margin-top: 3px;">Avg KDA</p>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px;">
                        <p style="color: #A09B8C; font-size: 0.8rem; margin-bottom: 5px;">After Losses</p>
                        <p style="color: ${tilt.kda_drop_after_loss > 1 ? '#C73B3B' : '#C79B3B'}; font-size: 1.8rem; font-weight: bold; margin: 0;">${tilt.after_loss_kda}</p>
                        <p style="color: #A09B8C; font-size: 0.7rem; margin-top: 3px;">Avg KDA</p>
                    </div>
                </div>

                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <p style="color: #A09B8C; font-size: 0.9rem;">Longest Loss Streak:</p>
                        <p style="color: #E4E1D8; font-size: 1.2rem; font-weight: bold;">${tilt.max_loss_streak} games</p>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <p style="color: #A09B8C; font-size: 0.9rem;">Win Rate After Loss:</p>
                        <p style="color: ${tilt.after_loss_winrate >= 45 ? '#3BC77B' : '#C73B3B'}; font-size: 1.2rem; font-weight: bold;">${tilt.after_loss_winrate}%</p>
                    </div>
                </div>

                <div style="background: ${tilt.tilt_score > 60 ? 'rgba(59, 199, 123, 0.1)' : 'rgba(199, 155, 59, 0.1)'}; border-radius: 10px; padding: 15px; border-left: 3px solid ${fortitudeColor};">
                    <p style="color: ${fortitudeColor}; font-size: 1.1rem; margin: 0; font-weight: bold;">
                        ${tilt.mental_fortitude === 'Unshakeable' ? '🛡️ Iron Mental!' :
                          tilt.mental_fortitude === 'Strong' ? '💪 Solid Mindset' :
                          tilt.mental_fortitude === 'Average' ? '⚖️ Balanced' : '⚠️ Watch for Tilt'}
                    </p>
                    <p style="color: #A09B8C; font-size: 0.9rem; margin-top: 8px;">
                        ${tilt.kda_drop_after_loss > 1.5 ?
                            `Your KDA drops ${tilt.kda_drop_after_loss.toFixed(1)} points after losses. Take breaks to reset!` :
                            tilt.kda_drop_after_loss > 0.5 ?
                            'You maintain decent performance after losses - good mental!' :
                            'Amazing mental! You actually perform better after losses.'}
                    </p>
                </div>
            </div>
        `);
    }

    // Add all cards to container (prepend before roast/share sections)
    console.log('[BUILD CARDS] Total cards built:', cards.length);
    console.log('[BUILD CARDS] Inserting cards into DOM...');

    // Get existing special sections
    const championRecsSection = document.getElementById('championRecsSection');
    const roastSection = document.getElementById('roastSection');
    const shareSection = document.getElementById('shareSection');

    // Clear container and add cards
    container.innerHTML = cards.join('');

    // Re-append special sections at the end in order
    if (championRecsSection) {
        container.appendChild(championRecsSection);
    }
    if (roastSection) {
        container.appendChild(roastSection);
    }
    if (shareSection) {
        container.appendChild(shareSection);
    }

    console.log('[BUILD CARDS] ✅ All cards inserted into DOM!');
}

// Initialize scroll animations
function initScrollAnimations() {
    console.log('[ANIMATIONS] Initializing scroll animations...');
    const cards = document.querySelectorAll('.story-card');
    console.log('[ANIMATIONS] Found', cards.length, 'story cards to animate');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                console.log('[ANIMATIONS] Card became visible:', entry.target);
            }
        });
    }, { threshold: 0.2 });

    cards.forEach(card => observer.observe(card));

    // Update progress bar on scroll
    window.addEventListener('scroll', updateProgressBar);
    console.log('[ANIMATIONS] ✅ Scroll animations initialized!');
}

// Update progress bar
function updateProgressBar() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const progress = (scrollTop / (documentHeight - windowHeight)) * 100;

    document.getElementById('progressBar').style.width = progress + '%';
}

// Get roasted by AI
async function getRoasted() {
    console.log('[ROAST] Getting roasted by AI...');
    const summonerData = await getFromIndexedDB('summonerData');

    if (!summonerData) {
        console.error('[ROAST] No summoner data found');
        return;
    }

    document.getElementById('roastText').innerHTML = '<div class="spinner" style="width: 40px; height: 40px; border-width: 4px;"></div>';
    document.getElementById('roastText').style.display = 'block';

    console.log('[ROAST] Sending roast request to API...');

    $.ajax({
        url: '/api/roast-me',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            matches: summonerData.recentMatches,
            summonerName: summonerData.summoner.name,
            region: summonerData.region
        }),
        success: function(data) {
            console.log('[ROAST] ✅ Roast received:', data.roast);

            // Convert markdown to HTML using the formatMarkdown function
            const formattedRoast = formatMarkdown(data.roast);

            document.getElementById('roastText').innerHTML = formattedRoast;

            // Change button text to "Roast Again"
            const roastButton = document.querySelector('.roast-button');
            if (roastButton) {
                roastButton.textContent = 'Roast Again';
            }
        },
        error: function(xhr) {
            console.error('[ROAST] ❌ Failed to get roast:', xhr);
            document.getElementById('roastText').innerHTML = 'Even the AI could not come up with a roast for you... 🤷';
        }
    });
}

// Champion recommendations function
async function getChampionRecommendations() {
    const summonerData = await getFromIndexedDB('summonerData');
    if (!summonerData || !summonerData.recentMatches) {
        console.error('[CHAMPION RECS] No summoner data found');
        return;
    }

    const button = document.querySelector('#championRecsSection .roast-button');
    const contentDiv = document.getElementById('championRecsContent');

    // Show loading state
    button.disabled = true;
    button.textContent = 'Analyzing your playstyle...';

    $.ajax({
        url: '/api/recommend-champions',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            matches: summonerData.recentMatches,
            summonerName: summonerData.summoner.name,
            region: summonerData.region
        }),
        success: function(data) {
            console.log('[CHAMPION RECS] ✅ Recommendations received:', data.recommendations);

            if (data.recommendations && data.recommendations.length > 0) {
                let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px;">';

                data.recommendations.forEach((rec, index) => {
                    html += `
                        <div style="
                            background: linear-gradient(135deg, #1E2328 0%, #0A1428 100%);
                            border: 3px solid #C79B3B;
                            border-radius: 20px;
                            padding: 30px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px rgba(199, 155, 59, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                <img src="https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${rec.champion.replace(/[^a-zA-Z]/g, '')}.png"
                                     style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #C79B3B; margin-right: 20px;"
                                     onerror="this.src='https://via.placeholder.com/80?text=${rec.champion}'">
                                <div>
                                    <h3 style="color: #C79B3B; font-size: 2rem; margin: 0;">${rec.champion}</h3>
                                    <p style="color: #A09B8C; margin: 5px 0 0 0; font-size: 1.1rem;">${rec.role}</p>
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <h4 style="color: #D4AF37; font-size: 1.2rem; margin-bottom: 10px;">Why This Champion?</h4>
                                <p style="color: #E4E1D8; line-height: 1.6; font-size: 1rem;">${rec.reason}</p>
                            </div>

                            <div style="margin-bottom: 25px;">
                                <h4 style="color: #D4AF37; font-size: 1.2rem; margin-bottom: 10px;">Key Strength</h4>
                                <p style="color: #3BC77B; line-height: 1.6; font-size: 1rem; font-weight: bold;">${rec.strength}</p>
                            </div>

                            <a href="${rec.opgg_url}" target="_blank" style="
                                display: inline-block;
                                background: linear-gradient(135deg, #C79B3B 0%, #D4AF37 100%);
                                color: #0A1428;
                                padding: 12px 30px;
                                border-radius: 25px;
                                text-decoration: none;
                                font-weight: bold;
                                font-size: 1.1rem;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                📊 View Build on OP.GG
                            </a>
                        </div>
                    `;
                });

                html += '</div>';
                contentDiv.innerHTML = html;
                contentDiv.style.display = 'block';

                // Update button
                button.textContent = 'Get New Recommendations';
                button.disabled = false;
            } else {
                contentDiv.innerHTML = '<p style="color: #A09B8C; font-size: 1.2rem;">Could not generate recommendations. Try again!</p>';
                contentDiv.style.display = 'block';
                button.textContent = 'Try Again';
                button.disabled = false;
            }
        },
        error: function(xhr) {
            console.error('[CHAMPION RECS] ❌ Failed to get recommendations:', xhr);
            contentDiv.innerHTML = '<p style="color: #C73B3B; font-size: 1.2rem;">Failed to generate recommendations. Please try again!</p>';
            contentDiv.style.display = 'block';
            button.textContent = 'Try Again';
            button.disabled = false;
        }
    });
}

// Social sharing functions
async function shareToTwitter() {
    const summonerData = await getFromIndexedDB('summonerData');
    const summonerName = summonerData?.summoner?.name?.split('#')[0] || 'Unknown';
    const tagLine = summonerData?.summoner?.name?.split('#')[1] || '';
    const region = summonerData?.region || 'na1';

    // Calculate actual stats from matches
    const matches = summonerData?.recentMatches || [];
    const totalGames = reviewData?.total_matches || matches.length || 0;
    const wins = matches.filter(m => m.win).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

    // Get top champion from analysis or calculate it
    let topChamp = 'various champions';
    if (reviewData?.analysis?.champion_diversity?.top_3_champions?.[0]) {
        topChamp = reviewData.analysis.champion_diversity.top_3_champions[0].name;
    } else if (matches.length > 0) {
        // Calculate from matches
        const championCounts = {};
        matches.forEach(m => {
            const champ = m.championName;
            championCounts[champ] = (championCounts[champ] || 0) + 1;
        });
        const sortedChamps = Object.entries(championCounts).sort((a, b) => b[1] - a[1]);
        if (sortedChamps.length > 0) {
            topChamp = sortedChamps[0][0];
        }
    }

    // Create engaging message with stats
    const text = `Just checked out my League of Legends 2025 Year in Review on Riftwind! 🎮\n\n${totalGames} games played • ${winRate}% win rate • Main: ${topChamp}\n\nSee your own stats:`;

    // Build URL with user parameters
    const shareUrl = `${window.location.origin}/year-in-review?summoner=${encodeURIComponent(summonerName)}&tag=${encodeURIComponent(tagLine)}&region=${encodeURIComponent(region)}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

async function shareToFacebook() {
    const summonerData = await getFromIndexedDB('summonerData');
    const summonerName = summonerData?.summoner?.name?.split('#')[0] || 'Unknown';
    const tagLine = summonerData?.summoner?.name?.split('#')[1] || '';
    const region = summonerData?.region || 'na1';

    // Calculate actual stats from matches
    const matches = summonerData?.recentMatches || [];
    const totalGames = reviewData?.total_matches || matches.length || 0;
    const wins = matches.filter(m => m.win).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

    // Get top champion from analysis or calculate it
    let topChamp = 'various champions';
    if (reviewData?.analysis?.champion_diversity?.top_3_champions?.[0]) {
        topChamp = reviewData.analysis.champion_diversity.top_3_champions[0].name;
    } else if (matches.length > 0) {
        // Calculate from matches
        const championCounts = {};
        matches.forEach(m => {
            const champ = m.championName;
            championCounts[champ] = (championCounts[champ] || 0) + 1;
        });
        const sortedChamps = Object.entries(championCounts).sort((a, b) => b[1] - a[1]);
        if (sortedChamps.length > 0) {
            topChamp = sortedChamps[0][0];
        }
    }

    // Build URL with user parameters and stats as hash parameters (will show in preview)
    const shareUrl = `${window.location.origin}/year-in-review?summoner=${encodeURIComponent(summonerName)}&tag=${encodeURIComponent(tagLine)}&region=${encodeURIComponent(region)}`;

    // Facebook Feed Dialog allows for more customization
    const text = `Just checked out my League of Legends 2025 Year in Review on Riftwind! ${totalGames} games played • ${winRate}% win rate • Main: ${topChamp}`;
    const facebookUrl = `https://www.facebook.com/dialog/feed?app_id=YOUR_APP_ID&link=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}&display=popup&redirect_uri=${encodeURIComponent(shareUrl)}`;

    // Fallback to simple sharer (doesn't support quote but is more reliable)
    const simpleFacebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    window.open(simpleFacebookUrl, '_blank', 'width=600,height=400');
}

async function shareToBluesky() {
    const summonerData = await getFromIndexedDB('summonerData');
    const summonerName = summonerData?.summoner?.name?.split('#')[0] || 'Unknown';
    const tagLine = summonerData?.summoner?.name?.split('#')[1] || '';
    const region = summonerData?.region || 'na1';

    // Calculate actual stats from matches
    const matches = summonerData?.recentMatches || [];
    const totalGames = reviewData?.total_matches || matches.length || 0;
    const wins = matches.filter(m => m.win).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

    // Get top champion from analysis or calculate it
    let topChamp = 'various champions';
    if (reviewData?.analysis?.champion_diversity?.top_3_champions?.[0]) {
        topChamp = reviewData.analysis.champion_diversity.top_3_champions[0].name;
    } else if (matches.length > 0) {
        // Calculate from matches
        const championCounts = {};
        matches.forEach(m => {
            const champ = m.championName;
            championCounts[champ] = (championCounts[champ] || 0) + 1;
        });
        const sortedChamps = Object.entries(championCounts).sort((a, b) => b[1] - a[1]);
        if (sortedChamps.length > 0) {
            topChamp = sortedChamps[0][0];
        }
    }

    // Create engaging message with stats
    const text = `Just checked out my League of Legends 2025 Year in Review on Riftwind! 🎮\n\n${totalGames} games played • ${winRate}% win rate • Main: ${topChamp}\n\nSee your own stats:`;

    // Build URL with user parameters
    const shareUrl = `${window.location.origin}/year-in-review?summoner=${encodeURIComponent(summonerName)}&tag=${encodeURIComponent(tagLine)}&region=${encodeURIComponent(region)}`;

    const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(text + '\n' + shareUrl)}`;
    window.open(blueskyUrl, '_blank', 'width=600,height=400');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[INIT] Page loaded, initializing year-in-review...');
    console.log('[INIT] Current path:', window.location.pathname);

    createParticles();
    console.log('[INIT] Particles created');

    // Check if we have summoner data
    try {
        const summonerData = await getFromIndexedDB('summonerData');
        if (!summonerData && window.location.pathname !== '/') {
            console.warn('[INIT] No summoner data found, redirecting to home...');
            // Redirect to home if no data
            window.location.href = '/';
        } else {
            console.log('[INIT] ✅ Initialization complete. Ready to start review!');
        }
    } catch (error) {
        console.error('[INIT] Error checking for summoner data:', error);
    }

    // Add click handler to start button
    const startButton = document.getElementById('startButton');
    if (startButton) {
        console.log('[INIT] Attaching click handler to start button...');
        console.log('[INIT] Button element:', startButton);
        console.log('[INIT] Button visible?', startButton.offsetParent !== null);

        startButton.addEventListener('click', function(e) {
            console.log('[BUTTON] ===== START BUTTON CLICKED! =====');
            console.log('[BUTTON] Event:', e);
            try {
                startReview();
            } catch (error) {
                console.error('[BUTTON] Error calling startReview:', error);
            }
        });
        console.log('[INIT] ✅ Start button handler attached!');

        // Test if button is clickable
        console.log('[INIT] Testing button click manually in 2 seconds...');
        setTimeout(() => {
            console.log('[TEST] Simulating button click...');
            startButton.click();
        }, 2000);
    } else {
        console.error('[INIT] ❌ Start button not found!');
    }
});
