export const exampleFeedbackCategories = [
  {
    id: 'FB-001',
    name: 'Product Quality',
    topic: 'product quality',
    followUps: [
      'Which product are you referring to?',
      'How long have you been using it?',
      'What specifically could be improved?',
    ],
  },
  {
    id: 'FB-002',
    name: 'Customer Service',
    topic: 'customer service',
    followUps: [
      'Was this an in-store or phone experience?',
      'When did this interaction happen?',
      'What would have made it better?',
    ],
  },
  {
    id: 'FB-003',
    name: 'Pricing and Billing',
    topic: 'pricing and billing',
    followUps: [
      'Which charge or plan are you referring to?',
      'Do you feel the pricing is fair for what you receive?',
      'What pricing changes would you suggest?',
    ],
  },
  {
    id: 'FB-004',
    name: 'App and Website',
    topic: 'app and website',
    followUps: [
      'Were you using the mobile app or website?',
      'What were you trying to do when you ran into the issue?',
      'How would you improve the experience?',
    ],
  },
  {
    id: 'FB-005',
    name: 'General Suggestion',
    topic: 'general suggestion',
    followUps: [
      'What area of service does this relate to?',
      'How would this change improve your experience?',
    ],
  },
];

export const exampleFeedbackSummaries = [
  {
    sessionId: 'SES-0001',
    category: 'Product Quality',
    sentiment: 'negative',
    summary:
      'Customer reported frequent dropped calls in the downtown area over the past two weeks.',
  },
  {
    sessionId: 'SES-0002',
    category: 'Customer Service',
    sentiment: 'positive',
    summary:
      'Customer praised the support agent who helped resolve a billing dispute quickly.',
  },
];
