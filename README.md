# VoicePulse

VoicePulse is a Next.js voice agent app with an embeddable widget and a hosted thank-you page for voice surveys.

## Quick start

- Install: `npm i`
- Set `OPENAI_API_KEY` in `.env` (copy from `.env.sample` if needed)
- Run: `npm run dev`
- App: http://localhost:3000
- Widget page: http://localhost:3000/widget
- Thank-you page: http://localhost:3000/thank-you/

## Embeddable widget

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

## Thank-you page

The sample thank-you page lives at `public/thank-you/index.html` and can be hosted as a static page. It embeds the widget in inline mode and includes placeholder event copy.

## Configuration

Agent sets are defined in `src/app/agentConfigs`. The widget uses the `agentConfig` query string (e.g., `feedbackBot`, `chatSupervisor`, `customerServiceRetail`).

## Notes

- The main app (`/`) remains the full demo UI.
- The widget is intentionally compact and hides transcripts.

---

Forked from https://github.com/openai/openai-realtime-agents
