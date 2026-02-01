import { tool } from '../types';
import { surveyQuestions } from './surveyQuestions';

/**
 * Tool: saveSurveyResponse
 *
 * Saves a single survey answer to the survey session.
 * This tool is called for each question answered by the user.
 */
export const saveSurveyResponse = tool({
  name: 'saveSurveyResponse',
  description:
    'Saves a user\'s response to a specific survey question. Call this after the user answers each question.',
  parameters: {
    type: 'object',
    properties: {
      questionId: {
        type: 'string',
        description: 'The ID of the question being answered (e.g., q1, q2)',
      },
      response: {
        type: 'string',
        description: 'The user\'s response to the question',
      },
    },
    required: ['questionId', 'response'],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    try {
      const { questionId, response } = input;

      // Validate that the question exists
      const question = surveyQuestions.find((q) => q.id === questionId);
      if (!question) {
        return {
          success: false,
          error: `Question ID "${questionId}" not found in survey configuration`,
        };
      }

      // Validate response based on question type
      let validatedResponse: string | number = response;
      if (question.type === 'RATING') {
        const rating = parseInt(response, 10);
        if (isNaN(rating) || rating < 1 || rating > 10) {
          return {
            success: false,
            error: 'Rating must be a number between 1 and 10',
          };
        }
        validatedResponse = rating;
      } else if (question.type === 'YES_NO') {
        const normalized = response.toLowerCase().trim();
        if (!['yes', 'no', 'y', 'n'].includes(normalized)) {
          return {
            success: false,
            error: 'Response must be yes or no',
          };
        }
        validatedResponse = normalized.startsWith('y') ? 'yes' : 'no';
      } else if (question.type === 'MULTIPLE_CHOICE' && question.options) {
        const isValidOption = question.options.some(
          (opt) => opt.toLowerCase() === response.toLowerCase()
        );
        if (!isValidOption) {
          return {
            success: false,
            error: `Response must be one of: ${question.options.join(', ')}`,
          };
        }
      }

      // Send to API endpoint for storage
      const apiResponse = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveResponse',
          questionId,
          response: validatedResponse,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to save response to server');
      }

      await apiResponse.json();

      return {
        success: true,
        questionId,
        response: validatedResponse,
        message: `Response saved for ${question.question}`,
      };
    } catch (error) {
      console.error('Error saving survey response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: completeSurvey
 *
 * Finalizes the survey and saves all responses to a JSON file.
 * This should be called after all required questions have been answered.
 */
export const completeSurvey = tool({
  name: 'completeSurvey',
  description:
    'Completes the feedback survey and saves all responses to a file. Call this after all required questions have been answered.',
  parameters: {
    type: 'object',
    properties: {
      additionalNotes: {
        type: 'string',
        description: 'Any additional notes or metadata about the survey session',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    try {
      const { additionalNotes } = input;

      // Send completion request to API endpoint
      const apiResponse = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'completeSurvey',
          additionalNotes,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to complete survey');
      }

      const result = await apiResponse.json();

      return {
        success: true,
        message: 'Survey completed successfully',
        savedTo: result.filename,
        totalResponses: result.totalResponses,
        timestamp: result.timestamp,
      };
    } catch (error) {
      console.error('Error completing survey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool: getSurveyProgress
 *
 * Returns the current progress of the survey (which questions have been answered).
 */
export const getSurveyProgress = tool({
  name: 'getSurveyProgress',
  description:
    'Gets the current survey progress, showing which questions have been answered and which are remaining.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => {
    try {
      const apiResponse = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getProgress',
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to get survey progress');
      }

      const result = await apiResponse.json();

      return {
        success: true,
        totalQuestions: result.totalQuestions,
        answeredQuestions: result.answeredQuestions,
        remainingQuestions: result.remainingQuestions,
        progress: result.progress,
      };
    } catch (error) {
      console.error('Error getting survey progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
