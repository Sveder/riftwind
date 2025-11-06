$(document).ready(function() {
    // Get latest Data Dragon version for champion images
    let ddragonVersion = '';

    $.get('https://ddragon.leagueoflegends.com/api/versions.json', function(versions) {
        ddragonVersion = versions[0];
    });

    // Handle form submission
    $('#summonerForm').on('submit', function(e) {
        e.preventDefault();

        const gameName = $('#gameName').val().trim();
        const tagLine = $('#tagLine').val().trim();
        const region = $('#region').val();

        if (!gameName || !tagLine) {
            showError('Please enter both Game Name and Tag Line');
            return;
        }

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
            }
        });
    });

    function displayResults(data) {
        // Save data to localStorage for year-in-review
        const region = $('#region').val();
        data.region = region;
        localStorage.setItem('summonerData', JSON.stringify(data));

        // Hide loading
        $('.loading').hide();

        // Show results section
        $('.result-section').show();

        // Display summoner info
        $('#summonerName').text(data.summoner.name);
        $('#summonerLevel').text(data.summoner.level);
        $('#levelDisplay').text(data.summoner.level);

        // Set profile icon
        const profileIconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${data.summoner.profileIconId}.png`;
        $('#profileIcon').attr('src', profileIconUrl);

        // Display total games
        $('#totalGames').text(data.totalGames);

        // Display most played champion
        if (data.mostPlayedChampion && data.mostPlayedChampion.championName) {
            const championIconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${data.mostPlayedChampion.championName}.png`;
            $('#championIcon').attr('src', championIconUrl);
            $('#championName').text(data.mostPlayedChampion.championName);
            $('#championLevel').text(data.mostPlayedChampion.championLevel);
            $('#championPoints').text(data.mostPlayedChampion.championPoints.toLocaleString());
        } else {
            $('#championName').text('No champion data available');
            $('#championLevel').text('0');
            $('#championPoints').text('0');
        }

        // Display top 5 champions
        displayTopChampions(data.topChampions);

        // Display recent matches
        displayRecentMatches(data.recentMatches);
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
        $('.error-message').text(message).show();
        $('.result-section').show();
    }
});

// Quick fill function for famous streamers
function quickFill(gameName, tagLine, region) {
    $('#gameName').val(gameName);
    $('#tagLine').val(tagLine);
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

                // Close modal after 2 seconds
                setTimeout(function() {
                    $('#feedbackModal').modal('hide');
                    $('#feedbackSuccess').hide();
                }, 2000);
            },
            error: function(xhr) {
                $('#feedbackError').show();
                submitBtn.prop('disabled', false).text('Send Feedback');
            }
        });
    });
});
