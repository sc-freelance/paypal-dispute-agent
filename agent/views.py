"""POST /api/agent/chat/ : the chat box sends the conversation here and gets the agent's reply."""

import anthropic
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from agent.service import run_agent

MAX_HISTORY = 20  # only the last 20 messages are sent to Claude, to keep costs down


@api_view(["POST"])
def chat(request):
    messages = request.data.get("messages", [])
    cleaned = [
        {"role": m.get("role"), "content": str(m.get("content", ""))[:2000]}
        for m in messages
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and m.get("content")
    ][-MAX_HISTORY:]
    if not cleaned or cleaned[-1]["role"] != "user":
        return Response({"detail": "Send at least one user message."}, status=status.HTTP_400_BAD_REQUEST)
    # Claude requires the conversation to start with a user message.
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    try:
        return Response(run_agent(cleaned))
    except anthropic.APIError as e:
        return Response({"detail": f"The AI service had a problem: {type(e).__name__}"}, status=status.HTTP_502_BAD_GATEWAY)
