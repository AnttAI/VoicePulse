import { RealtimeItem, tool } from '@openai/agents/realtime';

import { exampleFeedbackCategories } from './sampleData';

export const feedbackSupervisorInstructions = `You are a senior feedback analysis supervisor agent for NewTelco. A junior agent (FeedbackBot) is conducting a structured feedback call with a NewTelco customer. Your job is to:

1. Analyze the conversation so far and the customer's latest response.
2. Categorize the feedback using the categorizeFeedback tool when the customer shares specific feedback.
3. Determine the best next question to ask — prioritizing areas not yet covered.
4. When the customer is done, use saveFeedbackSummary to record the session, then produce a clear verbal summary.

# Context
- FeedbackBot is proactively asking customers about their NewTelco experience.
- The feedback areas to cover are: overall satisfaction (1-10 rating), specific recent interactions, product/service quality (call clarity, data speeds, coverage), suggestions for improvement, and likelihood to recommend (NPS, 1-10).
- You should guide the junior agent to cover as many of these areas as possible without making the call feel too long.

# Instructions
- Always call categorizeFeedback when the customer shares a specific piece of feedback, so it gets properly tagged.
- Use the follow-up questions returned by categorizeFeedback to guide the conversation deeper when appropriate.
- Keep track of which feedback areas have been covered. Steer the conversation toward uncovered areas.
- If the customer shares a negative experience, your response should acknowledge it empathetically before moving on.
- When the customer signals they're done, call saveFeedbackSummary with the full session summary, then provide a closing message.
- Your message will be read verbatim by the junior agent, so write as if speaking directly to the customer.
- Be concise — this is a voice conversation. One question at a time.

# Response Format
Always respond with:
# Message
<your response to the customer>
`;

export const feedbackSupervisorTools = [
  {
    type: 'function',
    name: 'categorizeFeedback',
    description:
      'Categorize user feedback into a known category and retrieve relevant follow-up questions.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description:
            'The topic or keyword that best matches the user feedback.',
        },
      },
      required: ['topic'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'saveFeedbackSummary',
    description:
      'Save a structured summary of the feedback session once the user is done providing feedback.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'The primary feedback category.',
        },
        sentiment: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral', 'mixed'],
          description: 'Overall sentiment of the feedback.',
        },
        summary: {
          type: 'string',
          description: 'A concise summary of the feedback provided.',
        },
      },
      required: ['category', 'sentiment', 'summary'],
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

function getToolResponse(fName: string, args: any) {
  switch (fName) {
    case 'categorizeFeedback': {
      const topic = (args.topic ?? '').toLowerCase();
      const match = exampleFeedbackCategories.find((c) =>
        c.topic.includes(topic),
      );
      return match ?? exampleFeedbackCategories[exampleFeedbackCategories.length - 1];
    }
    case 'saveFeedbackSummary':
      return { success: true, message: 'Feedback saved. Thank the user.' };
    default:
      return { result: true };
  }
}

async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];
    const functionCalls = outputItems.filter(
      (item) => item.type === 'function_call',
    );

    if (functionCalls.length === 0) {
      const assistantMessages = outputItems.filter(
        (item) => item.type === 'message',
      );
      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');
      return finalText;
    }

    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = getToolResponse(fName, args);

      if (addBreadcrumb) {
        addBreadcrumb(`[feedbackSupervisor] function call: ${fName}`, args);
        addBreadcrumb(
          `[feedbackSupervisor] function call result: ${fName}`,
          toolRes,
        );
      }

      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromFeedbackSupervisor = tool({
  name: 'getNextResponseFromFeedbackSupervisor',
  description:
    'Asks the feedback supervisor agent for the next response. The supervisor can categorize feedback, suggest follow-ups, and summarize the session.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          "Key information from the user's most recent message. Provide concisely so the supervisor has full context.",
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)
      ?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] =
      (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4o-mini',
      input: [
        {
          type: 'message',
          role: 'system',
          content: feedbackSupervisorInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}

          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: feedbackSupervisorTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
