$(document).ready(function() {
    // Get latest Data Dragon version for champion images
    let ddragonVersion = '';

    $.get('https://ddragon.leagueoflegends.com/api/versions.json', function(versions) {
        ddragonVersion = versions[0];
    });

    // Initialize IndexedDB
    let db;
    const dbName = 'RiftwindDB';
    const storeName = 'summonerData';

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
        });
    }

    function saveToIndexedDB(key, data) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ id: key, data: data, timestamp: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    function getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = () => reject(request.error);
        });
    }

    // Initialize DB on page load
    initDB().catch(err => console.error('Failed to initialize IndexedDB:', err));

    // Auto-detect region from tag input
    $('#riotId').on('input', function() {
        const riotId = $(this).val().trim();
        const parts = riotId.split('#');

        if (parts.length === 2) {
            const tag = parts[1].trim().toUpperCase();

            // Map common tag patterns to regions
            const regionMap = {
                'NA': 'na1',
                'NA1': 'na1',
                'EUW': 'euw1',
                'EUW1': 'euw1',
                'EUNE': 'eun1',
                'EUNE1': 'eun1',
                'KR': 'kr',
                'BR': 'br1',
                'BR1': 'br1',
                'LAN': 'la1',
                'LA1': 'la1',
                'LAS': 'la2',
                'LA2': 'la2',
                'OCE': 'oc1',
                'OC1': 'oc1',
                'TR': 'tr1',
                'TR1': 'tr1',
                'RU': 'ru',
                'JP': 'jp1',
                'JP1': 'jp1',
                'PH': 'ph2',
                'PH2': 'ph2',
                'SG': 'sg2',
                'SG2': 'sg2',
                'TH': 'th2',
                'TH2': 'th2',
                'TW': 'tw2',
                'TW2': 'tw2',
                'VN': 'vn2',
                'VN2': 'vn2'
            };

            // Check if tag matches a region
            if (regionMap[tag]) {
                $('#region').val(regionMap[tag]);
                console.log('[AUTO-DETECT] Region set to:', regionMap[tag], 'based on tag:', tag);
            }
        }
    });

    // Handle form submission
    $('#summonerForm').on('submit', function(e) {
        e.preventDefault();

        const riotId = $('#riotId').val().trim();
        const region = $('#region').val();

        if (!riotId) {
            showError('Please enter your Riot ID');
            return;
        }

        // Split on # to get gameName and tagLine
        const parts = riotId.split('#');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            showError('Please enter your Riot ID in the format: nickname#Tag (e.g., Jankos#EUW)');
            return;
        }

        const gameName = parts[0].trim();
        const tagLine = parts[1].trim();

        // Disable submit button to prevent double submission
        const submitBtn = $('#summonerForm button[type="submit"]');
        submitBtn.prop('disabled', true).css({
            'opacity': '0.5',
            'cursor': 'not-allowed'
        });

        // Show loading, hide results
        $('.loading').show();
        $('.result-section').hide();
        $('.error-message').hide();

        // Make API request to our Flask backend
        $.ajax({
            url: '/api/summoner',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                gameName: gameName,
                tagLine: tagLine,
                region: region
            }),
            success: function(data) {
                displayResults(data);
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'An error occurred';
                showError(errorMsg);
                $('.loading').hide();

                // Re-enable submit button on error
                const submitBtn = $('#summonerForm button[type="submit"]');
                submitBtn.prop('disabled', false).css({
                    'opacity': '1',
                    'cursor': 'pointer'
                });
            }
        });
    });

    async function displayResults(data) {
        // Save data to IndexedDB for year-in-review
        const region = $('#region').val();
        data.region = region;

        try {
            // Save all data including timelines to IndexedDB
            await saveToIndexedDB('summonerData', data);
            console.log('Saved all summoner data to IndexedDB');
        } catch (e) {
            console.error('Failed to save to IndexedDB:', e);
            // Fallback: try without timelines
            try {
                const dataWithoutTimelines = {...data};
                delete dataWithoutTimelines.matchTimelines;
                await saveToIndexedDB('summonerData', dataWithoutTimelines);
                console.log('Saved summoner data without timelines to IndexedDB');
            } catch (fallbackError) {
                console.error('Failed to save even without timelines:', fallbackError);
            }
        }

        // Redirect directly to year-in-review page
        const summonerName = data.summoner.name;
        const urlParams = `?summoner=${encodeURIComponent(summonerName)}&region=${region}`;
        window.location.href = `/year-in-review${urlParams}`;
    }

    function displayTopChampions(champions) {
        const $topChampions = $('#topChampions');
        $topChampions.empty();

        if (!champions || champions.length === 0) {
            $topChampions.append('<p class="text-muted">No champion mastery data available</p>');
            return;
        }

        // Fetch all champion names
        $.get(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`, function(championData) {
            const championMap = {};

            // Create a map of championId to championName
            for (let champName in championData.data) {
                const champ = championData.data[champName];
                championMap[champ.key] = champName;
            }

            // Display each champion
            champions.forEach(function(champion, index) {
                const championName = championMap[champion.championId.toString()] || `Champion ${champion.championId}`;
                const championIconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championName}.png`;

                const championItem = `
                    <div class="list-group-item">
                        <div class="row align-items-center">
                            <div class="col-auto">
                                <img src="${championIconUrl}" alt="${championName}" style="width: 50px; height: 50px; border-radius: 50%;">
                            </div>
                            <div class="col">
                                <h6 class="mb-1">${index + 1}. ${championName}</h6>
                                <small>Level ${champion.championLevel} - ${champion.championPoints.toLocaleString()} points</small>
                            </div>
                        </div>
                    </div>
                `;

                $topChampions.append(championItem);
            });
        });
    }

    function displayRecentMatches(matches) {
        const $recentMatches = $('#recentMatches');
        $recentMatches.empty();

        if (!matches || matches.length === 0) {
            $recentMatches.append('<p class="text-muted">No recent match data available</p>');
            return;
        }

        matches.forEach(function(match, index) {
            // Format game duration (seconds to minutes:seconds)
            const minutes = Math.floor(match.gameDuration / 60);
            const seconds = match.gameDuration % 60;
            const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Format timestamp
            const date = new Date(match.gameCreation);
            const timeAgo = getTimeAgo(date);

            // Determine win/loss styling
            const resultClass = match.win ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger';
            const resultText = match.win ? 'VICTORY' : 'DEFEAT';
            const resultBadgeClass = match.win ? 'bg-success' : 'bg-danger';

            // KDA calculation
            const kda = match.deaths > 0 ? ((match.kills + match.assists) / match.deaths).toFixed(2) : 'Perfect';

            const championIconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${match.championName}.png`;

            const matchItem = `
                <div class="match-card ${resultClass} p-3 mb-2 border rounded">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <img src="${championIconUrl}" alt="${match.championName}" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #C79B3B;">
                        </div>
                        <div class="col">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1" style="color: #D4AF37;">${match.championName}</h6>
                                    <span class="badge ${resultBadgeClass} mb-1">${resultText}</span>
                                    <p class="mb-0 small text-muted">${match.gameMode} • ${duration} • ${timeAgo}</p>
                                </div>
                                <div class="text-end">
                                    <p class="mb-0"><strong style="color: #C79B3B;">${match.kills}/${match.deaths}/${match.assists}</strong></p>
                                    <p class="mb-0 small text-muted">KDA: ${kda}</p>
                                    <p class="mb-0 small text-muted">${match.totalDamageDealt.toLocaleString()} dmg</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $recentMatches.append(matchItem);
        });
    }

    function getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }

    function showError(message) {
        const errorHtml = `
            <strong>Error:</strong> ${message}
            <hr style="margin: 15px 0; border-color: #C79B3B;">
            <div style="margin-top: 10px;">
                <a href="mailto:m@sveder.com" style="color: #D4AF37; text-decoration: underline;">Contact us for support</a>
                <span style="margin: 0 10px; color: #786641;">|</span>
                <a href="/" style="color: #D4AF37; text-decoration: underline;">Back to form</a>
            </div>
        `;
        $('.error-message').html(errorHtml).show();
        $('.result-section').show();
    }
});

// Quick fill function for famous streamers
function quickFill(gameName, tagLine, region) {
    $('#riotId').val(gameName + '#' + tagLine);
    $('#region').val(region);
    $('#summonerForm').submit();
}

// Feedback form submission
$(document).ready(function() {
    $('#feedbackForm').on('submit', function(e) {
        e.preventDefault();

        const email = $('#feedbackEmail').val().trim();
        const feedback = $('#feedbackText').val().trim();

        if (!feedback) {
            return;
        }

        // Hide previous messages
        $('#feedbackSuccess').hide();
        $('#feedbackError').hide();

        // Disable submit button
        const submitBtn = $(this).find('button[type="submit"]');
        submitBtn.prop('disabled', true).text('Sending...');

        // Send feedback to API
        $.ajax({
            url: '/api/feedback',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email: email || 'anonymous',
                feedback: feedback
            }),
            success: function(response) {
                $('#feedbackSuccess').show();
                $('#feedbackText').val('');
                $('#feedbackEmail').val('');
                submitBtn.prop('disabled', false).text('Send Feedback');

                // Close modal after 4 seconds
                setTimeout(function() {
                    $('#feedbackModal').modal('hide');
                    $('#feedbackSuccess').hide();
                }, 4000);
            },
            error: function(xhr) {
                $('#feedbackError').show();
                submitBtn.prop('disabled', false).text('Send Feedback');
            }
        });
    });
});
