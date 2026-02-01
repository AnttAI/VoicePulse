import { tool } from '@openai/agents/realtime';

/**
 * MCP Tools for FeedbackBot
 *
 * These tools connect to the MCP server to fetch feedback questions
 * from and save responses to Google Sheets.
 */

const MCP_PROXY_URL = '/api/mcp';

/**
 * Tool: start_new_session
 *
 * Starts a new survey session - finds the next available column for responses.
 * Call this at the START of each new survey.
 */
export const startNewSession = tool({
    name: 'start_new_session',
    description:
        'Starts a new survey session. Call this at the very beginning of each survey to ensure responses go into the correct column.',
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
                    tool: 'start_new_session',
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
                sheet_name: result.sheet_name,
                session_number: result.session_number,
                session_column: result.session_column,
                message: result.message,
            };
        } catch (error) {
            console.error('Error starting new session:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});

/**
 * Tool: fetch_feedback_questions
 *
 * Fetches all feedback questions from Google Sheets via the MCP server.
 */
export const fetchFeedbackQuestions = tool({
    name: 'fetch_feedback_questions',
    description:
        'Fetches all feedback questions from the Google Sheet. Call this at the start of the feedback session to get the list of questions to ask.',
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
            console.error('Error fetching feedback questions from MCP server:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});

/**
 * Tool: save_feedback_response
 *
 * Saves a user's response to a specific feedback question in Google Sheets via the MCP server.
 */
export const saveFeedbackResponse = tool({
    name: 'save_feedback_response',
    description:
        'Saves a user\'s response to a specific feedback question in the Google Sheet. Call this immediately after the user answers each question.',
    parameters: {
        type: 'object',
        properties: {
            question_number: {
                type: 'string',
                description: 'The number of the question (e.g., "1", "2", "3")',
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
        required: ['question_number', 'response'],
        additionalProperties: false,
    },
    execute: async (input: any) => {
        try {
            const { question_number, response, sheet_name = 'Sheet1' } = input;

            // Call the MCP server via proxy
            const mcpResponse = await fetch(MCP_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tool: 'save_response',
                    parameters: { question_number, response, sheet_name },
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
                question_number: result.question_number,
                question_text: result.question_text,
                response: result.response,
                column: result.column,
                session_column: result.session_column,
                message: result.message,
            };
        } catch (error) {
            console.error('Error saving feedback response to MCP server:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});

/**
 * Tool: get_all_feedback_responses
 *
 * Retrieves all feedback questions and their responses from Google Sheets via the MCP server.
 */
export const getAllFeedbackResponses = tool({
    name: 'get_all_feedback_responses',
    description:
        'Retrieves all feedback questions and their responses from the Google Sheet. Use this to check progress or verify all responses were saved.',
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
            console.error('Error getting feedback responses from MCP server:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});
