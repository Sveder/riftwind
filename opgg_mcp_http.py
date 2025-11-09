"""
Simplified OP.GG MCP Integration using HTTP requests
This module provides direct HTTP access to OP.GG MCP server
"""

import json
import requests
import boto3
from typing import Dict, Any, List, Optional

# AWS Bedrock Configuration
BEDROCK_REGION = "us-east-1"
MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"


class OPGGMCPHTTPClient:
    """HTTP client for OP.GG MCP server"""

    def __init__(self):
        self.mcp_endpoint = "https://mcp-api.op.gg/mcp"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call an OP.GG MCP tool via HTTP

        Args:
            tool_name: Name of the MCP tool
            arguments: Tool arguments

        Returns:
            Tool response
        """
        try:
            # MCP protocol request
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }

            print(f"[OPGG MCP] Calling {tool_name} with {arguments}")

            response = self.session.post(
                self.mcp_endpoint,
                json=payload,
                timeout=30
            )

            response.raise_for_status()
            result = response.json()

            if "error" in result:
                print(f"[OPGG MCP] Error: {result['error']}")
                return {"error": result["error"]}

            return result.get("result", {})

        except requests.exceptions.RequestException as e:
            print(f"[OPGG MCP] HTTP Error: {str(e)}")
            return {"error": str(e)}
        except Exception as e:
            print(f"[OPGG MCP] Exception: {str(e)}")
            return {"error": str(e)}

    def list_tools(self) -> List[Dict[str, Any]]:
        """List all available tools"""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list"
            }

            response = self.session.post(self.mcp_endpoint, json=payload, timeout=10)
            response.raise_for_status()
            result = response.json()

            return result.get("result", {}).get("tools", [])

        except Exception as e:
            print(f"[OPGG MCP] Error listing tools: {str(e)}")
            return []

    # Convenience methods for specific tools
    def get_summoner_info(self, game_name: str, tag_line: str, region: str = "kr") -> Dict[str, Any]:
        """Search for summoner information"""
        return self.call_tool("lol_get_summoner_profile", {
            "game_name": game_name,
            "tag_line": tag_line,
            "region": region.upper()
        })

    def get_champion_meta(self, champion_name: str, position: str = "MID", game_mode: str = "RANKED", region: str = "KR") -> Dict[str, Any]:
        """Get champion analysis/meta data"""
        args = {
            "champion": champion_name.upper(),
            "game_mode": game_mode,
            "region": region.upper(),
            "position": position.upper()
        }
        return self.call_tool("lol_get_champion_analysis", args)

    def get_champion_analysis(self, champion_name: str, position: str = "MID", game_mode: str = "RANKED", region: str = "KR") -> Dict[str, Any]:
        """Get champion analysis including counters"""
        return self.call_tool("lol_get_champion_analysis", {
            "champion": champion_name.upper(),
            "game_mode": game_mode,
            "region": region.upper(),
            "position": position.upper()
        })

    def get_champion_leaderboard(self, champion: str, region: str = "KR", position: Optional[str] = None, page: int = 1) -> Dict[str, Any]:
        """Get champion ranking leaderboard"""
        args = {
            "champion": champion.upper(),
            "region": region.upper(),
            "page": page
        }
        if position:
            args["position"] = position.upper()
        return self.call_tool("lol_list_champion_leaderboard", args)

    def get_lane_meta_champions(self, region: str = "KR", lang: str = "en_US") -> Dict[str, Any]:
        """Get meta champions for each lane"""
        return self.call_tool("lol_list_lane_meta_champions", {
            "region": region.upper(),
            "lang": lang
        })


class BedrockWithOPGG:
    """AWS Bedrock integration with OP.GG data"""

    def __init__(self):
        self.opgg = OPGGMCPHTTPClient()
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=BEDROCK_REGION
        )

    def analyze_with_opgg_data(
        self,
        prompt: str,
        opgg_data: Optional[Dict[str, Any]] = None,
        fetch_data_callback=None
    ) -> str:
        """
        Send a prompt to Bedrock with optional OP.GG data

        Args:
            prompt: The analysis prompt
            opgg_data: Pre-fetched OP.GG data (optional)
            fetch_data_callback: Function to fetch OP.GG data if needed

        Returns:
            Bedrock's response
        """
        try:
            # Build the full prompt
            full_prompt = prompt

            if opgg_data:
                full_prompt = f"""You have access to the following OP.GG data:

```json
{json.dumps(opgg_data, indent=2)}
```

{prompt}"""
            elif fetch_data_callback:
                data = fetch_data_callback()
                full_prompt = f"""You have access to the following OP.GG data:

```json
{json.dumps(data, indent=2)}
```

{prompt}"""

            # Call Bedrock
            response = self.bedrock.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 3000,
                    "messages": [
                        {
                            "role": "user",
                            "content": full_prompt
                        }
                    ],
                    "temperature": 0.9
                })
            )

            result = json.loads(response['body'].read())
            return result['content'][0]['text']

        except Exception as e:
            print(f"[BEDROCK] Error: {str(e)}")
            return f"Error: {str(e)}"

    def generate_enhanced_roast(
        self,
        player_stats: Dict[str, Any],
        champion_name: str,
        position: str = "MID"
    ) -> str:
        """
        Generate an enhanced roast using OP.GG meta data

        Args:
            player_stats: Player's personal stats
            champion_name: Champion they play
            position: Lane position

        Returns:
            Enhanced roast text
        """
        # Fetch meta data for the champion
        meta_data = self.opgg.get_champion_meta(champion_name, position)
        analysis_data = self.opgg.get_champion_analysis(champion_name)

        # Build the roast prompt
        prompt = f"""You are a SAVAGE League of Legends roaster with access to OP.GG meta data.

PLAYER'S STATS:
```json
{json.dumps(player_stats, indent=2)}
```

CHAMPION META DATA (what GOOD players achieve):
```json
{json.dumps(meta_data, indent=2)}
```

CHAMPION ANALYSIS (counters, matchups):
```json
{json.dumps(analysis_data, indent=2)}
```

Generate a BRUTAL but HILARIOUS roast that:
1. Compares their winrate to the champion's average winrate
2. References the meta data to show how far below average they are
3. Mentions counters they keep losing to
4. Uses League of Legends memes and culture
5. Ends with actual advice disguised as an insult

Make it 3-4 sentences. Be savage but funny."""

        return self.analyze_with_opgg_data(prompt)

    def get_improvement_tips(
        self,
        champion_name: str,
        player_weaknesses: List[str]
    ) -> str:
        """
        Get constructive improvement tips based on meta data

        Args:
            champion_name: Champion to get tips for
            player_weaknesses: List of player's weaknesses

        Returns:
            Improvement tips
        """
        meta_data = self.opgg.get_champion_meta(champion_name)

        prompt = f"""Based on this champion's meta data and the player's weaknesses, provide specific, actionable improvement tips:

Player weaknesses: {', '.join(player_weaknesses)}

Give 3-5 specific tips that reference the meta builds, playstyle, and matchups."""

        return self.analyze_with_opgg_data(prompt, opgg_data=meta_data)


# Example usage and testing
def test_opgg_mcp():
    """Test the OP.GG MCP HTTP client"""
    print("Testing OP.GG MCP HTTP Client")
    print("=" * 60)

    client = OPGGMCPHTTPClient()

    # Test 1: List available tools
    print("\n1. Listing available tools...")
    tools = client.list_tools()
    print(f"Found {len(tools)} tools:")
    for tool in tools[:5]:  # Show first 5
        print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')[:80]}")

    # Test 2: Get champion meta
    print("\n2. Getting Yasuo meta data...")
    yasuo_meta = client.get_champion_meta("Yasuo", "MID")
    print(f"Result: {json.dumps(yasuo_meta, indent=2)[:300]}...")

    # Test 3: Get champion leaderboard
    print("\n3. Getting mid lane leaderboard...")
    leaderboard = client.get_champion_leaderboard("MID")
    print(f"Result: {json.dumps(leaderboard, indent=2)[:300]}...")


def test_bedrock_integration():
    """Test Bedrock integration with OP.GG"""
    print("\nTesting Bedrock + OP.GG Integration")
    print("=" * 60)

    bedrock_opgg = BedrockWithOPGG()

    # Example player stats
    player_stats = {
        "championName": "Yasuo",
        "position": "MID",
        "winrate": 42.0,
        "games_played": 87,
        "avg_deaths": 8.3,
        "avg_kda": 1.8
    }

    print("\nGenerating enhanced roast for Yasuo main...")
    roast = bedrock_opgg.generate_enhanced_roast(
        player_stats,
        "Yasuo",
        "MID"
    )

    print("\n" + "=" * 60)
    print("ROAST RESULT:")
    print("=" * 60)
    print(roast)
    print("=" * 60)


if __name__ == "__main__":
    # Run tests
    test_opgg_mcp()
    print("\n\n")
    test_bedrock_integration()
