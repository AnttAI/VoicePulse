import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP Proxy API Route
 *
 * This acts as a bridge between the Next.js app and the MCP server running on port 8085.
 * Since the MCP server uses SSE protocol, we need to create a client that can communicate with it.
 *
 * For now, we'll call the tools directly via HTTP to the FastMCP server.
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8085';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, parameters } = body;

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'Missing tool name' },
        { status: 400 }
      );
    }

    // Map tool names to MCP server endpoints
    const toolEndpoints: Record<string, string> = {
      fetch_questions: '/tools/fetch_questions',
      save_response: '/tools/save_response',
      get_all_responses: '/tools/get_all_responses',
      clear_all_responses: '/tools/clear_all_responses',
      update_sheet_id: '/tools/update_sheet_id',
    };

    const endpoint = toolEndpoints[tool];
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: `Unknown tool: ${tool}` },
        { status: 400 }
      );
    }

    // Call the MCP server
    const mcpResponse = await fetch(`${MCP_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parameters || {}),
    });

    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.statusText}`);
    }

    const result = await mcpResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
