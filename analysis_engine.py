"""
Analysis Engine for League of Legends Year-in-Review
Powered by AWS Bedrock (Claude Haiku 4.5)
"""
import boto3
import json
from datetime import datetime
from collections import defaultdict, Counter

# AWS Bedrock Configuration
MODEL_ID = "eu.anthropic.claude-haiku-4-5-20251001-v1:0"


class YearInReviewAnalyzer:
    """Analyzes League of Legends match data and generates AI-powered insights"""

    def __init__(self, matches, summoner_name, region, timelines=None):
        self.matches = matches
        self.summoner_name = summoner_name
        self.region = region
        self.timelines = timelines or []
        self.bedrock_client = boto3.client('bedrock-runtime', region_name='eu-central-1')

    def analyze_all(self):
        """Run all analysis and generate comprehensive year-in-review"""
        print("[ANALYZER] Starting comprehensive analysis...")

        print("[ANALYZER] Finding nemesis...")
        nemesis = self.find_nemesis()

        print("[ANALYZER] Finding BFF...")
        bff = self.find_bff()

        print("[ANALYZER] Finding hot streak month...")
        hot_streak = self.find_hot_streak_month()

        print("[ANALYZER] Finding slump month...")
        slump = self.find_slump_month()

        print("[ANALYZER] Calculating glow up...")
        glow_up = self.calculate_glow_up()

        print("[ANALYZER] Finding miracle comebacks...")
        comeback = self.find_miracle_comeback()

        print("[ANALYZER] Finding pentakill breakers...")
        pentakill = self.find_pentakill_breaker()

        print("[ANALYZER] Calculating AFK stats...")
        afk = self.calculate_afk_stats()

        print("[ANALYZER] Getting highlight stats...")
        highlights = self.get_highlight_stats()

        print("[ANALYZER] Tracking role evolution...")
        role_evo = self.track_role_evolution()

        print("[ANALYZER] Finding longest win streak...")
        streak = self.find_longest_win_streak()

        print("[ANALYZER] Analyzing surrenders...")
        surrenders = self.analyze_surrenders()

        print("[ANALYZER] Generating what-if scenarios...")
        what_if = self.generate_what_if_scenarios()

        print("[ANALYZER] Analyzing performance by time...")
        time_analysis = self.analyze_performance_by_time()

        print("[ANALYZER] Calculating champion diversity...")
        diversity = self.calculate_champion_diversity()

        print("[ANALYZER] Calculating total hours played...")
        total_hours = self.calculate_total_hours()

        print("[ANALYZER] Analyzing CS efficiency...")
        cs_efficiency = self.analyze_cs_efficiency()

        print("[ANALYZER] Analyzing kill steals...")
        kill_steals = self.analyze_kill_steals()

        print("[ANALYZER] Analyzing build choices...")
        build_comparison = self.analyze_build_mistakes()

        print("[ANALYZER] Detecting tilt patterns...")
        tilt_detection = self.detect_tilt_patterns()

        print("[ANALYZER] Analyzing champion fatigue...")
        champion_fatigue = self.detect_champion_fatigue()

        print("[ANALYZER] Analyzing learning curves...")
        learning_curves = self.analyze_learning_curves()

        print("[ANALYZER] Analyzing meta adaptation...")
        meta_adaptation = self.analyze_meta_adaptation()

        print("[ANALYZER] ✅ All analysis complete!")

        return {
            'nemesis': nemesis,
            'bff': bff,
            'hot_streak_month': hot_streak,
            'slump_month': slump,
            'glow_up': glow_up,
            'miracle_comeback': comeback,
            'pentakill_breaker': pentakill,
            'afk_stats': afk,
            'highlight_stats': highlights,
            'role_evolution': role_evo,
            'longest_win_streak': streak,
            'surrender_analysis': surrenders,
            'what_if_scenarios': what_if,
            'time_analysis': time_analysis,
            'champion_diversity': diversity,
            'total_hours': total_hours,
            'cs_efficiency': cs_efficiency,
            'kill_steals': kill_steals,
            'build_comparison': build_comparison,
            'tilt_detection': tilt_detection,
            'champion_fatigue': champion_fatigue,
            'learning_curves': learning_curves,
            'meta_adaptation': meta_adaptation
        }

    def find_nemesis(self):
        """Find the opponent you lose to the most"""
        opponent_losses = defaultdict(int)
        opponent_info = {}

        for match in self.matches:
            if not match['win']:
                for opponent in match.get('opponents', []):
                    key = f"{opponent['riotIdGameName']}#{opponent['riotIdTagline']}"
                    opponent_losses[key] += 1
                    opponent_info[key] = opponent

        if not opponent_losses:
            return None

        nemesis = max(opponent_losses.items(), key=lambda x: x[1])
        return {
            'name': nemesis[0],
            'losses': nemesis[1],
            'info': opponent_info.get(nemesis[0])
        }

    def find_bff(self):
        """Find the teammate you win most with"""
        teammate_stats = defaultdict(lambda: {'wins': 0, 'games': 0})
        teammate_info = {}

        for match in self.matches:
            for teammate in match.get('teammates', []):
                if teammate.get('riotIdGameName'):
                    key = f"{teammate['riotIdGameName']}#{teammate.get('riotIdTagline', '')}"
                    teammate_stats[key]['games'] += 1
                    if match['win']:
                        teammate_stats[key]['wins'] += 1
                    teammate_info[key] = teammate

        if not teammate_stats:
            return None

        # Find teammate with most games AND high winrate
        best_duo = max(
            teammate_stats.items(),
            key=lambda x: (x[1]['games'], x[1]['wins'] / x[1]['games'] if x[1]['games'] > 0 else 0)
        )

        return {
            'name': best_duo[0],
            'games': best_duo[1]['games'],
            'wins': best_duo[1]['wins'],
            'winrate': round(best_duo[1]['wins'] / best_duo[1]['games'] * 100, 1),
            'info': teammate_info.get(best_duo[0])
        }

    def find_hot_streak_month(self):
        """Find the month with best performance"""
        monthly_stats = defaultdict(lambda: {'wins': 0, 'games': 0, 'kills': 0, 'deaths': 0, 'assists': 0})

        for match in self.matches:
            date = datetime.fromtimestamp(match['gameCreation'] / 1000)
            month_key = date.strftime('%Y-%m')

            monthly_stats[month_key]['games'] += 1
            if match['win']:
                monthly_stats[month_key]['wins'] += 1
            monthly_stats[month_key]['kills'] += match['kills']
            monthly_stats[month_key]['deaths'] += match['deaths']
            monthly_stats[month_key]['assists'] += match['assists']

        if not monthly_stats:
            return None

        # Find best month by winrate and KDA
        best_month = max(
            monthly_stats.items(),
            key=lambda x: (
                x[1]['wins'] / x[1]['games'] if x[1]['games'] > 0 else 0,
                (x[1]['kills'] + x[1]['assists']) / max(x[1]['deaths'], 1)
            )
        )

        month_data = best_month[1]
        return {
            'month': best_month[0],
            'games': month_data['games'],
            'wins': month_data['wins'],
            'winrate': round(month_data['wins'] / month_data['games'] * 100, 1),
            'kda': round((month_data['kills'] + month_data['assists']) / max(month_data['deaths'], 1), 2)
        }

    def find_slump_month(self):
        """Find the month with worst performance"""
        monthly_stats = defaultdict(lambda: {'wins': 0, 'games': 0})

        for match in self.matches:
            date = datetime.fromtimestamp(match['gameCreation'] / 1000)
            month_key = date.strftime('%Y-%m')

            monthly_stats[month_key]['games'] += 1
            if match['win']:
                monthly_stats[month_key]['wins'] += 1

        if not monthly_stats:
            return None

        # Find worst month by winrate
        worst_month = min(
            monthly_stats.items(),
            key=lambda x: x[1]['wins'] / x[1]['games'] if x[1]['games'] > 0 else 0
        )

        month_data = worst_month[1]
        return {
            'month': worst_month[0],
            'games': month_data['games'],
            'wins': month_data['wins'],
            'winrate': round(month_data['wins'] / month_data['games'] * 100, 1)
        }

    def calculate_glow_up(self):
        """Compare early year vs late year stats"""
        if len(self.matches) < 10:
            return None

        # Split matches into early and late year (first 25% vs last 25%)
        split_point = len(self.matches) // 4
        early_matches = self.matches[-split_point:]  # Most recent are at start, so reverse
        late_matches = self.matches[:split_point]

        def calc_stats(matches):
            wins = sum(1 for m in matches if m['win'])
            total_kills = sum(m['kills'] for m in matches)
            total_deaths = sum(m['deaths'] for m in matches)
            total_assists = sum(m['assists'] for m in matches)
            games = len(matches)

            return {
                'winrate': wins / games * 100 if games > 0 else 0,
                'kda': (total_kills + total_assists) / max(total_deaths, 1),
                'avg_kills': total_kills / games if games > 0 else 0,
                'avg_deaths': total_deaths / games if games > 0 else 0
            }

        early_stats = calc_stats(early_matches)
        late_stats = calc_stats(late_matches)

        return {
            'early': early_stats,
            'late': late_stats,
            'improvement': {
                'winrate': round(late_stats['winrate'] - early_stats['winrate'], 1),
                'kda': round(late_stats['kda'] - early_stats['kda'], 2),
                'deaths_reduction': round(early_stats['avg_deaths'] - late_stats['avg_deaths'], 2)
            }
        }

    def find_miracle_comeback(self):
        """Find games where you were behind in gold but won"""
        # This would require timeline data with gold differentials
        # For now, find games with high deaths but still won
        comeback_games = [
            m for m in self.matches
            if m['win'] and m['deaths'] >= 8  # High deaths but still won
        ]

        if not comeback_games:
            return None

        best_comeback = max(comeback_games, key=lambda x: x['deaths'])
        game_date = datetime.fromtimestamp(best_comeback['gameCreation'] / 1000)
        return {
            'matchId': best_comeback['matchId'],
            'championName': best_comeback['championName'],
            'kills': best_comeback['kills'],
            'deaths': best_comeback['deaths'],
            'assists': best_comeback['assists'],
            'gameDuration': best_comeback['gameDuration'],
            'date': game_date.strftime('%B %d, %Y'),
            'time': game_date.strftime('%I:%M %p'),
            'kda': round((best_comeback['kills'] + best_comeback['assists']) / max(best_comeback['deaths'], 1), 2)
        }

    def find_pentakill_breaker(self):
        """Find who denied your pentakills (quadra kills that didn't become penta)"""
        quadra_games = [m for m in self.matches if m.get('quadraKills', 0) > 0 and m.get('pentaKills', 0) == 0]
        return {
            'count': len(quadra_games),
            'games': quadra_games[:3]  # Return up to 3 games
        }

    def calculate_afk_stats(self):
        """Calculate AFK/leaver statistics"""
        games_with_afk = sum(1 for m in self.matches if m.get('teamHadAFK', False))
        won_with_afk = sum(1 for m in self.matches if m.get('teamHadAFK', False) and m['win'])

        return {
            'games_with_afk': games_with_afk,
            'won_with_afk': won_with_afk,
            'afk_rate': round(games_with_afk / len(self.matches) * 100, 1) if self.matches else 0
        }

    def get_highlight_stats(self):
        """Get all the cool highlight stats"""
        # Find games for specific highlights
        longest_living_game = max(self.matches, key=lambda m: m.get('longestTimeSpentLiving', 0)) if self.matches else None
        largest_crit_game = max(self.matches, key=lambda m: m.get('largestCriticalStrike', 0)) if self.matches else None
        largest_spree_game = max(self.matches, key=lambda m: m.get('largestKillingSpree', 0)) if self.matches else None
        most_kills_game = max(self.matches, key=lambda m: m['kills']) if self.matches else None

        result = {
            'total_pentakills': sum(m.get('pentaKills', 0) for m in self.matches),
            'total_quadrakills': sum(m.get('quadraKills', 0) for m in self.matches),
            'longest_living': max((m.get('longestTimeSpentLiving', 0) for m in self.matches), default=0),
            'largest_crit': max((m.get('largestCriticalStrike', 0) for m in self.matches), default=0),
            'largest_spree': max((m.get('largestKillingSpree', 0) for m in self.matches), default=0),
            'most_kills_game': max((m['kills'] for m in self.matches), default=0),
            'total_cc_time': sum(m.get('timeCCingOthers', 0) for m in self.matches)
        }

        # Add game context for highlights
        if longest_living_game:
            game_date = datetime.fromtimestamp(longest_living_game['gameCreation'] / 1000)
            result['longest_living_details'] = {
                'champion': longest_living_game['championName'],
                'date': game_date.strftime('%B %d, %Y'),
                'time': game_date.strftime('%I:%M %p')
            }

        if largest_crit_game:
            game_date = datetime.fromtimestamp(largest_crit_game['gameCreation'] / 1000)
            result['largest_crit_details'] = {
                'champion': largest_crit_game['championName'],
                'date': game_date.strftime('%B %d, %Y'),
                'time': game_date.strftime('%I:%M %p')
            }

        if largest_spree_game:
            game_date = datetime.fromtimestamp(largest_spree_game['gameCreation'] / 1000)
            result['largest_spree_details'] = {
                'champion': largest_spree_game['championName'],
                'date': game_date.strftime('%B %d, %Y'),
                'time': game_date.strftime('%I:%M %p'),
                'kills': largest_spree_game['kills']
            }

        if most_kills_game:
            game_date = datetime.fromtimestamp(most_kills_game['gameCreation'] / 1000)
            result['most_kills_details'] = {
                'champion': most_kills_game['championName'],
                'date': game_date.strftime('%B %d, %Y'),
                'time': game_date.strftime('%I:%M %p'),
                'kda': f"{most_kills_game['kills']}/{most_kills_game['deaths']}/{most_kills_game['assists']}"
            }

        return result

    def track_role_evolution(self):
        """Track how roles changed over time"""
        role_by_month = defaultdict(lambda: Counter())

        for match in self.matches:
            date = datetime.fromtimestamp(match['gameCreation'] / 1000)
            month_key = date.strftime('%Y-%m')
            role = match.get('individualPosition', 'NONE')
            role_by_month[month_key][role] += 1

        return dict(role_by_month)

    def find_longest_win_streak(self):
        """Find longest winning streak"""
        current_streak = 0
        max_streak = 0
        streak_start = 0
        max_streak_start = 0
        streak_matches = []
        current_streak_matches = []

        for i, match in enumerate(reversed(self.matches)):  # Go chronologically
            if match['win']:
                if current_streak == 0:
                    streak_start = i
                    current_streak_matches = []
                current_streak += 1
                current_streak_matches.append(match)
                if current_streak > max_streak:
                    max_streak = current_streak
                    max_streak_start = streak_start
                    streak_matches = current_streak_matches.copy()
            else:
                current_streak = 0
                current_streak_matches = []

        # Get details of first and last game in streak
        start_game = None
        end_game = None
        if streak_matches:
            start_game = streak_matches[0]
            end_game = streak_matches[-1]
            start_date = datetime.fromtimestamp(start_game['gameCreation'] / 1000)
            end_date = datetime.fromtimestamp(end_game['gameCreation'] / 1000)

            return {
                'streak': max_streak,
                'start_index': max_streak_start,
                'start_game': {
                    'champion': start_game['championName'],
                    'date': start_date.strftime('%B %d, %Y'),
                    'kda': f"{start_game['kills']}/{start_game['deaths']}/{start_game['assists']}"
                },
                'end_game': {
                    'champion': end_game['championName'],
                    'date': end_date.strftime('%B %d, %Y'),
                    'kda': f"{end_game['kills']}/{end_game['deaths']}/{end_game['assists']}"
                }
            }

        return {
            'streak': max_streak,
            'start_index': max_streak_start
        }

    def analyze_surrenders(self):
        """Analyze surrender patterns"""
        surrenders = sum(1 for m in self.matches if m.get('gameEndedInSurrender', False))
        early_surrenders = sum(1 for m in self.matches if m.get('gameEndedInEarlySurrender', False))

        # Calculate time saved (rough estimate)
        avg_full_game = 25 * 60  # 25 minutes
        avg_surrender_time = 20 * 60  # 20 minutes
        time_saved = early_surrenders * (avg_full_game - avg_surrender_time)

        return {
            'total_surrenders': surrenders,
            'early_surrenders': early_surrenders,
            'surrender_rate': round(surrenders / len(self.matches) * 100, 1) if self.matches else 0,
            'time_saved_seconds': time_saved,
            'time_saved_hours': round(time_saved / 3600, 1)
        }

    def generate_what_if_scenarios(self):
        """Generate What-If scenarios using AI"""
        # Calculate main champion stats
        champion_games = Counter(m['championName'] for m in self.matches)
        main_champion = champion_games.most_common(1)[0] if champion_games else ('Unknown', 0)

        # Calculate winrate if only played main champion
        main_champ_matches = [m for m in self.matches if m['championName'] == main_champion[0]]
        main_champ_winrate = (sum(1 for m in main_champ_matches if m['win']) / len(main_champ_matches) * 100) if main_champ_matches else 0

        # Overall winrate
        overall_winrate = (sum(1 for m in self.matches if m['win']) / len(self.matches) * 100) if self.matches else 0

        # Calculate role stats
        role_stats = defaultdict(lambda: {'wins': 0, 'games': 0})
        for match in self.matches:
            role = match.get('individualPosition', 'NONE')
            role_stats[role]['games'] += 1
            if match['win']:
                role_stats[role]['wins'] += 1

        # Find best and worst roles
        best_role = max(role_stats.items(), key=lambda x: x[1]['wins'] / max(x[1]['games'], 1)) if role_stats else ('NONE', {'wins': 0, 'games': 0})
        worst_role = min(role_stats.items(), key=lambda x: x[1]['wins'] / max(x[1]['games'], 1)) if role_stats else ('NONE', {'wins': 0, 'games': 0})

        return {
            'main_champion_only': {
                'champion': main_champion[0],
                'games_played': main_champion[1],
                'winrate': round(main_champ_winrate, 1),
                'difference': round(main_champ_winrate - overall_winrate, 1)
            },
            'best_role_only': {
                'role': best_role[0],
                'winrate': round(best_role[1]['wins'] / max(best_role[1]['games'], 1) * 100, 1),
                'games': best_role[1]['games']
            },
            'worst_role_swap': {
                'role': worst_role[0],
                'winrate': round(worst_role[1]['wins'] / max(worst_role[1]['games'], 1) * 100, 1),
                'games': worst_role[1]['games']
            }
        }

    def analyze_performance_by_time(self):
        """Analyze performance by time of day"""
        time_stats = defaultdict(lambda: {'wins': 0, 'games': 0, 'kills': 0, 'deaths': 0})

        for match in self.matches:
            date = datetime.fromtimestamp(match['gameCreation'] / 1000)
            hour = date.hour

            # Categorize time
            if 0 <= hour < 6:
                period = 'Night Owl (12am-6am)'
            elif 6 <= hour < 12:
                period = 'Early Bird (6am-12pm)'
            elif 12 <= hour < 18:
                period = 'Afternoon (12pm-6pm)'
            else:
                period = 'Evening (6pm-12am)'

            time_stats[period]['games'] += 1
            if match['win']:
                time_stats[period]['wins'] += 1
            time_stats[period]['kills'] += match['kills']
            time_stats[period]['deaths'] += match['deaths']

        # Find best time
        best_time = max(
            time_stats.items(),
            key=lambda x: x[1]['wins'] / max(x[1]['games'], 1)
        ) if time_stats else ('Unknown', {'wins': 0, 'games': 0})

        result = {}
        for period, stats in time_stats.items():
            if stats['games'] > 0:
                result[period] = {
                    'games': stats['games'],
                    'winrate': round(stats['wins'] / stats['games'] * 100, 1),
                    'avg_kills': round(stats['kills'] / stats['games'], 1),
                    'avg_deaths': round(stats['deaths'] / stats['games'], 1)
                }

        result['best_time'] = best_time[0]

        return result

    def calculate_champion_diversity(self):
        """Calculate champion pool diversity"""
        champion_games = Counter(m['championName'] for m in self.matches)
        unique_champions = len(champion_games)
        total_games = len(self.matches)

        # Calculate percentage of games on top 3 champions
        top_3 = champion_games.most_common(3)
        top_3_games = sum(count for _, count in top_3)
        top_3_percentage = (top_3_games / total_games * 100) if total_games > 0 else 0

        return {
            'unique_champions': unique_champions,
            'total_games': total_games,
            'diversity_score': round((unique_champions / total_games) * 100, 1) if total_games > 0 else 0,
            'top_3_champions': [{'name': champ, 'games': count} for champ, count in top_3],
            'top_3_percentage': round(top_3_percentage, 1),
            'one_trick': top_3_percentage > 70  # True if player is a one-trick (70%+ on top 3)
        }

    def calculate_total_hours(self):
        """Calculate total hours played across all matches"""
        total_seconds = sum(match.get('gameDuration', 0) for match in self.matches)
        total_hours = total_seconds / 3600  # Convert seconds to hours

        # Calculate average game duration in minutes
        avg_seconds = total_seconds / len(self.matches) if self.matches else 0
        avg_minutes = avg_seconds / 60

        # Find longest and shortest games
        longest_game = max((m.get('gameDuration', 0) for m in self.matches), default=0)
        shortest_game = min((m.get('gameDuration', 9999) for m in self.matches), default=0)

        return {
            'total_hours': round(total_hours, 1),
            'total_minutes': round(total_seconds / 60, 0),
            'total_seconds': total_seconds,
            'average_game_minutes': round(avg_minutes, 1),
            'longest_game_minutes': round(longest_game / 60, 1),
            'shortest_game_minutes': round(shortest_game / 60, 1)
        }

    def generate_ai_narrative(self, analysis_data):
        """Generate AI-powered narrative using AWS Bedrock"""
        print("[AI NARRATIVE] Preparing prompt...")

        prompt = f"""You are a League of Legends analyst creating a fun year-in-review for {self.summoner_name}.

Based on these stats, write a short, engaging narrative (3-4 sentences) about their year:

Total Games: {len(self.matches)}
Win Rate: {sum(1 for m in self.matches if m['win']) / len(self.matches) * 100:.1f}%
Nemesis: {analysis_data.get('nemesis', {}).get('name', 'None')}
BFF: {analysis_data.get('bff', {}).get('name', 'None')}
Hot Streak Month: {analysis_data.get('hot_streak_month', {}).get('month', 'Unknown')}
Pentakills: {analysis_data.get('highlight_stats', {}).get('total_pentakills', 0)}

Make it fun, personal, and celebratory! Use emojis sparingly."""

        try:
            print("[AI NARRATIVE] Calling AWS Bedrock...")
            response = self.bedrock_client.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 300,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )

            print("[AI NARRATIVE] Response received, parsing...")
            result = json.loads(response['body'].read())
            narrative = result['content'][0]['text']
            print(f"[AI NARRATIVE] ✅ Generated: {narrative[:50]}...")
            return narrative

        except Exception as e:
            print(f"[AI NARRATIVE] ❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return f"Had an incredible year with {len(self.matches)} games played!"

    def analyze_build_mistakes(self):
        """Analyze player's item builds vs optimal builds using OP.GG"""
        print("[BUILD ANALYSIS] Analyzing build orders...")

        try:
            from opgg_mcp_http import OPGGMCPHTTPClient

            # Get most played champion
            champion_counts = {}
            position_counts = {}

            for match in self.matches:
                champ = match.get('championName', 'Unknown')
                pos = match.get('teamPosition', 'MID')
                champion_counts[champ] = champion_counts.get(champ, 0) + 1
                position_counts[pos] = position_counts.get(pos, 0) + 1

            if not champion_counts:
                return None

            most_played_champ = max(champion_counts.items(), key=lambda x: x[1])[0]
            most_played_pos = max(position_counts.items(), key=lambda x: x[1])[0]

            # Get OP.GG meta data
            client = OPGGMCPHTTPClient()
            meta_data = client.get_champion_meta(most_played_champ, most_played_pos, region="NA")

            if not meta_data or 'error' in meta_data:
                print("[BUILD ANALYSIS] Failed to get meta data")
                return None

            # Parse the JSON from the text response
            if 'content' in meta_data and meta_data['content']:
                text_content = meta_data['content'][0].get('text', '')
                if text_content:
                    parsed_data = json.loads(text_content)

                    # Extract build data from the data section
                    if 'data' in parsed_data:
                        data = parsed_data['data']

                        # Get core items from the data (first column is JSON array of item IDs)
                        core_items = []
                        if 'core_items' in data and 'rows' in data['core_items'] and data['core_items']['rows']:
                            row = data['core_items']['rows'][0]
                            if row and len(row) > 0:
                                # First element is a JSON string like "[3153,6673,3031]"
                                items_json = row[0]
                                if isinstance(items_json, str):
                                    core_items = json.loads(items_json)

                        # Get boots (first column is JSON array)
                        boots = []
                        if 'boots' in data and 'rows' in data['boots'] and data['boots']['rows']:
                            row = data['boots']['rows'][0]
                            if row and len(row) > 0:
                                boots_json = row[0]
                                if isinstance(boots_json, str):
                                    boots = json.loads(boots_json)

                        # Get starter items (first column is JSON array)
                        starter_items = []
                        if 'starter_items' in data and 'rows' in data['starter_items'] and data['starter_items']['rows']:
                            row = data['starter_items']['rows'][0]
                            if row and len(row) > 0:
                                starter_json = row[0]
                                if isinstance(starter_json, str):
                                    starter_items = json.loads(starter_json)

                        # Get summary stats
                        win_rate = None
                        pick_rate = None
                        if 'summary' in data and 'rows' in data['summary'] and data['summary']['rows']:
                            summary = data['summary']['rows'][0]
                            win_rate = summary[4] if len(summary) > 4 else None  # win_rate is index 4
                            pick_rate = summary[5] if len(summary) > 5 else None  # pick_rate is index 5

                        optimal_build = {
                            'core_items': core_items,
                            'boots': boots,
                            'starter_items': starter_items,
                            'win_rate': win_rate,
                            'pick_rate': pick_rate
                        }

                        print(f"[BUILD ANALYSIS] Extracted build: {optimal_build}")
                    else:
                        print("[BUILD ANALYSIS] No data in parsed response")
                        return None
                else:
                    print("[BUILD ANALYSIS] No text content")
                    return None
            else:
                print("[BUILD ANALYSIS] No content in meta_data")
                return None

            # Analyze player's actual builds
            player_builds = []
            for match in self.matches:
                if match.get('championName') == most_played_champ:
                    items = []
                    for i in range(7):  # item0-item6
                        item = match.get(f'item{i}')
                        if item and item != 0:
                            items.append(item)
                    if items:
                        player_builds.append({
                            'items': items,
                            'win': match.get('win', False)
                        })

            # Calculate most common player build
            from collections import Counter
            item_frequencies = Counter()
            for build in player_builds:
                for item in build['items']:
                    item_frequencies[item] += 1

            most_common_items = [item for item, count in item_frequencies.most_common(6)]

            return {
                'champion': most_played_champ,
                'position': most_played_pos,
                'optimal_build': optimal_build,
                'player_most_common_items': most_common_items,
                'player_builds': player_builds,
                'games_analyzed': len(player_builds),
                'meta_winrate': optimal_build.get('win_rate')
            }

        except Exception as e:
            print(f"[BUILD ANALYSIS] ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def detect_tilt_patterns(self):
        """Detect tilt patterns: win rate drops after consecutive losses"""
        print("[TILT DETECTION] Analyzing tilt patterns...")

        try:
            if len(self.matches) < 10:
                return None

            # Reverse to chronological order (oldest first)
            matches = list(reversed(self.matches))

            tilt_episodes = []
            loss_streak = 0
            baseline_winrate = sum(1 for m in matches if m['win']) / len(matches)

            # Track performance after losses
            games_after_2_losses = []
            games_after_3_losses = []
            normal_games = []

            for i, match in enumerate(matches):
                # Check previous games
                if i >= 2:
                    prev_2 = matches[i-2:i]
                    if all(not m['win'] for m in prev_2):
                        # After 2+ losses
                        games_after_2_losses.append(match)

                if i >= 3:
                    prev_3 = matches[i-3:i]
                    if all(not m['win'] for m in prev_3):
                        # After 3+ losses
                        games_after_3_losses.append(match)

                # Track normal baseline (no recent losses)
                if i >= 2:
                    prev_2 = matches[i-2:i]
                    if any(m['win'] for m in prev_2):
                        normal_games.append(match)

                # Track loss streaks
                if not match['win']:
                    loss_streak += 1
                else:
                    if loss_streak >= 3:
                        # End of tilt episode
                        tilt_episodes.append({
                            'length': loss_streak,
                            'ended_at': i
                        })
                    loss_streak = 0

            # Calculate win rates
            wr_after_2_losses = (sum(1 for m in games_after_2_losses if m['win']) / len(games_after_2_losses) * 100) if games_after_2_losses else 0
            wr_after_3_losses = (sum(1 for m in games_after_3_losses if m['win']) / len(games_after_3_losses) * 100) if games_after_3_losses else 0
            wr_normal = (sum(1 for m in normal_games if m['win']) / len(normal_games) * 100) if normal_games else baseline_winrate * 100

            # Detect significant tilt
            tilt_drop_2_losses = wr_normal - wr_after_2_losses
            tilt_drop_3_losses = wr_normal - wr_after_3_losses
            is_tilting = tilt_drop_2_losses >= 15 or tilt_drop_3_losses >= 20

            longest_loss_streak = max([ep['length'] for ep in tilt_episodes], default=0)

            return {
                'is_tilting': is_tilting,
                'baseline_winrate': round(baseline_winrate * 100, 1),
                'wr_after_2_losses': round(wr_after_2_losses, 1),
                'wr_after_3_losses': round(wr_after_3_losses, 1),
                'wr_normal': round(wr_normal, 1),
                'tilt_drop_2_losses': round(tilt_drop_2_losses, 1),
                'tilt_drop_3_losses': round(tilt_drop_3_losses, 1),
                'games_analyzed_after_2_losses': len(games_after_2_losses),
                'games_analyzed_after_3_losses': len(games_after_3_losses),
                'tilt_episodes': len(tilt_episodes),
                'longest_loss_streak': longest_loss_streak
            }

        except Exception as e:
            print(f"[TILT DETECTION] ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def detect_champion_fatigue(self):
        """Detect champion fatigue: win rate drops after playing same champ consecutively"""
        print("[CHAMPION FATIGUE] Analyzing champion fatigue...")

        try:
            if len(self.matches) < 20:
                return None

            # Reverse to chronological order
            matches = list(reversed(self.matches))

            # Track performance by game number on same champion
            champion_sessions = {}  # {champion: {game_num: [wins]}}
            current_champ = None
            games_on_champ = 0

            for match in matches:
                champ = match['championName']

                if champ != current_champ:
                    # New champion session
                    current_champ = champ
                    games_on_champ = 1
                else:
                    games_on_champ += 1

                # Track performance by game number
                if champ not in champion_sessions:
                    champion_sessions[champ] = defaultdict(list)

                champion_sessions[champ][games_on_champ].append(match['win'])

            # Find fatigue patterns
            fatigue_detected = []

            for champ, sessions in champion_sessions.items():
                if len(sessions) < 5:
                    continue

                # Compare first 3 games vs games 5+
                early_games = []
                late_games = []

                for game_num, results in sessions.items():
                    if game_num <= 3:
                        early_games.extend(results)
                    elif game_num >= 5:
                        late_games.extend(results)

                if len(early_games) >= 3 and len(late_games) >= 3:
                    early_wr = sum(early_games) / len(early_games) * 100
                    late_wr = sum(late_games) / len(late_games) * 100
                    drop = early_wr - late_wr

                    if drop >= 15:
                        fatigue_detected.append({
                            'champion': champ,
                            'early_wr': round(early_wr, 1),
                            'late_wr': round(late_wr, 1),
                            'drop': round(drop, 1),
                            'early_games': len(early_games),
                            'late_games': len(late_games)
                        })

            # Sort by biggest drop
            fatigue_detected.sort(key=lambda x: x['drop'], reverse=True)

            has_fatigue = len(fatigue_detected) > 0

            return {
                'has_fatigue': has_fatigue,
                'fatigued_champions': fatigue_detected[:3],  # Top 3
                'champions_analyzed': len(champion_sessions)
            }

        except Exception as e:
            print(f"[CHAMPION FATIGUE] ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def analyze_learning_curves(self):
        """Analyze learning curves: CS/min improving over time, KDA improvements"""
        print("[LEARNING CURVES] Analyzing learning curves...")

        try:
            if len(self.matches) < 30:
                return None

            # Reverse to chronological order
            matches = list(reversed(self.matches))

            # Split into early and late periods
            chunk_size = len(matches) // 3
            early_matches = matches[:chunk_size]
            mid_matches = matches[chunk_size:chunk_size*2]
            late_matches = matches[chunk_size*2:]

            def calc_avg_cs_per_min(match_list):
                cs_rates = []
                for m in match_list:
                    duration_min = m.get('gameDuration', 0) / 60
                    if duration_min > 0:
                        cs = m.get('totalMinionsKilled', 0) + m.get('neutralMinionsKilled', 0)
                        cs_rates.append(cs / duration_min)
                return sum(cs_rates) / len(cs_rates) if cs_rates else 0

            def calc_avg_kda(match_list):
                kdas = [(m['kills'] + m['assists']) / max(m['deaths'], 1) for m in match_list]
                return sum(kdas) / len(kdas) if kdas else 0

            def calc_winrate(match_list):
                wins = sum(1 for m in match_list if m['win'])
                return (wins / len(match_list) * 100) if match_list else 0

            # Calculate metrics for each period
            early_cs = calc_avg_cs_per_min(early_matches)
            mid_cs = calc_avg_cs_per_min(mid_matches)
            late_cs = calc_avg_cs_per_min(late_matches)

            early_kda = calc_avg_kda(early_matches)
            mid_kda = calc_avg_kda(mid_matches)
            late_kda = calc_avg_kda(late_matches)

            early_wr = calc_winrate(early_matches)
            mid_wr = calc_winrate(mid_matches)
            late_wr = calc_winrate(late_matches)

            # Calculate improvements
            cs_improvement = late_cs - early_cs
            kda_improvement = late_kda - early_kda
            wr_improvement = late_wr - early_wr

            is_improving = cs_improvement > 0.5 or kda_improvement > 0.3 or wr_improvement > 5

            return {
                'is_improving': is_improving,
                'cs_per_min': {
                    'early': round(early_cs, 2),
                    'mid': round(mid_cs, 2),
                    'late': round(late_cs, 2),
                    'improvement': round(cs_improvement, 2)
                },
                'kda': {
                    'early': round(early_kda, 2),
                    'mid': round(mid_kda, 2),
                    'late': round(late_kda, 2),
                    'improvement': round(kda_improvement, 2)
                },
                'winrate': {
                    'early': round(early_wr, 1),
                    'mid': round(mid_wr, 1),
                    'late': round(late_wr, 1),
                    'improvement': round(wr_improvement, 1)
                }
            }

        except Exception as e:
            print(f"[LEARNING CURVES] ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def analyze_meta_adaptation(self):
        """Analyze how quickly player adapts to meta changes"""
        print("[META ADAPTATION] Analyzing meta adaptation...")

        try:
            if len(self.matches) < 20:
                return None

            # Group matches by patch version
            patch_stats = defaultdict(lambda: {'games': 0, 'wins': 0, 'champions': set()})

            for match in self.matches:
                patch = match.get('gameVersion', 'Unknown')
                # Extract major.minor patch (e.g., "14.23.604.8681" -> "14.23")
                if patch and '.' in patch:
                    parts = patch.split('.')
                    if len(parts) >= 2:
                        patch = f"{parts[0]}.{parts[1]}"

                patch_stats[patch]['games'] += 1
                if match['win']:
                    patch_stats[patch]['wins'] += 1
                patch_stats[patch]['champions'].add(match['championName'])

            # Sort patches by game count
            patches = sorted(patch_stats.items(), key=lambda x: x[1]['games'], reverse=True)

            # Calculate champion diversity per patch
            patch_data = []
            for patch, stats in patches[:5]:  # Top 5 patches
                wr = (stats['wins'] / stats['games'] * 100) if stats['games'] > 0 else 0
                patch_data.append({
                    'patch': patch,
                    'games': stats['games'],
                    'winrate': round(wr, 1),
                    'unique_champions': len(stats['champions']),
                    'diversity_score': round(len(stats['champions']) / stats['games'], 2) if stats['games'] > 0 else 0
                })

            # Check if player explores new champions each patch (good adaptation)
            avg_diversity = sum(p['diversity_score'] for p in patch_data) / len(patch_data) if patch_data else 0
            is_adapting = avg_diversity > 0.3  # Playing multiple champions per patch

            return {
                'is_adapting': is_adapting,
                'patches_played': len(patches),
                'patch_data': patch_data,
                'avg_diversity_score': round(avg_diversity, 2)
            }

        except Exception as e:
            print(f"[META ADAPTATION] ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def generate_roast(self):
        """Generate a savage roast using AI with COMPREHENSIVE data"""
        print("[ROAST] Gathering comprehensive stats for roast...")

        # Calculate ALL the stats
        total_games = len(self.matches)
        wins = sum(1 for m in self.matches if m['win'])
        winrate = (wins / total_games * 100) if total_games > 0 else 0

        # Death stats
        most_deaths_game = max((m['deaths'] for m in self.matches), default=0)
        avg_deaths = sum(m['deaths'] for m in self.matches) / total_games if total_games > 0 else 0

        # KDA stats
        worst_kda = min(
            ((m['kills'] + m['assists']) / max(m['deaths'], 1) for m in self.matches),
            default=0
        )
        avg_kda = sum((m['kills'] + m['assists']) / max(m['deaths'], 1) for m in self.matches) / total_games if total_games > 0 else 0

        # AFK stats
        afk_data = self.calculate_afk_stats()

        # Champion diversity
        diversity = self.calculate_champion_diversity()

        # Nemesis
        nemesis = self.find_nemesis()

        # Pentakill breaker
        pentakill_breaker = self.find_pentakill_breaker()

        # Time analysis
        time_analysis = self.analyze_performance_by_time()

        # NEW: Build analysis
        build_analysis = self.analyze_build_mistakes()

        # Get worst performing champion
        champion_stats = {}
        for match in self.matches:
            champ = match['championName']
            if champ not in champion_stats:
                champion_stats[champ] = {'wins': 0, 'games': 0}
            champion_stats[champ]['games'] += 1
            if match['win']:
                champion_stats[champ]['wins'] += 1

        worst_champ = None
        if champion_stats:
            worst_champ = min(
                [(c, s['wins'] / s['games'] if s['games'] > 0 else 0, s['games'])
                 for c, s in champion_stats.items() if s['games'] >= 3],
                key=lambda x: x[1],
                default=None
            )

        # Build comprehensive prompt with build analysis
        build_roast_section = ""
        if build_analysis:
            build_roast_section = f"""
Item Build Analysis (OP.GG Comparison):
- Main Champion: {build_analysis['champion']}
- Position: {build_analysis['position']}
- Games analyzed: {build_analysis['games_analyzed']}
- Optimal Build from OP.GG: {build_analysis.get('optimal_build', 'N/A')}
- Your typical builds: Check if they match the meta!
"""

        prompt = f"""You are a SAVAGE League of Legends roaster. You've been given extensive data about {self.summoner_name}'s gameplay. Pick the FUNNIEST and most BRUTAL things to roast them about. Be creative, witty, and ruthless (but playful)!

📊 COMPREHENSIVE PLAYER DATA:

Overall Performance:
- Total Games: {total_games}
- Win Rate: {winrate:.1f}%
- Average KDA: {avg_kda:.2f}
- Worst KDA in a game: {worst_kda:.2f}

Death Stats:
- Most deaths in one game: {most_deaths_game}
- Average deaths per game: {avg_deaths:.1f}

Tilt & Mentality:
- Games with AFK teammates: {afk_data['games_with_afk']}
- Won with AFK: {afk_data['won_with_afk']}

Champion Pool:
- Unique champions played: {diversity['unique_champions']}
- One-trick?: {diversity['one_trick']}
- Top 3 champions take up {diversity['top_3_percentage']:.1f}% of games
{f"- Worst champion: {worst_champ[0]} with {worst_champ[1]*100:.1f}% winrate" if worst_champ else ""}

Rivals:
{f"- Has a nemesis ({nemesis['name']}) who beat them {nemesis['losses']} times" if nemesis else "- No nemesis (no one cares enough)"}

Missed Opportunities:
- Quadra kills that didn't become Pentas: {pentakill_breaker['count']}

Time of Day Performance:
{f"- Best time: {time_analysis.get('best_time', 'Unknown')}" if time_analysis else ""}
{build_roast_section}
🎯 YOUR TASK:
Write 2-4 hilarious roast lines. Choose the FUNNIEST stats to roast. Mix in some unexpected observations. Be savage but keep it fun! If build data is available, roast their item choices!"""

        try:
            print("[ROAST] Sending comprehensive data to AI...")
            response = self.bedrock_client.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1000,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )

            result = json.loads(response['body'].read())
            roast = result['content'][0]['text']
            print(f"[ROAST] ✅ Generated roast: {roast[:100]}...")
            return roast

        except Exception as e:
            print(f"[ROAST] ❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return "Even the roast bot gave up on you... just like your teammates."

    def analyze_cs_efficiency(self):
        """Analyze CS (Creep Score) per minute by month"""
        if not self.matches:
            return None

        # Group matches by month and track roles
        monthly_cs = defaultdict(lambda: {'total_cs': 0, 'total_minutes': 0, 'games': 0})
        role_counts = Counter()

        # Rank benchmarks for CS/min (approximate averages by rank)
        cs_benchmarks = {
            'Iron': 3.5,
            'Bronze': 4.0,
            'Silver': 4.5,
            'Gold': 5.0,
            'Platinum': 5.5,
            'Emerald': 6.0,
            'Diamond': 6.5,
            'Master': 7.0,
            'Grandmaster': 7.5,
            'Challenger': 8.0
        }

        for match in self.matches:
            timestamp = match.get('gameCreation', 0) / 1000
            date = datetime.fromtimestamp(timestamp)
            month_key = date.strftime('%Y-%m')

            # Track role
            role = match.get('individualPosition', 'NONE')
            role_counts[role] += 1

            total_cs = match.get('totalMinionsKilled', 0) + match.get('neutralMinionsKilled', 0)
            game_duration_minutes = match.get('gameDuration', 0) / 60

            if game_duration_minutes > 0:
                monthly_cs[month_key]['total_cs'] += total_cs
                monthly_cs[month_key]['total_minutes'] += game_duration_minutes
                monthly_cs[month_key]['games'] += 1

        # Calculate CS per minute for each month
        monthly_data = []
        total_cs_all = 0
        total_minutes_all = 0

        for month in sorted(monthly_cs.keys()):
            data = monthly_cs[month]
            cs_per_min = data['total_cs'] / data['total_minutes'] if data['total_minutes'] > 0 else 0

            monthly_data.append({
                'month': month,
                'cs_per_min': round(cs_per_min, 1),
                'games': data['games'],
                'total_cs': data['total_cs']
            })

            total_cs_all += data['total_cs']
            total_minutes_all += data['total_minutes']

        # Calculate overall average
        overall_cs_per_min = total_cs_all / total_minutes_all if total_minutes_all > 0 else 0

        # Check if mostly jungler (>50% jungle games)
        total_games = sum(role_counts.values())
        jungle_games = role_counts.get('JUNGLE', 0)
        is_jungler = jungle_games > (total_games * 0.5)

        # Determine estimated rank based on CS/min
        estimated_rank = 'Iron'
        for rank, benchmark in sorted(cs_benchmarks.items(), key=lambda x: x[1]):
            if overall_cs_per_min >= benchmark:
                estimated_rank = rank

        return {
            'monthly_data': monthly_data,
            'overall_cs_per_min': round(overall_cs_per_min, 1),
            'total_cs': total_cs_all,
            'estimated_rank': estimated_rank,
            'benchmarks': cs_benchmarks,
            'is_jungler': is_jungler,
            'jungle_percentage': round((jungle_games / total_games * 100) if total_games > 0 else 0, 1)
        }

    def analyze_kill_steals(self):
        """Analyze kill stealing behavior from timeline data"""
        if not self.timelines:
            print("[KILL_STEALS] No timeline data available")
            return None

        print(f"[KILL_STEALS] Analyzing {len(self.timelines)} timelines...")

        # Build a map of match_id to player's participantId
        match_participant_map = {}
        for match in self.matches:
            match_id = match.get('matchId')
            # participantId is 1-indexed in timeline, but we need to find it from the match
            # We'll use the match data to figure out which participant is the player
            match_participant_map[match_id] = match  # Store full match for reference

        kill_steal_stats = {
            'total_kills': 0,
            'kill_steals': 0,
            'lowest_damage_percentage': 100,
            'most_shameless_kill': None,
            'average_damage_contribution': 0,
            'damage_contributions': []
        }

        for timeline_data in self.timelines:
            match_id = timeline_data.get('match_id')
            timeline = timeline_data.get('timeline')

            if not timeline or 'info' not in timeline:
                continue

            # Find player's participantId from the match data
            # Timeline uses 1-10 participantIds
            match_info = match_participant_map.get(match_id)
            if not match_info:
                continue

            # The player's participantId isn't directly available, but we can infer it
            # from champion name or other identifying info
            # For simplicity, we'll track ALL kills and filter by checking the processed match data
            player_champion = match_info.get('championName')

            # Get all champion kill events from timeline
            for frame in timeline['info'].get('frames', []):
                for event in frame.get('events', []):
                    if event.get('type') != 'CHAMPION_KILL':
                        continue

                    killer_id = event.get('killerId', 0)
                    victim_id = event.get('victimId', 0)

                    # Skip if killer_id is 0 (executed/environmental kill)
                    if killer_id == 0:
                        continue

                    # Get damage dealt to victim
                    victim_damage_received = event.get('victimDamageReceived', [])

                    # Determine killer's team (1-5 = blue, 6-10 = red)
                    killer_team = range(1, 6) if killer_id <= 5 else range(6, 11)

                    # Calculate total damage from killer's team
                    team_damage_total = 0
                    killer_damage = 0

                    for damage_entry in victim_damage_received:
                        participant_id = damage_entry.get('participantId', 0)

                        # Only count damage from the killer's team
                        if participant_id not in killer_team:
                            continue

                        # Calculate total damage
                        total_dmg = (damage_entry.get('magicDamage', 0) +
                                   damage_entry.get('physicalDamage', 0) +
                                   damage_entry.get('trueDamage', 0))

                        team_damage_total += total_dmg

                        # Track killer's damage
                        if participant_id == killer_id:
                            killer_damage += total_dmg

                    # Calculate damage percentage
                    if team_damage_total > 0:
                        damage_percentage = (killer_damage / team_damage_total) * 100

                        # Check if this kill was by the player (by matching championName or participantId)
                        # We need to map participantId (1-10) to the actual player
                        # For now, we'll track ALL kills and filter later
                        # This is a simplified version - in reality we'd need to match participantId more carefully

                        kill_steal_stats['total_kills'] += 1
                        kill_steal_stats['damage_contributions'].append(damage_percentage)

                        # Check if it's a kill steal (< 15% damage)
                        if damage_percentage < 15:
                            kill_steal_stats['kill_steals'] += 1

                            # Track most shameless kill
                            if damage_percentage < kill_steal_stats['lowest_damage_percentage']:
                                kill_steal_stats['lowest_damage_percentage'] = damage_percentage
                                kill_steal_stats['most_shameless_kill'] = {
                                    'damage_percentage': round(damage_percentage, 1),
                                    'killer_damage': killer_damage,
                                    'team_damage': team_damage_total,
                                    'match_id': match_id,
                                    'timestamp': event.get('timestamp', 0)
                                }

        # Calculate average damage contribution
        if kill_steal_stats['damage_contributions']:
            kill_steal_stats['average_damage_contribution'] = round(
                sum(kill_steal_stats['damage_contributions']) / len(kill_steal_stats['damage_contributions']),
                1
            )

        # Calculate kill steal rate
        if kill_steal_stats['total_kills'] > 0:
            kill_steal_stats['kill_steal_rate'] = round(
                (kill_steal_stats['kill_steals'] / kill_steal_stats['total_kills']) * 100,
                1
            )
        else:
            kill_steal_stats['kill_steal_rate'] = 0

        print(f"[KILL_STEALS] Found {kill_steal_stats['kill_steals']} kill steals out of {kill_steal_stats['total_kills']} total kills")

        return kill_steal_stats
