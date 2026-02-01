import { tool } from '../types';

/**
 * MCP Tools for Feedback Survey
 *
 * These tools connect to the MCP server running on port 8085 (survey_sheet_server.py)
 * via a Next.js API proxy to fetch questions from and save responses to Google Sheets.
 */

const MCP_PROXY_URL = '/api/mcp';

/**
 * Tool: fetch_questions
 *
 * Fetches all survey questions from Google Sheets via the MCP server.
 */
export const fetchQuestions = tool({
  name: 'fetch_questions',
  description:
    'Fetches all survey questions from the Google Sheet. Call this at the start of the survey to get the list of questions to ask.',
  parameters: {
    type: 'object',
    properties: {
      sheet_name: {
        type: 'string',
        description: 'Name of the sheet tab (default: "Sheet1")',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    try {
      const { sheet_name = 'Sheet1' } = input;

      // Call the MCP server via proxy
      const response = await fetch(MCP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'fetch_questions',
          parameters: { sheet_name },
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP proxy error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'error') {
        return {
          success: false,
          error: result.message,
        };
      }

      return {
        success: true,
        sheet_id: result.sheet_id,
        sheet_name: result.sheet_name,
        total_questions: result.total_questions,
        questions: result.questions,
      };
    } catch (error) {
      console.error('Error fetching questions from MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: save_response
 *
 * Saves a user's response to a specific question in Google Sheets via the MCP server.
 */
export const saveResponse = tool({
  name: 'save_response',
  description:
    'Saves a user\'s response to a specific survey question in the Google Sheet. Call this immediately after the user answers each question.',
  parameters: {
    type: 'object',
    properties: {
      question_id: {
        type: 'string',
        description: 'The ID of the question (e.g., "Q1", "Q2")',
      },
      response: {
        type: 'string',
        description: 'The user\'s response to save',
      },
      sheet_name: {
        type: 'string',
        description: 'Name of the sheet tab (default: "Sheet1")',
      },
    },
    required: ['question_id', 'response'],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    try {
      const { question_id, response, sheet_name = 'Sheet1' } = input;

      // Call the MCP server via proxy
      const mcpResponse = await fetch(MCP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'save_response',
          parameters: { question_id, response, sheet_name },
        }),
      });

      if (!mcpResponse.ok) {
        throw new Error(`MCP proxy error: ${mcpResponse.statusText}`);
      }

      const result = await mcpResponse.json();

      if (result.status === 'error') {
        return {
          success: false,
          error: result.message,
        };
      }

      return {
        success: true,
        question_id: result.question_id,
        row: result.row,
        response: result.response,
        timestamp: result.timestamp,
        message: result.message,
      };
    } catch (error) {
      console.error('Error saving response to MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: get_all_responses
 *
 * Retrieves all questions and their responses from Google Sheets via the MCP server.
 */
export const getAllResponses = tool({
  name: 'get_all_responses',
  description:
    'Retrieves all survey questions and their responses from the Google Sheet. Use this to check progress or verify all responses were saved.',
  parameters: {
    type: 'object',
    properties: {
      sheet_name: {
        type: 'string',
        description: 'Name of the sheet tab (default: "Sheet1")',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    try {
      const { sheet_name = 'Sheet1' } = input;

      // Call the MCP server via proxy
      const response = await fetch(MCP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_all_responses',
          parameters: { sheet_name },
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP proxy error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'error') {
        return {
          success: false,
          error: result.message,
        };
      }

      return {
        success: true,
        sheet_id: result.sheet_id,
        sheet_name: result.sheet_name,
        total_questions: result.total_questions,
        answered: result.answered,
        unanswered: result.unanswered,
        responses: result.responses,
      };
    } catch (error) {
      console.error('Error getting responses from MCP server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
