# OP.GG MCP + AWS Bedrock Integration

## Overview

This integration connects OP.GG's Model Context Protocol (MCP) server with AWS Bedrock to provide enhanced, data-driven roasts and analysis for League of Legends players.

## What is MCP?

Model Context Protocol (MCP) is an open standard created by Anthropic that enables AI assistants to securely connect to external data sources and tools. OP.GG provides an MCP server that exposes real-time League of Legends game data through a standardized interface.

## Architecture

```
┌─────────────────┐
│   Flask App     │
│   (app.py)      │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         v                     v
┌─────────────────┐   ┌──────────────────┐
│  OP.GG MCP      │   │  AWS Bedrock     │
│  HTTP Client    │   │  (Claude 3.5)    │
│                 │   │                  │
│ - Get champion  │   │ - Analyze data   │
│   meta data     │   │ - Generate       │
│ - Get counters  │   │   roasts         │
│ - Get rankings  │   │ - Create tips    │
└────────┬────────┘   └──────────────────┘
         │
         v
┌─────────────────────────────┐
│   OP.GG MCP API             │
│   https://mcp-api.op.gg/mcp │
└─────────────────────────────┘
```

## Files

### Core Implementation

1. **`opgg_mcp_http.py`** - Main integration module
   - `OPGGMCPHTTPClient` - HTTP client for OP.GG MCP server
   - `BedrockWithOPGG` - Bedrock integration for enhanced analysis

2. **`opgg_mcp_bedrock.py`** - Advanced integration with tool calling
   - `BedrockOPGGToolkit` - Full Bedrock Converse API integration
   - Enables Bedrock to directly call OP.GG tools

3. **`app.py`** - Flask endpoints
   - `/api/roast-me` - Original roast (existing)
   - `/api/roast-me-enhanced` - NEW: Enhanced roast with OP.GG data

4. **`test_opgg_integration.py`** - Test suite

## Available OP.GG Tools

### League of Legends

The MCP server provides 28 tools total. Key ones for roasting:

#### Champion Data
- `lol_get_champion_analysis` - Detailed champion stats, builds, counters
- `lol_list_lane_meta_champions` - Meta champions by lane
- `lol_list_champion_leaderboard` - Top players for each champion

#### Summoner Data
- `lol_get_summoner_profile` - Player profile, rank, stats
- `lol_list_summoner_matches` - Match history
- `lol_get_summoner_game_detail` - Detailed match data

#### Meta Information
- `lol_list_champions` - All champions with metadata
- `lol_get_lane_matchup_guide` - Lane matchup tips
- `lol_get_champion_synergies` - Team synergy recommendations

## Usage Examples

### Basic: Get Champion Meta Data

```python
from opgg_mcp_http import OPGGMCPHTTPClient

client = OPGGMCPHTTPClient()

# Get Yasuo meta for mid lane
yasuo_meta = client.get_champion_meta("YASUO", position="MID", region="NA")

print(f"Yasuo winrate: {yasuo_meta['winrate']}%")
print(f"Counters: {yasuo_meta['counters']}")
```

### Enhanced: Generate Roast with OP.GG Data

```python
from opgg_mcp_http import BedrockWithOPGG

bedrock_opgg = BedrockWithOPGG()

player_stats = {
    'championName': 'YASUO',
    'position': 'MID',
    'winrate': 42.0,
    'games_played': 87,
    'avg_deaths': 8.3,
    'avg_kda': 1.8
}

roast = bedrock_opgg.generate_enhanced_roast(
    player_stats,
    "YASUO",
    "MID"
)

print(roast)
# Output: "You're a Hardstuck-Windwall-Whiffer-Gap-Closer-Abuser...
#          With a 42% winrate, you're underperforming the 49.8% average
#          Yasuo winrate by 7.8%. Even Bronze players average 5.2 CS/min,
#          but you're probably too busy dying to care..."
```

### API Endpoint Usage

```javascript
// Call the enhanced roast endpoint
fetch('/api/roast-me-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        matches: recentMatches,
        summonerName: 'PlayerName',
        region: 'na1'
    })
})
.then(res => res.json())
.then(data => {
    console.log(data.roast);  // Enhanced roast with OP.GG comparisons
});
```

## How the Enhanced Roast Works

1. **Extract Player Data**
   - Most played champion
   - Win rate, KDA, deaths
   - Primary position

2. **Fetch OP.GG Meta Data**
   - Champion's average winrate
   - Recommended builds
   - Common counters
   - Pro player stats

3. **Send to Bedrock with Context**
   ```
   Prompt:
   "Player has 42% winrate on Yasuo
    OP.GG shows Yasuo average is 49.8%
    They die 8.3 times per game vs 6.1 average
    Generate a brutal but hilarious roast comparing their performance..."
   ```

4. **Receive Data-Driven Roast**
   - Compares to meta averages
   - References specific counters they lose to
   - Uses actual statistics in burns
   - Includes improvement tips

## Benefits Over Original Roast

| Feature | Original Roast | Enhanced Roast |
|---------|---------------|----------------|
| Data source | Player matches only | Player matches + OP.GG meta |
| Comparisons | General observations | Specific vs average stats |
| Accuracy | Based on limited data | Based on millions of games |
| Tips | Generic advice | Meta-specific guidance |
| Humor | Good | Better (data-driven burns) |

### Example Comparison

**Original Roast:**
> "You die a lot on Yasuo. Maybe learn to press E?"

**Enhanced Roast:**
> "With 8.3 deaths per game, you're dying 35% more than the average Yasuo player. Looking at your match history, you keep running into Malzahar—who has a 56% winrate against Yasuo. Pro tip: That R button? It makes you invincible. Maybe try pressing it before you see the purple?"

## Testing

Run the test suite:

```bash
python3 test_opgg_integration.py
```

This will test:
1. OP.GG MCP server connection
2. Champion meta data retrieval
3. Champion analysis (counters)
4. Leaderboard data
5. Enhanced roast generation (requires AWS creds)

## Configuration

### Requirements

- Python 3.x
- `requests` library
- `boto3` library
- AWS credentials configured for Bedrock
- Internet connection to OP.GG MCP server

### Environment Variables

No additional environment variables needed. The OP.GG MCP server is public and doesn't require API keys.

## Future Enhancements

### Planned Features

1. **Roast Intensity Levels**
   - Mild: Friendly banter
   - Medium: Current style
   - Spicy: Absolutely savage

2. **Comparative Roasts**
   - "Your Yasuo is worse than 85% of Gold players"
   - Compare to friends/other players

3. **Time-Based Analysis**
   - "You play worse after 11pm"
   - "Your winrate drops on weekends"

4. **Champion-Specific Databases**
   - Stereotypes and memes per champion
   - "Of course you play Yasuo..."

5. **Pro Player Comparisons**
   - "Faker averages 8.2 CS/min on Yasuo. You average 4.1."

## Troubleshooting

### "Tool not found" Error

Make sure you're using the correct tool names with underscores:
- ✅ `lol_get_champion_analysis`
- ❌ `lol-get-champion-analysis`

### "Position field required" Error

Always provide a position for champion analysis:
```python
# ❌ Wrong
client.get_champion_analysis("YASUO")

# ✅ Correct
client.get_champion_analysis("YASUO", position="MID")
```

### AWS Bedrock Errors

Make sure:
- AWS credentials are configured (`~/.aws/credentials`)
- Bedrock is enabled in your region
- You have access to Claude 3.5 Sonnet model

## API Documentation

### OPGGMCPHTTPClient Methods

#### `get_champion_meta(champion_name, position, game_mode="RANKED", region="KR")`
Get comprehensive champion metadata.

**Parameters:**
- `champion_name` (str): Champion name in uppercase (e.g., "YASUO")
- `position` (str): Lane position ("TOP", "JUNGLE", "MID", "ADC", "SUPPORT")
- `game_mode` (str, optional): Game mode (default: "RANKED")
- `region` (str, optional): Region code (default: "KR")

**Returns:** Dict with champion stats, builds, counters

#### `get_lane_meta_champions(region="KR", lang="en_US")`
Get current meta champions for all lanes.

**Returns:** Dict with top champions by position

#### `get_summoner_info(game_name, tag_line, region="kr")`
Get summoner profile and stats.

**Parameters:**
- `game_name` (str): Riot ID game name
- `tag_line` (str): Riot ID tag (without #)
- `region` (str): Region code

**Returns:** Dict with summoner profile, rank, stats

### BedrockWithOPGG Methods

#### `generate_enhanced_roast(player_stats, champion_name, position)`
Generate enhanced roast using OP.GG meta data.

**Parameters:**
- `player_stats` (dict): Player's statistics
- `champion_name` (str): Main champion
- `position` (str): Main position

**Returns:** String with enhanced roast

## License

This integration uses:
- OP.GG MCP Server (public API)
- AWS Bedrock (requires AWS account)
- Model Context Protocol (Anthropic standard)

## Support

For issues or questions:
1. Check OP.GG MCP GitHub: https://github.com/opgginc/opgg-mcp
2. Check MCP documentation: https://github.com/modelcontextprotocol
3. File an issue in this repository

## Credits

- **OP.GG** - Gaming data and MCP server
- **Anthropic** - Model Context Protocol standard and Claude 3.5
- **AWS** - Bedrock platform
