/**
 * Survey Questions Configuration
 *
 * Customize your feedback survey questions here.
 * Each question can be:
 * - RATING: 1-10 scale
 * - MULTIPLE_CHOICE: Predefined options
 * - OPEN_ENDED: Free text response
 * - YES_NO: Simple yes/no question
 */

export interface SurveyQuestion {
  id: string;
  type: 'RATING' | 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'YES_NO';
  question: string;
  options?: string[]; // For MULTIPLE_CHOICE
  required?: boolean;
}

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: 'q1',
    type: 'RATING',
    question: 'On a scale of 1 to 10, how would you rate your overall experience?',
    required: true,
  },
  {
    id: 'q2',
    type: 'OPEN_ENDED',
    question: 'What did you like most about your experience ?',
    required: false,
  },
  {
    id: 'q3',
    type: 'OPEN_ENDED',
    question: 'What could we improve?',
    required: false,
  },
  {
    id: 'q4',
    type: 'YES_NO',
    question: 'Would you recommend our service to others?',
    required: true,
  },
  {
    id: 'q5',
    type: 'OPEN_ENDED',
    question: 'Do you have any additional comments or feedback?',
    required: false,
  },
];

/**
 * Instructions for customizing questions:
 *
 * 1. RATING questions:
 *    - Automatically expect 1-10 scale
 *    - Example: { id: 'q1', type: 'RATING', question: 'Rate our service (1-10)' }
 *
 * 2. MULTIPLE_CHOICE questions:
 *    - Provide options array
 *    - Example: {
 *        id: 'q2',
 *        type: 'MULTIPLE_CHOICE',
 *        question: 'How did you hear about us?',
 *        options: ['Social Media', 'Friend Referral', 'Advertisement', 'Other']
 *      }
 *
 * 3. OPEN_ENDED questions:
 *    - Accept any text response
 *    - Example: { id: 'q3', type: 'OPEN_ENDED', question: 'What improvements would you suggest?' }
 *
 * 4. YES_NO questions:
 *    - Automatically expect yes/no answer
 *    - Example: { id: 'q4', type: 'YES_NO', question: 'Would you use our service again?' }
 */
