"""
Feedback Survey MCP Server

This MCP server connects to any Google Sheet provided by an organizer.
The agent determines when to ask questions and handles all user interaction.

Google Sheet Structure (provided by organizer):
- Column A: Question ID (e.g., Q1, Q2, Q3...)
- Column B: Question Text
- Column C: Response (filled by this server)

How it works:
- Master questions are stored in the first N rows (Q1, Q2, Q3, etc.)
- Each new survey session appends new rows below the master questions
- Each response creates a new row: [question_id, question_text, response]
- No timestamps - just clean question and response data
- Multiple survey sessions = multiple rows per question ID

Tools provided:
- fetch_questions: Get master questions from the sheet
- save_response: Save a response (always appends new row)
- get_all_responses: Retrieve all responses from the sheet
- clear_all_responses: Clear all response rows (keeps master questions)
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


# ---------------- FETCH QUESTIONS ----------------
async def _fetch_questions_impl(sheet_name: str = "Sheet1") -> dict:
    """
    Fetch all master questions from the Google Sheet

    The agent uses this to get questions and then asks them conversationally.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary containing list of master questions with their IDs
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

        # Get unique questions (master question list)
        seen_ids = set()
        questions = []

        for i, row in enumerate(values, start=1):
            if len(row) >= 2:
                question_id = row[0]
                # Only include each question ID once (the first occurrence is the master)
                if question_id not in seen_ids:
                    seen_ids.add(question_id)
                    questions.append({
                        "row": i,
                        "question_id": question_id,
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


# ---------------- SAVE RESPONSE ----------------
async def _save_response_impl(
    question_id: str,
    response: str,
    sheet_name: str = "Sheet1"
) -> dict:
    """
    Save a user's response to a specific question in the Google Sheet

    Behavior:
    - ALWAYS appends a new row with [question_id, question_text, response]
    - Each survey session creates new rows (no overwriting)
    - No timestamps stored

    Args:
        question_id: The ID of the question (e.g., "Q1", "Q2")
        response: The user's response text to save
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary with success status and details
    """
    try:
        service = get_sheets_service()

        # Find the question text from the master questions
        range_name = f"{sheet_name}!A:B"
        result = service.spreadsheets().values().get(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=range_name
        ).execute()

        values = result.get('values', [])
        question_text = ""

        for row in values:
            if row and len(row) >= 2 and row[0] == question_id:
                question_text = row[1]
                break

        if not question_text:
            return {
                "status": "error",
                "message": f"Question ID '{question_id}' not found in sheet"
            }

        # Append a new row with [question_id, question_text, response]
        append_body = {'values': [[question_id, question_text, response]]}

        append_result = service.spreadsheets().values().append(
            spreadsheetId=GOOGLE_SHEET_ID,
            range=f"{sheet_name}!A:C",
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body=append_body
        ).execute()

        return {
            "status": "success",
            "question_id": question_id,
            "question_text": question_text,
            "response": response,
            "message": f"Appended new row with response for {question_id}"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to save response: {str(e)}"
        }


@mcp.tool
async def save_response(
    question_id: str,
    response: str,
    sheet_name: str = "Sheet1"
) -> dict:
    """MCP tool wrapper for save_response"""
    return await _save_response_impl(question_id, response, sheet_name)


# ---------------- GET ALL RESPONSES ----------------
async def _get_all_responses_impl(sheet_name: str = "Sheet1") -> dict:
    """
    Retrieve all questions and their responses from the Google Sheet

    The agent can use this to check progress or get all collected responses.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")

    Returns:
        Dictionary containing all questions with their responses
    """
    try:
        service = get_sheets_service()

        # Read all data from columns A to C
        range_name = f"{sheet_name}!A:C"
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

        responses = []
        for row in values:
            question_data = {
                "question_id": row[0] if len(row) > 0 else "",
                "question_text": row[1] if len(row) > 1 else "",
                "response": row[2] if len(row) > 2 else ""
            }
            responses.append(question_data)

        answered = sum(1 for r in responses if r["response"])

        return {
            "status": "success",
            "sheet_id": GOOGLE_SHEET_ID,
            "sheet_name": sheet_name,
            "total_questions": len(responses),
            "answered": answered,
            "unanswered": len(responses) - answered,
            "responses": responses
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


# ---------------- CLEAR ALL RESPONSES ----------------
async def _clear_all_responses_impl(sheet_name: str = "Sheet1", confirm: bool = False) -> dict:
    """
    Clear all response rows from the Google Sheet (keeps master questions intact)

    Useful for testing or resetting the sheet.

    Args:
        sheet_name: Name of the sheet tab (default: "Sheet1")
        confirm: Must be set to True to actually clear responses (safety feature)

    Returns:
        Dictionary with success status
    """
    if not confirm:
        return {
            "status": "error",
            "message": "Please set confirm=True to clear all responses. This action cannot be undone."
        }

    try:
        service = get_sheets_service()

        # Get all data
        range_name = f"{sheet_name}!A:C"
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

        # Find master questions (first occurrence of each question ID)
        seen_ids = set()
        master_row_count = 0

        for row in values:
            if len(row) > 0:
                question_id = row[0]
                if question_id not in seen_ids:
                    seen_ids.add(question_id)
                    master_row_count += 1

        # Clear all rows after the master questions
        if num_rows > master_row_count:
            clear_range = f"{sheet_name}!A{master_row_count + 1}:C{num_rows}"

            service.spreadsheets().values().clear(
                spreadsheetId=GOOGLE_SHEET_ID,
                range=clear_range
            ).execute()

            return {
                "status": "success",
                "message": f"Cleared {num_rows - master_row_count} response rows from the sheet",
                "rows_cleared": num_rows - master_row_count
            }
        else:
            return {
                "status": "success",
                "message": "No response rows to clear (only master questions present)",
                "rows_cleared": 0
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to clear responses: {str(e)}"
        }


@mcp.tool
async def clear_all_responses(sheet_name: str = "Sheet1", confirm: bool = False) -> dict:
    """MCP tool wrapper for clear_all_responses"""
    return await _clear_all_responses_impl(sheet_name, confirm)


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


@mcp.custom_route('/tools/save_response', methods=['POST'])
async def http_save_response(request: Request):
    """HTTP endpoint for save_response"""
    body = await request.json()
    result = await _save_response_impl(
        question_id=body.get('question_id'),
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


@mcp.custom_route('/tools/clear_all_responses', methods=['POST'])
async def http_clear_all_responses(request: Request):
    """HTTP endpoint for clear_all_responses"""
    body = await request.json()
    result = await _clear_all_responses_impl(
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
