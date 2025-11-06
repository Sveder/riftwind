from flask import Flask, render_template, request, jsonify
import requests
import os
import json
from datetime import datetime
from analysis_engine import YearInReviewAnalyzer
from flask_caching import Cache
from functools import lru_cache
import time
import hashlib

app = Flask(__name__)

# Configure caching
cache_config = {
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes
}
app.config.from_mapping(cache_config)
cache = Cache(app)

print("[CACHE] Flask caching initialized")

# Filesystem cache configuration
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'api_cache')
CACHE_DURATION = 3600  # 1 hour cache

# Create cache directory if it doesn't exist
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)
    print(f"[CACHE] Created cache directory: {CACHE_DIR}")

def get_cache_key(url, params=None):
    """Generate cache key from URL and params"""
    cache_string = url
    if params:
        cache_string += json.dumps(params, sort_keys=True)
    return hashlib.md5(cache_string.encode()).hexdigest()

def get_from_cache(cache_key):
    """Get data from filesystem cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(cache_file):
        # Check if cache is still valid
        file_age = time.time() - os.path.getmtime(cache_file)
        if file_age < CACHE_DURATION:
            with open(cache_file, 'r') as f:
                print(f"[CACHE] Cache HIT for {cache_key}")
                return json.load(f)
        else:
            print(f"[CACHE] Cache EXPIRED for {cache_key}")
    return None

def save_to_cache(cache_key, data):
    """Save data to filesystem cache"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    with open(cache_file, 'w') as f:
        json.dump(data, f)
    print(f"[CACHE] Saved to cache: {cache_key}")

def cached_request(url, headers):
    """Make a cached HTTP request"""
    cache_key = get_cache_key(url, headers)

    # Try to get from cache first
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data

    # If not in cache, make request
    print(f"[CACHE] Cache MISS - fetching from network: {url[:80]}...")
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        save_to_cache(cache_key, data)
        return data

    return None

# Create a cached requests session
@lru_cache(maxsize=128)
def cached_get(url, headers_tuple):
    """Cached GET request - converts tuple back to dict"""
    headers = dict(headers_tuple)
    print(f"[CACHE] Fetching from network: {url[:80]}...")
    return requests.get(url, headers=headers)

# You need to get your API key from https://developer.riotgames.com/
RIOT_API_KEY = os.environ.get('RIOT_API_KEY', 'YOUR_API_KEY_HERE')
RIOT_API_KEY = "RGAPI-95765231-7c4f-4f44-a579-cfa99cb036cf"

# Regional routing values
REGION_ROUTING = {
    'na1': 'americas',
    'br1': 'americas',
    'la1': 'americas',
    'la2': 'americas',
    'euw1': 'europe',
    'eun1': 'europe',
    'tr1': 'europe',
    'ru': 'europe',
    'kr': 'asia',
    'jp1': 'asia',
    'oc1': 'sea',
    'ph2': 'sea',
    'sg2': 'sea',
    'th2': 'sea',
    'tw2': 'sea',
    'vn2': 'sea'
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/year-in-review')
def year_in_review():
    return render_template('year_in_review.html')

@app.route('/api/summoner', methods=['POST'])
@cache.cached(timeout=300, key_prefix=lambda: f"summoner_{request.json.get('gameName')}_{request.json.get('tagLine')}_{request.json.get('region')}")
def get_summoner_data():
    print(f"[CACHE] Cache miss - fetching summoner data")
    try:
        data = request.json
        game_name = data.get('gameName')
        tag_line = data.get('tagLine')
        region = data.get('region', 'na1').lower()

        if not game_name or not tag_line:
            return jsonify({'error': 'Game name and tag line are required'}), 400

        # Get regional routing
        routing_value = REGION_ROUTING.get(region, 'americas')

        # Step 1: Get PUUID from Riot ID
        account_url = f'https://{routing_value}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}'
        headers = {'X-Riot-Token': RIOT_API_KEY}

        print(f"[ACCOUNT API] URL: {account_url}")
        print(f"[ACCOUNT API] Headers: {headers}")

        account_response = requests.get(account_url, headers=headers)
        print(f"[ACCOUNT API] Status Code: {account_response.status_code}")
        print(f"[ACCOUNT API] Response: {account_response.text}")

        if account_response.status_code != 200:
            return jsonify({'error': f'Failed to find summoner: {account_response.status_code} - {account_response.text}'}), 400

        account_data = account_response.json()
        puuid = account_data['puuid']
        print(f"[ACCOUNT API] PUUID: {puuid}")

        # Step 2: Get summoner info
        summoner_url = f'https://{region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}'
        print(f"[SUMMONER API] URL: {summoner_url}")

        summoner_response = requests.get(summoner_url, headers=headers)
        print(f"[SUMMONER API] Status Code: {summoner_response.status_code}")
        print(f"[SUMMONER API] Response: {summoner_response.text}")

        if summoner_response.status_code != 200:
            return jsonify({'error': f'Failed to get summoner info: {summoner_response.status_code} - {summoner_response.text}'}), 400

        summoner_data = summoner_response.json()

        # Step 3: Get champion mastery
        mastery_url = f'https://{region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}'
        print(f"[MASTERY API] URL: {mastery_url}")

        mastery_response = requests.get(mastery_url, headers=headers)
        print(f"[MASTERY API] Status Code: {mastery_response.status_code}")
        print(f"[MASTERY API] Response: {mastery_response.text[:500]}")  # First 500 chars

        mastery_data = []
        if mastery_response.status_code == 200:
            mastery_data = mastery_response.json()
        else:
            print(f"[MASTERY API] Failed with status {mastery_response.status_code}")

        # Step 4: Get match history IDs with 2025 filter
        # Calculate 2025 timestamp range (Jan 1, 2025 00:00:00 UTC to Dec 31, 2025 23:59:59 UTC)
        start_2025 = int(datetime(2025, 1, 1).timestamp())
        end_2025 = int(datetime(2025, 12, 31, 23, 59, 59).timestamp())

        match_url = f'https://{routing_value}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?startTime={start_2025}&endTime={end_2025}&start=0&count=100'
        print(f"[MATCH API] URL: {match_url}")
        print(f"[MATCH API] Filtering for 2025: {start_2025} to {end_2025}")

        # Try cache first
        match_ids_data = cached_request(match_url, headers)
        if match_ids_data is None:
            match_response = requests.get(match_url, headers=headers)
            print(f"[MATCH API] Status Code: {match_response.status_code}")

            if match_response.status_code == 200:
                match_ids_data = match_response.json()
            else:
                print(f"[MATCH API] Failed with status {match_response.status_code}")
                match_ids_data = []

        match_ids = match_ids_data if isinstance(match_ids_data, list) else []
        total_games = len(match_ids)
        print(f"[MATCH API] Retrieved {total_games} match IDs from 2025")

        # Step 5: Get detailed match data - fetch 50 for comprehensive analysis
        match_details = []
        matches_to_fetch = match_ids[:50]
        print(f"[MATCH DETAILS] Fetching details for {len(matches_to_fetch)} matches")

        for i, match_id in enumerate(matches_to_fetch):
            match_detail_url = f'https://{routing_value}.api.riotgames.com/lol/match/v5/matches/{match_id}'
            print(f"[MATCH DETAILS] Fetching match {i+1}/{len(matches_to_fetch)}: {match_id}")

            # Try cache first
            match_data = cached_request(match_detail_url, headers)
            if match_data is None:
                detail_response = requests.get(match_detail_url, headers=headers)
                if detail_response.status_code == 200:
                    match_data = detail_response.json()
                    print(f"[MATCH DETAILS] Successfully fetched match {match_id}")
                else:
                    print(f"[MATCH DETAILS] Failed to fetch match {match_id}: {detail_response.status_code}")
                    continue

            if match_data:
                match_details.append(match_data)

        print(f"[MATCH DETAILS] Total matches fetched: {len(match_details)}")

        # Step 6: Get timeline for the first (most recent) match
        first_match_timeline = None
        if match_ids:
            first_match_id = match_ids[0]
            timeline_url = f'https://{routing_value}.api.riotgames.com/lol/match/v5/matches/{first_match_id}/timeline'
            print(f"[TIMELINE] Fetching timeline for first match: {first_match_id}")
            print(f"[TIMELINE] URL: {timeline_url}")

            timeline_response = requests.get(timeline_url, headers=headers)
            print(f"[TIMELINE] Status Code: {timeline_response.status_code}")

            if timeline_response.status_code == 200:
                first_match_timeline = timeline_response.json()
                print(f"[TIMELINE] Successfully fetched timeline")

                # Count death positions in timeline
                death_count = 0
                if first_match_timeline and 'info' in first_match_timeline:
                    for frame in first_match_timeline['info'].get('frames', []):
                        for event in frame.get('events', []):
                            if event.get('type') == 'CHAMPION_KILL' and 'position' in event:
                                death_count += 1
                print(f"[TIMELINE] Found {death_count} champion kills with position data")
            else:
                print(f"[TIMELINE] Failed to fetch timeline: {timeline_response.status_code}")

        # Get champion data
        champion_data = get_champion_name(mastery_data[0]['championId']) if mastery_data else None

        # Save all JSON responses to logs folder
        save_api_logs(game_name, tag_line, region, {
            'account_data': account_data,
            'summoner_data': summoner_data,
            'mastery_data': mastery_data,
            'match_ids': match_ids,
            'match_details': match_details,
            'first_match_timeline': first_match_timeline
        })

        # Process match details to extract COMPREHENSIVE data for year-in-review
        processed_matches = []
        for match in match_details:
            # Find the player's participant data
            participant = None
            player_team_id = None
            for p in match['info']['participants']:
                if p['puuid'] == puuid:
                    participant = p
                    player_team_id = p['teamId']
                    break

            if participant:
                # Get all opponents and teammates for rivalry/duo detection
                opponents = []
                teammates = []
                for p in match['info']['participants']:
                    if p['teamId'] == player_team_id and p['puuid'] != puuid:
                        teammates.append({
                            'puuid': p.get('puuid'),
                            'riotIdGameName': p.get('riotIdGameName'),
                            'riotIdTagline': p.get('riotIdTagline'),
                            'championName': p['championName']
                        })
                    elif p['teamId'] != player_team_id:
                        opponents.append({
                            'puuid': p.get('puuid'),
                            'riotIdGameName': p.get('riotIdGameName'),
                            'riotIdTagline': p.get('riotIdTagline'),
                            'championName': p['championName']
                        })

                # Check for AFKs/Leavers on team
                team_had_afk = any(p.get('gameEndedInEarlySurrender') for p in match['info']['participants'] if p['teamId'] == player_team_id)

                processed_matches.append({
                    # Basic info
                    'matchId': match['metadata']['matchId'],
                    'gameMode': match['info']['gameMode'],
                    'gameDuration': match['info']['gameDuration'],
                    'gameCreation': match['info']['gameCreation'],
                    'gameEndedInEarlySurrender': match['info'].get('gameEndedInEarlySurrender', False),
                    'gameEndedInSurrender': match['info']['teams'][0].get('win', False) != match['info']['teams'][1].get('win', False),

                    # Champion & role
                    'championName': participant['championName'],
                    'championId': participant['championId'],
                    'lane': participant.get('lane', 'NONE'),
                    'role': participant.get('role', 'NONE'),
                    'individualPosition': participant.get('individualPosition', 'NONE'),

                    # Core stats
                    'kills': participant['kills'],
                    'deaths': participant['deaths'],
                    'assists': participant['assists'],
                    'win': participant['win'],

                    # Advanced combat stats (for highlights!)
                    'pentaKills': participant.get('pentaKills', 0),
                    'quadraKills': participant.get('quadraKills', 0),
                    'tripleKills': participant.get('tripleKills', 0),
                    'doubleKills': participant.get('doubleKills', 0),
                    'largestMultiKill': participant.get('largestMultiKill', 0),
                    'killingSprees': participant.get('killingSprees', 0),
                    'largestKillingSpree': participant.get('largestKillingSpree', 0),
                    'largestCriticalStrike': participant.get('largestCriticalStrike', 0),
                    'longestTimeSpentLiving': participant.get('longestTimeSpentLiving', 0),

                    # Economic stats
                    'goldEarned': participant['goldEarned'],
                    'goldPerMinute': round(participant['goldEarned'] / (match['info']['gameDuration'] / 60), 2),
                    'totalMinionsKilled': participant.get('totalMinionsKilled', 0),
                    'neutralMinionsKilled': participant.get('neutralMinionsKilled', 0),

                    # Damage stats
                    'totalDamageDealt': participant['totalDamageDealtToChampions'],
                    'damagePerMinute': round(participant['totalDamageDealtToChampions'] / (match['info']['gameDuration'] / 60), 2),
                    'totalDamageTaken': participant.get('totalDamageTaken', 0),

                    # CC & utility
                    'timeCCingOthers': participant.get('timeCCingOthers', 0),
                    'totalTimeCCDealt': participant.get('totalTimeCCDealt', 0),

                    # Vision
                    'visionScore': participant.get('visionScore', 0),
                    'wardsPlaced': participant.get('wardsPlaced', 0),
                    'wardsKilled': participant.get('wardsKilled', 0),
                    'visionWardsBoughtInGame': participant.get('visionWardsBoughtInGame', 0),

                    # Spells & abilities
                    'spell1Casts': participant.get('spell1Casts', 0),
                    'spell2Casts': participant.get('spell2Casts', 0),
                    'spell3Casts': participant.get('spell3Casts', 0),
                    'spell4Casts': participant.get('spell4Casts', 0),
                    'summoner1Id': participant.get('summoner1Id', 0),
                    'summoner2Id': participant.get('summoner2Id', 0),
                    'summoner1Casts': participant.get('summoner1Casts', 0),
                    'summoner2Casts': participant.get('summoner2Casts', 0),

                    # Bounty & objectives
                    'bountyLevel': participant.get('bountyLevel', 0),
                    'objectivesStolen': participant.get('objectivesStolen', 0),
                    'turretKills': participant.get('turretKills', 0),
                    'inhibitorKills': participant.get('inhibitorKills', 0),

                    # Team context (for AFK/duo detection)
                    'teamId': player_team_id,
                    'teamHadAFK': team_had_afk,
                    'opponents': opponents,
                    'teammates': teammates,

                    # Items (for interesting builds)
                    'item0': participant.get('item0', 0),
                    'item1': participant.get('item1', 0),
                    'item2': participant.get('item2', 0),
                    'item3': participant.get('item3', 0),
                    'item4': participant.get('item4', 0),
                    'item5': participant.get('item5', 0),
                    'item6': participant.get('item6', 0)
                })

        # Extract death positions from the first match timeline
        death_positions = []
        if first_match_timeline and 'info' in first_match_timeline:
            for frame in first_match_timeline['info'].get('frames', []):
                for event in frame.get('events', []):
                    if event.get('type') == 'CHAMPION_KILL':
                        # Check if this death was the player's
                        victim_id = event.get('victimId')
                        if victim_id and 'position' in event:
                            death_positions.append({
                                'timestamp': event.get('timestamp'),
                                'position': event.get('position'),
                                'victimId': victim_id,
                                'killerId': event.get('killerId'),
                                'assistingParticipantIds': event.get('assistingParticipantIds', [])
                            })

        return jsonify({
            'summoner': {
                'name': f"{game_name}#{tag_line}",
                'level': summoner_data.get('summonerLevel', 0),
                'profileIconId': summoner_data.get('profileIconId', 0)
            },
            'mostPlayedChampion': {
                'championId': mastery_data[0]['championId'] if mastery_data else None,
                'championName': champion_data,
                'championLevel': mastery_data[0]['championLevel'] if mastery_data else 0,
                'championPoints': mastery_data[0]['championPoints'] if mastery_data else 0
            },
            'totalGames': total_games,
            'topChampions': mastery_data[:5] if mastery_data else [],
            'recentMatches': processed_matches,
            'firstMatchTimeline': {
                'hasTimeline': first_match_timeline is not None,
                'deathPositions': death_positions,
                'totalKills': len(death_positions)
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview-stats', methods=['POST'])
def get_preview_stats():
    """Get quick preview stats from first 10 matches"""
    try:
        print("[PREVIEW] Getting preview stats...")
        data = request.json
        matches = data.get('matches', [])[:10]  # Only first 10 matches

        if not matches:
            return jsonify({'error': 'No matches found'}), 400

        # Calculate quick stats
        wins = sum(1 for m in matches if m.get('win'))
        total_kills = sum(m.get('kills', 0) for m in matches)
        total_deaths = sum(m.get('deaths', 0) for m in matches)
        total_assists = sum(m.get('assists', 0) for m in matches)

        # Most played champion in preview
        from collections import Counter
        champ_counts = Counter(m.get('championName') for m in matches)
        most_played = champ_counts.most_common(1)[0] if champ_counts else ('Unknown', 0)

        preview = {
            'matches_analyzed': len(matches),
            'wins': wins,
            'losses': len(matches) - wins,
            'winrate': round((wins / len(matches)) * 100, 1) if matches else 0,
            'avg_kills': round(total_kills / len(matches), 1) if matches else 0,
            'avg_deaths': round(total_deaths / len(matches), 1) if matches else 0,
            'avg_assists': round(total_assists / len(matches), 1) if matches else 0,
            'kda': round((total_kills + total_assists) / max(total_deaths, 1), 2),
            'most_played_champion': most_played[0],
            'most_played_games': most_played[1]
        }

        print(f"[PREVIEW] Preview stats: {preview}")
        return jsonify(preview)

    except Exception as e:
        print(f"[PREVIEW] Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/year-in-review', methods=['POST'])
def generate_year_in_review():
    """Generate comprehensive year-in-review analysis with AI insights"""
    import traceback
    try:
        print("[YEAR-IN-REVIEW] ===== STARTING YEAR IN REVIEW =====")
        data = request.json
        matches = data.get('matches', [])
        summoner_name = data.get('summonerName', 'Summoner')
        region = data.get('region', 'na1')

        print(f"[YEAR-IN-REVIEW] Received request for: {summoner_name}")
        print(f"[YEAR-IN-REVIEW] Matches count: {len(matches)}")

        if not matches or len(matches) < 5:
            print(f"[YEAR-IN-REVIEW] ERROR: Not enough matches ({len(matches)})")
            return jsonify({'error': 'Need at least 5 matches for year-in-review'}), 400

        print(f"[YEAR-IN-REVIEW] Creating analyzer...")

        # Create analyzer and run all analysis
        analyzer = YearInReviewAnalyzer(matches, summoner_name, region)

        print(f"[YEAR-IN-REVIEW] Running analysis...")
        analysis = analyzer.analyze_all()

        print(f"[YEAR-IN-REVIEW] ✅ Analysis complete!")
        print(f"[YEAR-IN-REVIEW] Analysis: {analysis}")
        print(f"[YEAR-IN-REVIEW] Generating AI narrative...")

        # Generate AI narrative
        try:
            narrative = analyzer.generate_ai_narrative(analysis)
            print(f"[YEAR-IN-REVIEW] ✅ AI narrative generated: {narrative[:100]}...")
        except Exception as ai_error:
            print(f"[YEAR-IN-REVIEW] ⚠️ AI narrative failed: {str(ai_error)}")
            narrative = f"Had an incredible year with {len(matches)} games played!"

        print("Narrative: " + narrative)
        
        print(f"[YEAR-IN-REVIEW] ===== SENDING RESPONSE =====")

        return jsonify({
            'analysis': analysis,
            'narrative': narrative,
            'total_matches': len(matches)
        })

    except Exception as e:
        print(f"[YEAR-IN-REVIEW] ❌ CRITICAL ERROR: {str(e)}")
        print(f"[YEAR-IN-REVIEW] Traceback:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Submit user feedback via AWS SES"""
    try:
        data = request.json
        email = data.get('email', 'anonymous')
        feedback = data.get('feedback', '')

        if not feedback:
            return jsonify({'error': 'Feedback text is required'}), 400

        print(f"[FEEDBACK] Received feedback from: {email}")

        # Send email via AWS SES
        ses_client = boto3.client('ses', region_name='us-east-1')

        subject = f"Riftwind Feedback from {email}"
        body = f"""
New feedback received from Riftwind:

Email: {email}
Timestamp: {datetime.now().isoformat()}

Feedback:
{feedback}
        """

        response = ses_client.send_email(
            Source='m@sveder.com',
            Destination={
                'ToAddresses': ['m@sveder.com']
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': body,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )

        print(f"[FEEDBACK] Email sent successfully: {response['MessageId']}")
        return jsonify({'success': True, 'message': 'Feedback sent successfully'})

    except Exception as e:
        print(f"[FEEDBACK] Error sending feedback: {str(e)}")
        return jsonify({'error': 'Failed to send feedback'}), 500

@app.route('/api/roast-me', methods=['POST'])
def roast_player():
    """Generate a savage AI roast"""
    try:
        data = request.json
        matches = data.get('matches', [])
        summoner_name = data.get('summonerName', 'Summoner')
        region = data.get('region', 'na1')

        if not matches:
            return jsonify({'error': 'No match data provided'}), 400

        analyzer = YearInReviewAnalyzer(matches, summoner_name, region)
        roast = analyzer.generate_roast()

        return jsonify({'roast': roast})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def save_api_logs(game_name, tag_line, region, api_data):
    """Save all API responses to a JSON file in the logs folder"""
    try:
        # Create logs folder if it doesn't exist
        logs_folder = 'logs'
        if not os.path.exists(logs_folder):
            os.makedirs(logs_folder)

        # Create filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{game_name}_{tag_line}_{region}_{timestamp}.json"
        filepath = os.path.join(logs_folder, filename)

        # Prepare data to save
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'riot_id': f"{game_name}#{tag_line}",
            'region': region,
            'api_responses': api_data
        }

        # Write to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        print(f"[LOGS] Saved API responses to {filepath}")

    except Exception as e:
        print(f"[LOGS] Failed to save logs: {str(e)}")

def get_champion_name(champion_id):
    # Get latest champion data
    try:
        version_url = 'https://ddragon.leagueoflegends.com/api/versions.json'
        version_response = requests.get(version_url)
        latest_version = version_response.json()[0]

        champion_url = f'https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/en_US/champion.json'
        champion_response = requests.get(champion_url)
        champions = champion_response.json()['data']

        for champ_name, champ_data in champions.items():
            if int(champ_data['key']) == champion_id:
                return champ_name

        return f"Champion {champion_id}"
    except:
        return f"Champion {champion_id}"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
