# FeedbackBot Google Sheets Setup

This document explains how to set up the Google Sheet for FeedbackBot to collect customer feedback.

## Google Sheet Structure

Your Google Sheet should have the following structure:

| Column A      | Column B          | Column C  | Column D   |
|---------------|-------------------|-----------|------------|
| Question ID   | Question Text     | Response  | Timestamp  |
| Q1            | On a scale of 1 to 10, how would you rate your overall experience? | | |
| Q2            | What did you like most about your experience? | | |
| Q3            | What could we improve? | | |
| Q4            | Would you recommend our service to others? | | |
| Q5            | Do you have any additional comments or feedback? | | |

## Setup Steps

### 1. Create or Open Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet or open an existing one
3. Name it something like "Customer Feedback Questions"

### 2. Set Up the Columns

1. In cell A1, type: `Question ID`
2. In cell B1, type: `Question Text`
3. In cell C1, type: `Response`
4. In cell D1, type: `Timestamp`

### 3. Add Your Questions

Starting from row 2, add your questions:

- **Column A**: Question IDs (Q1, Q2, Q3, etc.)
- **Column B**: The actual question text

Example:
```
A2: Q1
B2: On a scale of 1 to 10, how would you rate your overall experience?

A3: Q2
B3: What did you like most about your experience?
```

### 4. Configure the MCP Server

1. Get your Google Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```

2. Update your `.env` file in `/home/jony/VoicePulse/mcp_servers/`:
   ```bash
   GOOGLE_SHEET_ID=your_sheet_id_here
   GOOGLE_CREDENTIALS_FILE=credentials.json
   ```

3. Ensure you have your Google Cloud credentials file (`credentials.json`) in the `mcp_servers/` directory.

### 5. Start the MCP Server

```bash
cd /home/jony/VoicePulse/mcp_servers
python mcp_server.py
```

The server will start on port 8085 and be ready to accept requests from the feedbackBot.

## How It Works

1. **Fetch Questions**: When a feedback session starts, feedbackBot calls `fetch_feedback_questions` to get all questions from your Google Sheet.

2. **Ask Questions**: The agent uses the supervisor to determine the best order and follow-up questions based on the conversation.

3. **Save Responses**: After each answer, feedbackBot calls `save_feedback_response` to save the answer to Column C and a timestamp to Column D.

4. **Verify**: At the end, the agent can call `get_all_feedback_responses` to confirm all responses were saved.

## Customizing Questions

You can customize the questions at any time by editing the Google Sheet:

- **Add new questions**: Just add new rows with Question IDs (Q6, Q7, etc.) and question text
- **Modify existing questions**: Edit the text in Column B
- **Remove questions**: Delete the row (but be careful not to break question numbering)

The feedbackBot will automatically use the latest questions on the next session.

## Notes

- **Column C (Response)** and **Column D (Timestamp)** will be filled automatically by the MCP server
- Keep your Question IDs unique (Q1, Q2, Q3, etc.)
- The agent will ask questions conversationally, not robotically
- The supervisor provides intelligent follow-ups based on user responses
