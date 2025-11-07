let reviewData = null;
let currentCard = 0;

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
function startReview() {
    console.log('[YEAR IN REVIEW] Starting review experience...');

    // Get summoner data from previous page (passed via URL params or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const summonerData = localStorage.getItem('summonerData');

    if (!summonerData) {
        console.error('[YEAR IN REVIEW] No summoner data found!');
        alert('Please search for a summoner first!');
        window.location.href = '/';
        return;
    }

    const data = JSON.parse(summonerData);
    console.log('[YEAR IN REVIEW] Summoner data loaded:', data.summoner.name);
    console.log('[YEAR IN REVIEW] Total matches to analyze:', data.recentMatches.length);

    // Hide intro, show loading
    document.getElementById('introSection').style.display = 'none';
    document.getElementById('loadingOverlay').style.display = 'flex';

    console.log('[YEAR IN REVIEW] First, getting preview stats...');

    // First, show preview stats
    showPreviewStats(data);
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
    console.log('[YEAR IN REVIEW] Sending API request...');

    $.ajax({
        url: '/api/year-in-review',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            matches: summonerData.recentMatches,
            summonerName: summonerData.summoner.name,
            region: summonerData.region
        }),
        success: function(data) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[YEAR IN REVIEW] ✅ API response received in ${elapsed}s`);

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

            // Show roast section
            document.getElementById('roastSection').style.display = 'flex';

            // Show share section
            document.getElementById('shareSection').style.display = 'flex';

            // Initialize scroll animations
            console.log('[YEAR IN REVIEW] Initializing scroll animations...');
            initScrollAnimations();
            console.log('[YEAR IN REVIEW] ✨ Year in review complete!');
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

// Build all story cards
function buildStoryCards(summonerData, reviewData) {
    console.log('[BUILD CARDS] Starting to build story cards...');
    const container = document.getElementById('storyCards');
    const analysis = reviewData.analysis;

    const cards = [];
    console.log('[BUILD CARDS] Analysis data available:', Object.keys(analysis));

    // Card 1: Welcome & Total Games
    cards.push(`
        <div class="story-card">
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

    // Add all cards to container (prepend before roast/share sections)
    console.log('[BUILD CARDS] Total cards built:', cards.length);
    console.log('[BUILD CARDS] Inserting cards into DOM...');

    // Get existing roast and share sections
    const roastSection = document.getElementById('roastSection');
    const shareSection = document.getElementById('shareSection');

    // Clear container and add cards
    container.innerHTML = cards.join('');

    // Re-append roast and share sections at the end
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
function getRoasted() {
    console.log('[ROAST] Getting roasted by AI...');
    const summonerData = JSON.parse(localStorage.getItem('summonerData'));

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

            // Convert markdown to HTML
            let formattedRoast = data.roast
                // Bold
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                // Italic
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                // Line breaks
                .replace(/\n/g, '<br>')
                // Bullet points
                .replace(/^- (.+)$/gm, '<li>$1</li>')
                // Wrap lists
                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

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

// Social sharing functions
function shareToTwitter() {
    const summonerData = JSON.parse(localStorage.getItem('summonerData'));
    const summonerName = summonerData?.summoner?.name || 'My';
    const text = `Check out ${summonerName} League of Legends 2025 Year in Review! 🎮✨`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

function shareToFacebook() {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
}

function shareToBluesky() {
    const summonerData = JSON.parse(localStorage.getItem('summonerData'));
    const summonerName = summonerData?.summoner?.name || 'My';
    const text = `Check out ${summonerName} League of Legends 2025 Year in Review! 🎮✨`;
    const url = window.location.href;
    const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(text + '\n' + url)}`;
    window.open(blueskyUrl, '_blank', 'width=600,height=400');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('[INIT] Page loaded, initializing year-in-review...');
    console.log('[INIT] Current path:', window.location.pathname);

    createParticles();
    console.log('[INIT] Particles created');

    // Check if we have summoner data
    const summonerData = localStorage.getItem('summonerData');
    if (!summonerData && window.location.pathname !== '/') {
        console.warn('[INIT] No summoner data found, redirecting to home...');
        // Redirect to home if no data
        window.location.href = '/';
    } else {
        console.log('[INIT] ✅ Initialization complete. Ready to start review!');
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
