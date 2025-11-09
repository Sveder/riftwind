# AWS Bedrock Knowledge Base Integration Guide

This guide shows you how to integrate your League of Legends knowledge base with Riftwind's AI features.

## Prerequisites

- AWS Account with Bedrock access
- Knowledge Base created in AWS Bedrock
- League of Legends data and tips uploaded to the knowledge base

## Step 1: Find Your Knowledge Base ID

1. Go to AWS Console → Bedrock → Knowledge bases
2. Click on your knowledge base
3. Copy the **Knowledge Base ID** (format: `ABCDEF1234`)

## Step 2: Update Configuration

Edit `analysis_engine.py` and update line 15:

```python
# Replace this:
KNOWLEDGE_BASE_ID = "YOUR_KNOWLEDGE_BASE_ID"

# With your actual ID:
KNOWLEDGE_BASE_ID = "ABCDEF1234"  # Your actual ID here
```

## Step 3: Choose Integration Method

### Method 1: RetrieveAndGenerate (Recommended - Easiest)

This automatically retrieves relevant knowledge and generates responses. No manual prompt engineering needed.

**Use case:** When you want the AI to automatically find and use relevant League tips/data.

**Example:** The `generate_roast_with_kb()` method uses this approach.

```python
# In app.py, update the roast endpoint to use KB:
analyzer = YearInReviewAnalyzer(matches, summoner_name, region)
roast = analyzer.generate_roast_with_kb(player_stats)
```

### Method 2: Manual Retrieve + Prompt (Advanced)

Gives you more control over how knowledge is used in prompts.

**Use case:** When you want to customize how the retrieved knowledge is presented.

**Example:**

```python
# Query KB for specific info
kb_context = analyzer.query_knowledge_base(
    f"Best builds and tips for {champion_name} in {position}"
)

# Use context in your custom prompt
prompt = f"""
Player stats: {stats}

League Knowledge:
{kb_context}

Generate insights based on both the stats and knowledge.
"""
```

## Step 4: Update API Endpoints

### Option A: Use KB for Roasts

In `app.py`, find the `/api/roast-me` endpoint and update:

```python
@app.route('/api/roast-me', methods=['POST'])
def roast_player():
    # ... existing code ...

    analyzer = YearInReviewAnalyzer(matches, summoner_name, region)

    # Change this line:
    # roast = analyzer.generate_roast()

    # To this:
    player_context = f"""
    Total Games: {len(matches)}
    Win Rate: {wins/len(matches)*100:.1f}%
    Most Played Champion: {most_played_champion}
    """
    roast = analyzer.generate_roast_with_kb(player_context)

    return jsonify({'roast': roast})
```

### Option B: Create New KB-Enhanced Endpoint

Add a new endpoint for KB-enhanced insights:

```python
@app.route('/api/champion-tips', methods=['POST'])
def get_champion_tips():
    """Get personalized tips using knowledge base"""
    data = request.json
    champion = data.get('champion')
    position = data.get('position')
    player_stats = data.get('stats', {})

    analyzer = YearInReviewAnalyzer([], "Player", "na1")

    # Query KB for champion-specific tips
    kb_tips = analyzer.query_knowledge_base(
        f"Best builds, runes, and gameplay tips for {champion} {position}"
    )

    # Generate personalized advice
    advice = analyzer.generate_personalized_advice(
        champion, position, player_stats, kb_tips
    )

    return jsonify({'tips': advice})
```

## Step 5: Test the Integration

1. Update the Knowledge Base ID in `analysis_engine.py`
2. Restart gunicorn: `pkill -f gunicorn && ~/.local/bin/gunicorn -c gunicorn_config.py app:app --daemon`
3. Test by getting a roast or generating insights
4. Check logs for `[KB]` or `[ROAST KB]` messages

## Example Knowledge Base Content Structure

Your knowledge base should contain:

### Champion Guides
```
Champion: Yasuo
Role: Mid
Build: Immortal Shieldbow → Infinity Edge → Bloodthirster
Runes: Conqueror, Triumph, Legend: Alacrity, Last Stand
Tips: Look for opportunities to dash through minion waves...
```

### General Tips
```
Topic: Tilt Management
Advice: After 2 consecutive losses, take a 15-minute break...
Win Rate Impact: Players who take breaks maintain 8% higher win rates...
```

### Meta Information
```
Patch: 14.23
S-Tier ADCs: Jinx, Ashe, Caitlyn
Current Meta: Early game snowball focused...
```

## API Reference

### `query_knowledge_base(query_text, max_results=5)`
Retrieves relevant documents from the knowledge base.

**Parameters:**
- `query_text` (str): The search query
- `max_results` (int): Number of documents to retrieve (default: 5)

**Returns:** Combined text from relevant documents or None

### `generate_roast_with_kb(player_context)`
Generates a roast using both player stats and knowledge base context.

**Parameters:**
- `player_context` (str): Summary of player stats

**Returns:** Generated roast text

## Troubleshooting

### Error: "Knowledge Base not found"
- Verify your Knowledge Base ID is correct
- Ensure it's in the same region (eu-central-1)
- Check IAM permissions for bedrock-agent-runtime

### Error: "Access denied"
Add these permissions to your IAM role:
```json
{
    "Effect": "Allow",
    "Action": [
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
    ],
    "Resource": "arn:aws:bedrock:eu-central-1:*:knowledge-base/*"
}
```

### No relevant results returned
- Check your knowledge base has been synced
- Verify documents are properly indexed
- Try more specific queries

## Best Practices

1. **Cache KB results** - If making multiple calls with similar queries, cache the results
2. **Limit query scope** - Be specific in queries to get better results
3. **Combine with player data** - Use KB for general tips, player stats for personalization
4. **Error handling** - Always have fallback to non-KB methods
5. **Monitor costs** - KB queries cost per request, use judiciously

## Cost Considerations

- RetrieveAndGenerate: ~$0.005 per request (varies by model)
- Retrieve only: ~$0.001 per request
- Consider caching frequently requested insights

## Next Steps

1. Populate your knowledge base with League of Legends data
2. Update the Knowledge Base ID in the code
3. Choose which features should use the KB
4. Test thoroughly before deploying
5. Monitor performance and costs

## Example Use Cases

### 1. Build Recommendations
```python
# Get optimal builds for player's main champion
main_champ = get_most_played_champion(matches)
builds = query_knowledge_base(f"Optimal builds for {main_champ}")
```

### 2. Personalized Tips
```python
# Get tips based on detected weaknesses
if tilt_detected:
    tips = query_knowledge_base("How to recover from tilt and loss streaks")
```

### 3. Meta Insights
```python
# Compare player's picks to current meta
meta_info = query_knowledge_base(f"Current meta for {position} in patch 14.23")
```

For more help, see AWS Bedrock documentation: https://docs.aws.amazon.com/bedrock/
