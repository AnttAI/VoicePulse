"""
Feedback Survey MCP Server

This MCP server connects to any Google Sheet provided by an organizer.
The agent determines when to ask questions and handles all user interaction.

Google Sheet Structure (provided by organizer):
- Column A: Question Number (1, 2, 3...)
- Column B: Question Text
- Column C onwards: Responses from different survey sessions

How it works:
- Questions are FIXED in rows (never duplicated)
- Each new survey session adds responses in the NEXT AVAILABLE COLUMN
- Session 1 responses → Column C
- Session 2 responses → Column D
- Session 3 responses → Column E
- And so on...

Example:
| A | B                          | C       | D          | E       |
|---|----------------------------|---------|------------|---------|
| 1 | How would you rate us?     | 8       | 9          | 7       |
| 2 | What did you like?         | Fast    | Easy       | Great   |
| 3 | What could we improve?     | Nothing | More options| UI     |

Tools provided:
- fetch_questions: Get questions from the sheet
- save_response: Save a response (finds next available column)
- get_all_responses: Retrieve all responses from the sheet
- clear_session_responses: Clear a specific session's responses
- update_sheet_id: Change to a different sheet

Setup:
1. Get GOOGLE_SHEET_ID from your organizer
2. Set up Google Cloud Project and enable Sheets API
3. Download service account credentials.json
4. Set GOOGLE_SHEET_ID environment variable
"""

from fastmcp import FastMCP
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import os
from typing import List, Dict, Optional
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

mcp = FastMCP("Feedback Survey MCP Server")

# Configuration
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json")
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# Global service instance
sheets_service = None

# Session tracking - maps sheet_name to current session column
current_sessions = {}


def get_sheets_service():
    """Initialize and return Google Sheets service"""
    global sheets_service

    if sheets_service is not None:
        return sheets_service

    try:
        creds = Credentials.from_service_account_file(
            CREDENTIALS_FILE,
            scopes=SCOPES
        )
        sheets_service = build('sheets', 'v4', credentials=creds)
        return sheets_service
    except Exception as e:
        print(f"[ERROR] Failed to initialize Google Sheets service: {e}")
        raise


def column_number_to_letter(n):
    """Convert column number to letter (1='A', 2='B', etc.)"""
    string = ""
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        string = chr(65 + remainder) + string
    return string


# ---------------- FETCH QUESTIONS ----------------
async def _fetch_questions_impl(sheet_name: str = "Sheet1") -> dict:
    """
    Fetch all questions from the Google Sheet

    The agent uses this to get questions and then asks them conversationally.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary containing list of questions with their numbers
    """
    try:
        service = get_sheets_service()

        # Read questions from columns A and B
        range_name = f"{sheet_name}!A:B"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])

        if not values:
            return {
                "status": "error",
                "message": "No questions found in the sheet"
            }

        questions = []
        for i, row in enumerate(values, start=1):
            if len(row) >= 2:
                questions.append({
                    "row": i,
                    "question_number": row[0],
                    "question_text": row[1]
                })

        return {
            "status": "success",
            "sheet_id": GOOGLE_SHEET_ID,
            "sheet_name": sheet_name,
            "total_questions": len(questions),
            "questions": questions
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to fetch questions: {str(e)}"
        }


@mcp.tool
async def fetch_questions(sheet_name: str = "Sheet1") -> dict:
    """MCP tool wrapper for fetch_questions"""
    return await _fetch_questions_impl(sheet_name)


# ---------------- START NEW SESSION ----------------
async def _start_new_session_impl(sheet_name: str = "Sheet1") -> dict:
    """
    Start a new survey session - finds the next available column

    Call this at the start of each new survey to ensure responses
    go into the correct session column.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary with session information
    """
    try:
        service = get_sheets_service()

        # Get all data to find the next empty column
        range_name = f"{sheet_name}!A:ZZ"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])

        if not values:
            return {
                "status": "error",
                "message": "No data found in the sheet"
            }

        # Find the maximum column used (should be at least column B for questions)
        max_cols = max(len(row) for row in values) if values else 2

        # Next available column is max_cols + 1
        # If max_cols is 2 (just A and B), next session is column C (index 3)
        next_col_index = max_cols + 1
        next_col_letter = column_number_to_letter(next_col_index)
        session_number = next_col_index - 2  # Column C = Session 1, D = Session 2, etc.

        # Store the current session for this sheet
        current_sessions[sheet_name] = next_col_index

        return {
            "status": "success",
            "sheet_name": sheet_name,
            "session_number": session_number,
            "session_column": next_col_letter,
            "session_column_index": next_col_index,
            "message": f"Started new session {session_number} in column {next_col_letter}"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to start new session: {str(e)}"
        }


@mcp.tool
async def start_new_session(sheet_name: str = "Sheet1") -> dict:
    """MCP tool wrapper for start_new_session"""
    return await _start_new_session_impl(sheet_name)


# ---------------- SAVE RESPONSE ----------------
async def _save_response_impl(
    question_number: str,
    response: str,
    sheet_name: str = "Sheet1"
) -> dict:
    """
    Save a user's response to a specific question in the Google Sheet

    Behavior:
    - Finds the question by question_number in Column A
    - Uses the CURRENT SESSION COLUMN (set by start_new_session)
    - Writes the response to that specific column for this question

    Args:
        question_number: The number of the question (e.g., "1", "2", "3")
        response: The user's response text to save
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary with success status and details
    """
    try:
        service = get_sheets_service()

        # Check if a session has been started
        if sheet_name not in current_sessions:
            # Auto-start a new session if not already started
            session_result = await _start_new_session_impl(sheet_name)
            if session_result.get('status') == 'error':
                return session_result

        # Get the current session column for this sheet
        session_col_index = current_sessions[sheet_name]
        session_col_letter = column_number_to_letter(session_col_index)

        # Find the row for this question_number
        range_name = f"{sheet_name}!A:A"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])
        question_row = None

        for i, row in enumerate(values, start=1):
            if row and str(row[0]) == str(question_number):
                question_row = i
                break

        if question_row is None:
            return {
                "status": "error",
                "message": f"Question number '{question_number}' not found in sheet"
            }

        # Get the question text
        row_range = f"{sheet_name}!B{question_row}"
        row_result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=row_range
        ).execute()

        row_data = row_result.get('values', [[]])[0]
        question_text = row_data[0] if len(row_data) > 0 else ""

        # Write response to the CURRENT SESSION column
        cell_range = f"{sheet_name}!{session_col_letter}{question_row}"
        response_body = {
            'values': [[response]]
        }

        service.spreadsheets().values().update(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=cell_range,
            valueInputOption='RAW',
            body=response_body
        ).execute()

        return {
            "status": "success",
            "question_number": question_number,
            "question_text": question_text,
            "response": response,
            "column": session_col_letter,
            "session_column": session_col_index - 2,  # 1 = Session 1 (Column C), 2 = Session 2 (Column D), etc.
            "message": f"Response saved in column {session_col_letter} (Session {session_col_index - 2}) for Question {question_number}"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to save response: {str(e)}"
        }


@mcp.tool
async def save_response(
    question_number: str,
    response: str,
    sheet_name: str = "Sheet1"
) -> dict:
    """MCP tool wrapper for save_response"""
    return await _save_response_impl(question_number, response, sheet_name)


# ---------------- GET ALL RESPONSES ----------------
async def _get_all_responses_impl(sheet_name: str = "Sheet1") -> dict:
    """
    Retrieve all questions and their responses from the Google Sheet

    The agent can use this to check progress or get all collected responses.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary containing all questions with their responses across all sessions
    """
    try:
        service = get_sheets_service()

        # Read all data from the sheet
        range_name = f"{sheet_name}!A:ZZ"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])

        if not values:
            return {
                "status": "error",
                "message": "No data found in the sheet"
            }

        # Determine number of sessions (columns C onwards that have data)
        max_cols = max(len(row) for row in values) if values else 0
        num_sessions = max(0, max_cols - 2)  # Subtract columns A and B

        responses = []
        for row in values:
            question_data = {
                "question_number": row[0] if len(row) > 0 else "",
                "question_text": row[1] if len(row) > 1 else "",
                "responses": []
            }

            # Collect all session responses for this question
            for i in range(2, len(row)):
                if row[i]:  # Only include non-empty responses
                    question_data["responses"].append({
                        "session": i - 1,  # Session 1, 2, 3, etc.
                        "response": row[i]
                    })

            responses.append(question_data)

        return {
            "status": "success",
            "sheet_id": GOOGLE_SHEET_ID,
            "sheet_name": sheet_name,
            "total_questions": len(responses),
            "total_sessions": num_sessions,
            "questions": responses
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve responses: {str(e)}"
        }


@mcp.tool
async def get_all_responses(sheet_name: str = "Sheet1") -> dict:
    """MCP tool wrapper for get_all_responses"""
    return await _get_all_responses_impl(sheet_name)


# ---------------- CLEAR SESSION RESPONSES ----------------
async def _clear_session_responses_impl(session_number: int, sheet_name: str = "Sheet1", confirm: bool = False) -> dict:
    """
    Clear responses from a specific session column

    Args:
        session_number: Session number to clear (1 = Column C, 2 = Column D, etc.)
        sheet_name: Name of the sheet tab (default: "Sheet1")
        confirm: Must be set to True to actually clear responses (safety feature)

    Returns:
        Dictionary with success status
    """
    if not confirm:
        return {
            "status": "error",
            "message": "Please set confirm=True to clear session responses. This action cannot be undone."
        }

    try:
        service = get_sheets_service()

        # Calculate column letter (Session 1 = Column C = index 3)
        col_index = session_number + 2
        col_letter = column_number_to_letter(col_index)

        # Get number of rows
        range_name = f"{sheet_name}!A:A"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])
        num_rows = len(values)

        if num_rows == 0:
            return {
                "status": "error",
                "message": "No data found in sheet"
            }

        # Clear the entire column for that session
        clear_range = f"{sheet_name}!{col_letter}1:{col_letter}{num_rows}"

        service.spreadsheets().values().clear(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=clear_range
        ).execute()

        return {
            "status": "success",
            "message": f"Cleared session {session_number} responses (Column {col_letter})",
            "session_number": session_number,
            "column_cleared": col_letter
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to clear session responses: {str(e)}"
        }


@mcp.tool
async def clear_session_responses(session_number: int, sheet_name: str = "Sheet1", confirm: bool = False) -> dict:
    """MCP tool wrapper for clear_session_responses"""
    return await _clear_session_responses_impl(session_number, sheet_name, confirm)


# ---------------- UPDATE SHEET ID ----------------
async def _update_sheet_id_impl(new_sheet_id: str) -> dict:
    """
    Update the Google Sheet ID to use a different sheet

    Args:
        new_sheet_id: The new Google Sheet ID to use

    Returns:
        Dictionary with success status
    """
    global GOOGLE_SHEET_ID

    try:
        # Validate the new sheet ID by trying to access it
        service = get_sheets_service()

        # Try to get sheet metadata
        service.spreadsheets().get(spreadsheetId=new_sheet_id).execute()

        # If successful, update the global variable
        old_sheet_id = GOOGLE_SHEET_ID
        GOOGLE_SHEET_ID = new_sheet_id

        return {
            "status": "success",
            "message": "Sheet ID updated successfully",
            "old_sheet_id": old_sheet_id,
            "new_sheet_id": new_sheet_id
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to update sheet ID: {str(e)}"
        }


@mcp.tool
async def update_sheet_id(new_sheet_id: str) -> dict:
    """MCP tool wrapper for update_sheet_id"""
    return await _update_sheet_id_impl(new_sheet_id)


# ---------------- ADD HTTP ROUTES FOR DIRECT ACCESS ----------------
from starlette.responses import JSONResponse
from starlette.requests import Request


@mcp.custom_route('/tools/fetch_questions', methods=['POST'])
async def http_fetch_questions(request: Request):
    """HTTP endpoint for fetch_questions"""
    body = await request.json()
    result = await _fetch_questions_impl(body.get('sheet_name', 'Sheet1'))
    return JSONResponse(result)


@mcp.custom_route('/tools/start_new_session', methods=['POST'])
async def http_start_new_session(request: Request):
    """HTTP endpoint for start_new_session"""
    body = await request.json()
    result = await _start_new_session_impl(body.get('sheet_name', 'Sheet1'))
    return JSONResponse(result)


@mcp.custom_route('/tools/save_response', methods=['POST'])
async def http_save_response(request: Request):
    """HTTP endpoint for save_response"""
    body = await request.json()
    result = await _save_response_impl(
        question_number=body.get('question_number'),
        response=body.get('response'),
        sheet_name=body.get('sheet_name', 'Sheet1')
    )
    return JSONResponse(result)


@mcp.custom_route('/tools/get_all_responses', methods=['POST'])
async def http_get_all_responses(request: Request):
    """HTTP endpoint for get_all_responses"""
    body = await request.json()
    result = await _get_all_responses_impl(body.get('sheet_name', 'Sheet1'))
    return JSONResponse(result)


@mcp.custom_route('/tools/clear_session_responses', methods=['POST'])
async def http_clear_session_responses(request: Request):
    """HTTP endpoint for clear_session_responses"""
    body = await request.json()
    result = await _clear_session_responses_impl(
        session_number=body.get('session_number'),
        sheet_name=body.get('sheet_name', 'Sheet1'),
        confirm=body.get('confirm', False)
    )
    return JSONResponse(result)


@mcp.custom_route('/tools/update_sheet_id', methods=['POST'])
async def http_update_sheet_id(request: Request):
    """HTTP endpoint for update_sheet_id"""
    body = await request.json()
    result = await _update_sheet_id_impl(body.get('new_sheet_id'))
    return JSONResponse(result)


# ---------------- RUN MCP SERVER ----------------
if __name__ == "__main__":
    print("=" * 60)
    print("Feedback Survey MCP Server")
    print("=" * 60)

    if not GOOGLE_SHEET_ID:
        print("[WARNING] GOOGLE_SHEET_ID environment variable not set!")
        print("[INFO] You can set it later using the update_sheet_id tool")
    else:
        print(f"[INFO] Sheet ID: {GOOGLE_SHEET_ID}")

    print(f"[INFO] Credentials: {CREDENTIALS_FILE}")
    print(f"[INFO] Port: 8085")
    print(f"[INFO] HTTP Endpoints: /tools/fetch_questions, /tools/save_response, etc.")
    print("=" * 60)

    mcp.run("sse", host="0.0.0.0", port=8085)
