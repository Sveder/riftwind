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

    def __init__(self, matches, summoner_name, region):
        self.matches = matches
        self.summoner_name = summoner_name
        self.region = region
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
            'total_hours': total_hours
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

        # Build comprehensive prompt
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

🎯 YOUR TASK:
Write 2-4 hilarious roast lines. Choose the FUNNIEST stats to roast. Mix in some unexpected observations. Be savage but keep it fun!"""

        try:
            print("[ROAST] Sending comprehensive data to AI...")
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

            result = json.loads(response['body'].read())
            roast = result['content'][0]['text']
            print(f"[ROAST] ✅ Generated roast: {roast[:100]}...")
            return roast

        except Exception as e:
            print(f"[ROAST] ❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return "Even the roast bot gave up on you... just like your teammates."
