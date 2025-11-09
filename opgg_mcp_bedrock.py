"""
OP.GG MCP Server Integration with AWS Bedrock
This module provides tools to query OP.GG data via their MCP server and use it with AWS Bedrock.
"""

import json
import subprocess
import boto3
from typing import Dict, Any, List, Optional

# AWS Bedrock Configuration
BEDROCK_REGION = "us-east-1"
MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"


class OPGGMCPClient:
    """Client for interacting with OP.GG MCP server"""

    def __init__(self):
        self.mcp_endpoint = "https://mcp-api.op.gg/mcp"
        self.bedrock_client = boto3.client(
            service_name='bedrock-runtime',
            region_name=BEDROCK_REGION
        )

    def call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call an OP.GG MCP tool using npx supergateway

        Args:
            tool_name: Name of the MCP tool (e.g., 'lol-summoner-search')
            arguments: Dictionary of arguments for the tool

        Returns:
            Dictionary containing the tool response
        """
        try:
            # Prepare the MCP request
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }

            # Call via npx supergateway
            cmd = [
                "npx", "-y", "supergateway",
                "--streamableHttp", self.mcp_endpoint,
                "--request", json.dumps(mcp_request)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                print(f"[OPGG MCP] Error calling tool: {result.stderr}")
                return {"error": result.stderr}

            response = json.loads(result.stdout)
            return response.get("result", {})

        except Exception as e:
            print(f"[OPGG MCP] Exception: {str(e)}")
            return {"error": str(e)}

    def get_summoner_info(self, summoner_name: str, tag_line: str, region: str = "na") -> Dict[str, Any]:
        """
        Search for summoner information using OP.GG MCP

        Args:
            summoner_name: Summoner's game name
            tag_line: Summoner's tag line (without #)
            region: Region code (na, euw, kr, etc.)

        Returns:
            Dictionary with summoner information
        """
        return self.call_mcp_tool("lol-summoner-search", {
            "summonerName": summoner_name,
            "tagLine": tag_line,
            "region": region
        })

    def get_champion_meta(self, champion_name: str, position: str = "TOP") -> Dict[str, Any]:
        """
        Get champion meta data including stats and performance

        Args:
            champion_name: Name of the champion
            position: Lane position (TOP, JUNGLE, MID, ADC, SUPPORT)

        Returns:
            Dictionary with champion meta data
        """
        return self.call_mcp_tool("lol-champion-meta-data", {
            "championName": champion_name,
            "position": position
        })

    def get_champion_counters(self, champion_name: str) -> Dict[str, Any]:
        """
        Get champion analysis including counters and matchups

        Args:
            champion_name: Name of the champion

        Returns:
            Dictionary with champion analysis data
        """
        return self.call_mcp_tool("lol-champion-analysis", {
            "championName": champion_name
        })

    def analyze_with_bedrock(self, opgg_data: Dict[str, Any], analysis_prompt: str) -> str:
        """
        Send OP.GG data to AWS Bedrock for analysis

        Args:
            opgg_data: Data retrieved from OP.GG MCP
            analysis_prompt: What you want Bedrock to analyze

        Returns:
            Bedrock's analysis as string
        """
        try:
            # Prepare the prompt with OP.GG data
            full_prompt = f"""You have access to the following OP.GG gaming data:

{json.dumps(opgg_data, indent=2)}

Task: {analysis_prompt}

Provide a detailed analysis based on the data above."""

            # Call Bedrock
            response = self.bedrock_client.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2000,
                    "messages": [
                        {
                            "role": "user",
                            "content": full_prompt
                        }
                    ]
                })
            )

            result = json.loads(response['body'].read())
            return result['content'][0]['text']

        except Exception as e:
            print(f"[BEDROCK] Error: {str(e)}")
            return f"Error analyzing data: {str(e)}"


class BedrockOPGGToolkit:
    """
    AWS Bedrock tool definitions for OP.GG MCP integration
    Allows Bedrock to call OP.GG tools directly via function calling
    """

    def __init__(self):
        self.mcp_client = OPGGMCPClient()
        self.bedrock_client = boto3.client(
            service_name='bedrock-runtime',
            region_name=BEDROCK_REGION
        )

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Get Bedrock-compatible tool definitions for OP.GG MCP tools
        """
        return [
            {
                "toolSpec": {
                    "name": "lol_summoner_search",
                    "description": "Search for League of Legends summoner information and stats from OP.GG",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "summonerName": {
                                    "type": "string",
                                    "description": "The summoner's game name"
                                },
                                "tagLine": {
                                    "type": "string",
                                    "description": "The summoner's tag line (without #)"
                                },
                                "region": {
                                    "type": "string",
                                    "description": "Region code (na, euw, kr, etc.)",
                                    "enum": ["na", "euw", "eune", "kr", "br", "lan", "las", "oce", "ru", "tr", "jp", "ph", "sg", "th", "tw", "vn"]
                                }
                            },
                            "required": ["summonerName", "tagLine", "region"]
                        }
                    }
                }
            },
            {
                "toolSpec": {
                    "name": "lol_champion_meta_data",
                    "description": "Get meta data for a specific League of Legends champion, including statistics and performance metrics",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "championName": {
                                    "type": "string",
                                    "description": "Name of the champion"
                                },
                                "position": {
                                    "type": "string",
                                    "description": "Lane position",
                                    "enum": ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]
                                }
                            },
                            "required": ["championName"]
                        }
                    }
                }
            },
            {
                "toolSpec": {
                    "name": "lol_champion_analysis",
                    "description": "Get champion analysis including counter matchups, ban/pick data, and performance insights",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "championName": {
                                    "type": "string",
                                    "description": "Name of the champion"
                                }
                            },
                            "required": ["championName"]
                        }
                    }
                }
            },
            {
                "toolSpec": {
                    "name": "lol_champion_leader_board",
                    "description": "Get ranking board data for League of Legends champions",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "position": {
                                    "type": "string",
                                    "description": "Lane position to filter by",
                                    "enum": ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]
                                }
                            },
                            "required": []
                        }
                    }
                }
            }
        ]

    def execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an OP.GG MCP tool and return results

        Args:
            tool_name: Name of the tool (Bedrock format with underscores)
            tool_input: Tool input parameters

        Returns:
            Tool execution result
        """
        # Convert Bedrock tool name to MCP tool name
        mcp_tool_name = tool_name.replace("_", "-")

        # Map input parameters if needed
        if tool_name == "lol_summoner_search":
            return self.mcp_client.get_summoner_info(
                tool_input["summonerName"],
                tool_input["tagLine"],
                tool_input.get("region", "na")
            )
        elif tool_name == "lol_champion_meta_data":
            return self.mcp_client.get_champion_meta(
                tool_input["championName"],
                tool_input.get("position", "TOP")
            )
        elif tool_name == "lol_champion_analysis":
            return self.mcp_client.get_champion_counters(
                tool_input["championName"]
            )
        else:
            return self.mcp_client.call_mcp_tool(mcp_tool_name, tool_input)

    def chat_with_tools(self, user_message: str, max_iterations: int = 5) -> str:
        """
        Have a conversation with Bedrock that can use OP.GG tools

        Args:
            user_message: The user's question/request
            max_iterations: Maximum number of tool-calling iterations

        Returns:
            Final response from Bedrock
        """
        messages = [{"role": "user", "content": user_message}]

        for iteration in range(max_iterations):
            print(f"\n[ITERATION {iteration + 1}]")

            # Call Bedrock with tool definitions
            response = self.bedrock_client.converse(
                modelId=MODEL_ID,
                messages=messages,
                toolConfig={
                    "tools": self.get_tool_definitions()
                }
            )

            # Get the response
            stop_reason = response['stopReason']

            if stop_reason == 'end_turn':
                # No more tool calls, return final answer
                final_message = response['output']['message']
                messages.append(final_message)
                return final_message['content'][0]['text']

            elif stop_reason == 'tool_use':
                # Bedrock wants to use a tool
                assistant_message = response['output']['message']
                messages.append(assistant_message)

                # Execute each tool call
                tool_results = []
                for content_block in assistant_message['content']:
                    if 'toolUse' in content_block:
                        tool_use = content_block['toolUse']
                        tool_name = tool_use['name']
                        tool_input = tool_use['input']
                        tool_use_id = tool_use['toolUseId']

                        print(f"[TOOL CALL] {tool_name} with input: {tool_input}")

                        # Execute the tool
                        result = self.execute_tool(tool_name, tool_input)

                        print(f"[TOOL RESULT] {json.dumps(result, indent=2)[:200]}...")

                        # Add tool result to messages
                        tool_results.append({
                            "toolResult": {
                                "toolUseId": tool_use_id,
                                "content": [
                                    {
                                        "json": result
                                    }
                                ]
                            }
                        })

                # Add tool results as a user message
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

            else:
                # Unexpected stop reason
                print(f"[UNEXPECTED] Stop reason: {stop_reason}")
                return "Unexpected stop reason"

        return "Max iterations reached"


# Example usage functions
def example_basic_query():
    """Example: Get summoner info and analyze with Bedrock"""
    client = OPGGMCPClient()

    # Get summoner data from OP.GG
    summoner_data = client.get_summoner_info("Faker", "T1", "kr")

    # Analyze with Bedrock
    analysis = client.analyze_with_bedrock(
        summoner_data,
        "Analyze this player's performance and provide insights on their strengths and weaknesses."
    )

    print(analysis)


def example_tool_calling():
    """Example: Use Bedrock with OP.GG tools via function calling"""
    toolkit = BedrockOPGGToolkit()

    # Ask Bedrock a question that requires OP.GG data
    response = toolkit.chat_with_tools(
        "What are the current meta champions for mid lane? Give me the top 3 and explain why they're strong."
    )

    print(response)


def example_roast_improvement():
    """Example: Use OP.GG meta data to improve roasts"""
    toolkit = BedrockOPGGToolkit()

    response = toolkit.chat_with_tools(
        """I need to roast a player who plays Yasuo with 42% winrate.
        Look up the current meta stats for Yasuo and tell me what their winrate should be,
        then craft a brutal but funny roast comparing their performance to the average."""
    )

    print(response)


if __name__ == "__main__":
    print("OP.GG MCP + AWS Bedrock Integration")
    print("=" * 50)

    # Run an example
    example_tool_calling()
