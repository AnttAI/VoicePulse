import { tool } from '../types';

/**
 * Tool to initiate a feedback survey
 *
 * This tool can be used by the chat agent to start a feedback survey
 * when appropriate (e.g., user asks to give feedback, end of conversation, etc.)
 */
export const triggerFeedbackSurvey = tool({
  name: 'triggerFeedbackSurvey',
  description:
    'Initiates a feedback survey to collect user feedback. Use this when the user explicitly asks to give feedback, complete a survey, or at the end of a successful customer service interaction when appropriate.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description:
          'Brief reason for triggering the survey (e.g., "user requested", "end of interaction")',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    const { reason = 'triggered by agent' } = input;

    return {
      success: true,
      message: `Great! I'll start the feedback survey now. This should only take a few minutes.`,
      instruction: `You should now explain to the user that you'll be conducting a brief feedback survey, and start asking the survey questions one by one. Begin with the first question from the survey configuration.`,
      reason,
    };
  },
});
