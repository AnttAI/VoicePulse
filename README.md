# VoicePulse

VoicePulse is a Next.js voice agent app with an embeddable widget and a hosted thank‑you page for voice surveys. It connects to the OpenAI Realtime API for live voice interactions.

## How to run

```bash
npm i
cp .env.sample .env
# add OPENAI_API_KEY in .env
npm run dev
```

App: http://localhost:3000  
Widget page: http://localhost:3000/widget  
Thank-you page: http://localhost:3000/thank-you/index.html
# VoicePulse

VoicePulse is a Next.js voice agent app with an embeddable widget and a hosted thank‑you page for voice surveys. It connects to the OpenAI Realtime API for live voice interactions.

## Demo steps

1) Open http://localhost:3000/thank-you/index.html  
2) Click “Share your feedback”  
3) When the agent connects, say: “I liked the event, but the audio setup could be improved.”  
4) The agent should respond and continue the conversation.
## Voice Feedback Survey Feature

This repository includes a complete voice-enabled feedback survey system that allows you to collect user feedback through natural voice or text conversations.

## Embeddable widget
### Quick Start

Option 1: Dedicated Survey Agent
### View Survey Results

```bash

Add this script to any static site to embed the widget. Replace `YOUR_DOMAIN` with your host.

```html
<script
  src="https://YOUR_DOMAIN/voicepulse-widget.js"
  data-host="https://YOUR_DOMAIN"
  data-agent-config="feedbackBot"
  data-title="Voice Pulse"
  data-position="bottom-right"
  data-width="320"
  data-height="380"
  data-button-label="Share your feedback"
></script>
```

### Inline mode (used by the thank-you page)

Set `data-inline="true"` to render the launcher inside your page instead of the bottom corner.

```html
<script
  src="https://YOUR_DOMAIN/voicepulse-widget.js"
  data-host="https://YOUR_DOMAIN"
  data-inline="true"
  data-agent-config="feedbackBot"
  data-title="Voice Pulse"
  data-width="320"
  data-height="380"
  data-button-label="Share your feedback"
></script>
```

## Widget behavior

- Opens `/widget` in an iframe.
- Auto-connects when opened, auto-disconnects when closed.
- Uses `/api/session` to obtain ephemeral keys.
- Mic button toggles mute/unmute.
- Status dot indicates connection state.
### Customize Survey Questions

Edit `src/app/agentConfigs/feedbackSurvey/surveyQuestions.ts` to define your questions.

## Thank-you page
### Documentation

- Quick Start: `SURVEY_QUICK_START.md`
- Complete Guide: `FEEDBACK_SURVEY_GUIDE.md`
- Implementation Summary: `SURVEY_IMPLEMENTATION_SUMMARY.md`
### Features

- Voice and text input
- Automatic data validation and storage
- Multiple question types
- Easy customization
- JSON file export

## Other Info / Next Steps
- Agent sets are defined in `src/app/agentConfigs`. Add new agent configs to `src/app/agentConfigs/index.ts` to make them selectable in the UI.
- Each agentConfig can define instructions, tools, and toolLogic. By default tool calls return `True` unless you provide logic.
- See `src/app/agentConfigs/voiceAgentMetaprompt.txt` for a metaprompt to help create new agents.

The sample thank-you page lives at `public/thank-you/index.html` and can be hosted as a static page. It embeds the widget in inline mode and includes placeholder event copy.

<<<<<<< Updated upstream
## Configuration
=======
# Voice Feedback Survey Feature

This repository now includes a complete **voice-enabled feedback survey system** that allows you to collect user feedback through natural voice or text conversations.

## 🎯 Quick Start

### Option 1: Dedicated Survey Agent
1. Run `npm run dev`
2. Select **"feedbackSurvey"** from the Agent Scenario dropdown
3. Click "Connect"
4. The agent will guide you through the survey

### Option 2: Trigger from Chat
1. Run `npm run dev`
2. Select **"chatSupervisor"** from the Agent Scenario dropdown
3. Say or type: **"I'd like to give feedback"**
4. The agent will start the survey

## 📊 View Survey Results

```bash
node scripts/view-surveys.js
```

Survey responses are saved as JSON files in `survey-responses/` directory.

## 🎨 Customize Survey Questions

Edit [`src/app/agentConfigs/feedbackSurvey/surveyQuestions.ts`](src/app/agentConfigs/feedbackSurvey/surveyQuestions.ts) to define your questions:

```typescript
export const surveyQuestions = [
  { id: 'q1', type: 'RATING', question: 'Rate your experience (1-10)' },
  { id: 'q2', type: 'OPEN_ENDED', question: 'What did you like?' },
  { id: 'q3', type: 'YES_NO', question: 'Would you recommend us?' },
  { id: 'q4', type: 'MULTIPLE_CHOICE', question: 'How did you hear about us?',
    options: ['Social Media', 'Friend', 'Ad', 'Other'] },
];
```

## 📖 Documentation

- **Quick Start**: [SURVEY_QUICK_START.md](SURVEY_QUICK_START.md)
- **Complete Guide**: [FEEDBACK_SURVEY_GUIDE.md](FEEDBACK_SURVEY_GUIDE.md)
- **Implementation Summary**: [SURVEY_IMPLEMENTATION_SUMMARY.md](SURVEY_IMPLEMENTATION_SUMMARY.md)

## ✨ Features

- 🎤 Voice OR text input (or both!)
- 💾 Automatic data validation and storage
- 📊 Multiple question types (rating, yes/no, multiple choice, open-ended)
- 🔧 Easy customization
- 📁 JSON file export

---

# Other Info
## Next Steps
- You can copy these templates to make your own multi-agent voice app! Once you make a new agent set config, add it to `src/app/agentConfigs/index.ts` and you should be able to select it in the UI in the "Scenario" dropdown menu.
- Each agentConfig can define instructions, tools, and toolLogic. By default all tool calls simply return `True`, unless you define the toolLogic, which will run your specific tool logic and return an object to the conversation (e.g. for retrieved RAG context).
- If you want help creating your own prompt using the conventions shown in customerServiceRetail, including defining a state machine, we've included a metaprompt [here](src/app/agentConfigs/voiceAgentMetaprompt.txt), or you can use our [Voice Agent Metaprompter GPT](https://chatgpt.com/g/g-678865c9fb5c81918fa28699735dd08e-voice-agent-metaprompt-gpt)
>>>>>>> Stashed changes

Agent sets are defined in `src/app/agentConfigs`. The widget uses the `agentConfig` query string (e.g., `feedbackBot`, `chatSupervisor`, `customerServiceRetail`).

## Notes

- The main app (`/`) remains the full demo UI.
- The widget is intentionally compact and hides transcripts.

---

Forked from https://github.com/openai/openai-realtime-agents
