#!/usr/bin/env python3
"""
Test script for OP.GG MCP + AWS Bedrock integration
"""

from opgg_mcp_http import OPGGMCPHTTPClient, BedrockWithOPGG
import json


def test_opgg_connection():
    """Test basic connection to OP.GG MCP server"""
    print("\n" + "=" * 80)
    print("TEST 1: OP.GG MCP Server Connection")
    print("=" * 80)

    client = OPGGMCPHTTPClient()

    # List tools
    print("\nFetching available tools...")
    tools = client.list_tools()
    print(f"✅ Successfully connected! Found {len(tools)} tools")

    # Show some tools
    print("\nSample tools:")
    for tool in tools[:5]:
        print(f"  - {tool.get('name')}: {tool.get('description', '')[:80]}...")

    return True


def test_champion_meta():
    """Test fetching champion meta data"""
    print("\n" + "=" * 80)
    print("TEST 2: Champion Meta Data")
    print("=" * 80)

    client = OPGGMCPHTTPClient()

    # Get Yasuo meta
    print("\nFetching Yasuo meta data for MID lane...")
    yasuo_meta = client.get_champion_meta("YASUO", "MID")

    if yasuo_meta and 'error' not in yasuo_meta:
        print("✅ Successfully fetched Yasuo meta data!")
        print(f"\nData sample: {json.dumps(yasuo_meta, indent=2)[:500]}...")
    else:
        print(f"❌ Error: {yasuo_meta.get('error', 'Unknown error')}")

    return yasuo_meta


def test_champion_analysis():
    """Test fetching champion analysis with counters"""
    print("\n" + "=" * 80)
    print("TEST 3: Champion Analysis (Counters)")
    print("=" * 80)

    client = OPGGMCPHTTPClient()

    # Get Yasuo analysis
    print("\nFetching Yasuo analysis data...")
    yasuo_analysis = client.get_champion_analysis("YASUO")

    if yasuo_analysis and 'error' not in yasuo_analysis:
        print("✅ Successfully fetched Yasuo analysis!")
        print(f"\nData sample: {json.dumps(yasuo_analysis, indent=2)[:500]}...")
    else:
        print(f"❌ Error: {yasuo_analysis.get('error', 'Unknown error')}")

    return yasuo_analysis


def test_enhanced_roast():
    """Test enhanced roast generation with OP.GG + Bedrock"""
    print("\n" + "=" * 80)
    print("TEST 4: Enhanced Roast with OP.GG + Bedrock")
    print("=" * 80)

    # Sample player stats (terrible Yasuo player)
    player_stats = {
        'championName': 'YASUO',
        'position': 'MID',
        'winrate': 38.5,
        'games_played': 127,
        'avg_deaths': 9.2,
        'avg_kda': 1.3
    }

    print("\nPlayer Stats:")
    print(json.dumps(player_stats, indent=2))

    print("\nGenerating enhanced roast with OP.GG meta comparison...")
    print("(This will take ~10-15 seconds as it fetches OP.GG data and calls Bedrock)")

    try:
        bedrock_opgg = BedrockWithOPGG()
        roast = bedrock_opgg.generate_enhanced_roast(
            player_stats,
            "YASUO",
            "MID"
        )

        print("\n" + "=" * 80)
        print("✅ ENHANCED ROAST GENERATED:")
        print("=" * 80)
        print(roast)
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n❌ Error generating enhanced roast: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_meta_leaderboard():
    """Test champion leaderboard"""
    print("\n" + "=" * 80)
    print("TEST 5: Champion Leaderboard")
    print("=" * 80)

    client = OPGGMCPHTTPClient()

    print("\nFetching MID lane champion leaderboard...")
    leaderboard = client.get_champion_leaderboard("MID")

    if leaderboard and 'error' not in leaderboard:
        print("✅ Successfully fetched leaderboard!")
        print(f"\nData sample: {json.dumps(leaderboard, indent=2)[:500]}...")
    else:
        print(f"❌ Error: {leaderboard.get('error', 'Unknown error')}")

    return leaderboard


def run_all_tests():
    """Run all tests"""
    print("\n" + "🎮" * 40)
    print("OP.GG MCP + AWS BEDROCK INTEGRATION TEST SUITE")
    print("🎮" * 40)

    results = []

    # Test 1: Connection
    try:
        results.append(("Connection Test", test_opgg_connection()))
    except Exception as e:
        print(f"❌ Connection test failed: {str(e)}")
        results.append(("Connection Test", False))

    # Test 2: Champion Meta
    try:
        result = test_champion_meta()
        results.append(("Champion Meta", result is not None and 'error' not in result))
    except Exception as e:
        print(f"❌ Champion meta test failed: {str(e)}")
        results.append(("Champion Meta", False))

    # Test 3: Champion Analysis
    try:
        result = test_champion_analysis()
        results.append(("Champion Analysis", result is not None and 'error' not in result))
    except Exception as e:
        print(f"❌ Champion analysis test failed: {str(e)}")
        results.append(("Champion Analysis", False))

    # Test 4: Leaderboard
    try:
        result = test_meta_leaderboard()
        results.append(("Leaderboard", result is not None and 'error' not in result))
    except Exception as e:
        print(f"❌ Leaderboard test failed: {str(e)}")
        results.append(("Leaderboard", False))

    # Test 5: Enhanced Roast (requires AWS credentials)
    print("\n⚠️  Note: Enhanced roast test requires AWS credentials configured")
    user_input = input("Run enhanced roast test with Bedrock? (y/n): ")

    if user_input.lower() == 'y':
        try:
            results.append(("Enhanced Roast", test_enhanced_roast()))
        except Exception as e:
            print(f"❌ Enhanced roast test failed: {str(e)}")
            results.append(("Enhanced Roast", False))
    else:
        print("⏭️  Skipping enhanced roast test")
        results.append(("Enhanced Roast", None))

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    for test_name, result in results:
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
        else:
            status = "⏭️  SKIP"

        print(f"{test_name:.<50} {status}")

    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)

    print("=" * 80)
    print(f"Results: {passed} passed, {failed} failed, {skipped} skipped")
    print("=" * 80)


if __name__ == "__main__":
    run_all_tests()
