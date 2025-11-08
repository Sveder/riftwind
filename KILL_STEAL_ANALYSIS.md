# Kill Stealing Detection - Riot API Timeline Analysis

## Overview
Kill stealing occurs when a player deals minimal damage to an enemy but secures the final blow for the kill credit.

## Riot API Timeline Data Structure

### CHAMPION_KILL Event
```json
{
  "type": "CHAMPION_KILL",
  "timestamp": 184069,
  "killerId": 8,
  "victimId": 3,
  "assistingParticipantIds": [1, 4],
  "bounty": 300,
  "killStreakLength": 0,
  "shutdownBounty": 0,
  "position": {"x": 6124, "y": 6907},
  "victimDamageReceived": [...],
  "victimDamageDealt": [...]
}
```

### Key Fields for Kill Steal Detection

**victimDamageReceived**: Array of damage instances the victim received before death
```json
{
  "participantId": 8,
  "name": "Mel",
  "spellName": "melq",
  "spellSlot": 0,
  "basic": false,
  "magicDamage": 144,
  "physicalDamage": 0,
  "trueDamage": 0,
  "type": "OTHER"  // or "MINION", "MONSTER", "TOWER"
}
```

**Important Notes:**
- `participantId` 0 = minions/monsters
- Damage from towers/turrets also included
- Total damage per player = magicDamage + physicalDamage + trueDamage

## Kill Steal Detection Algorithm

### Step 1: Filter Team Damage
```python
# Get killer's team (1-5 = blue team, 6-10 = red team)
killer_team = range(1, 6) if killer_id <= 5 else range(6, 11)

# Filter damage from killer's team only (exclude enemy, minions, towers)
team_damage = [d for d in victimDamageReceived
               if d['participantId'] in killer_team]
```

### Step 2: Calculate Damage Totals
```python
def get_total_damage(damage_entry):
    return (damage_entry['magicDamage'] +
            damage_entry['physicalDamage'] +
            damage_entry['trueDamage'])

# Total damage from killer's team
team_total = sum(get_total_damage(d) for d in team_damage)

# Damage dealt by killer specifically
killer_damage = sum(get_total_damage(d) for d in team_damage
                    if d['participantId'] == killer_id)
```

### Step 3: Determine Kill Steal
```python
if team_total == 0:
    is_kill_steal = False
else:
    killer_percentage = (killer_damage / team_total) * 100

    # Thresholds:
    # < 10% = Blatant Kill Steal
    # 10-20% = Likely Kill Steal
    # 20-30% = Questionable
    # > 30% = Fair Kill

    is_kill_steal = killer_percentage < 20
```

## Example Analysis

From the sample data:
- **Victim**: Mel (participantId 3)
- **Killer**: Corki (participantId 8)
- **Damage Breakdown**:
  - Corki dealt: 535 damage (191+67+125+65+47+40)
  - Mel dealt to Corki: 689 damage (from victimDamageDealt)
  - Other teammates: Need to check other participantIds in victimDamageReceived

## Implementation Considerations

### Timeline API Limitations
- Timeline data is only available for recent matches
- Requires an additional API call per match (rate limit concern)
- Each timeline request counts against API rate limits

### Suggested Approach
1. **Initial Implementation**: Analyze only the most recent 10-20 matches
2. **Caching**: Cache timeline data aggressively (timelines don't change)
3. **Rate Limiting**: Space out timeline requests to avoid API throttling
4. **Metrics to Track**:
   - Total kill steals (percentage < 20%)
   - "Biggest" kill steals (lowest damage percentage)
   - Average damage contribution on kills
   - Kill steal rate (KS per game)

### Display Ideas
- "🥷 Kill Steal Master: Secured X kills with less than 20% damage"
- "Most Shameless KS: Got a kill with only Y damage (Z% contribution)"
- Show a funny comparison: "Did more damage to your pride than to enemies"

## Code Structure

```python
def analyze_kill_steals(timeline_data, player_participant_id):
    """
    Analyze kill stealing behavior from timeline data

    Returns:
    {
        'total_kill_steals': int,
        'kill_steal_percentage': float,
        'most_shameless': {
            'damage_percentage': float,
            'victim_name': str,
            'timestamp': int
        }
    }
    """
    pass
```

## Next Steps
1. Implement `analyze_kill_steals()` in analysis_engine.py
2. Add to year-in-review cards
3. Test with various player data
4. Consider rate limiting strategy for timeline requests
