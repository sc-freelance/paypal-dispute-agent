"""The agent loop: send the chat to Claude, run any tools it asks for, repeat until it answers.

How tool calling works:
1. We send Claude the conversation plus the tool list.
2. If Claude wants a tool, its reply has a `tool_use` block (tool name + arguments) and
   stop_reason == "tool_use".
3. We run that tool in Python and send the result back as a `tool_result` block.
4. Claude reads the result and either calls another tool or writes its final text answer.
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

import anthropic

from agent.models import ToolCall
from agent.tools import HANDLERS, TOOL_SCHEMAS

PROMPT_FILE = Path(__file__).parent / "prompts" / "invoice_agent_v1.md"
MAX_STEPS = 5  # safety limit on tool calls per message, so a confused model can't loop forever


def run_agent(messages: list[dict[str, str]]) -> dict[str, Any]:
    """Answer the latest user message. `messages` is the chat so far: [{"role": "user"|"assistant", "content": "..."}].

    Returns {"reply": str, "tool_calls": [...], "run_id": str}.
    """
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-5-5")
    system_prompt = PROMPT_FILE.read_text(encoding="utf-8")
    run_id = str(uuid.uuid4())
    convo: list[dict[str, Any]] = [{"role": m["role"], "content": m["content"]} for m in messages]
    calls: list[ToolCall] = []

    for _ in range(MAX_STEPS):
        response = client.messages.create(
            model=model, max_tokens=1024, system=system_prompt, tools=TOOL_SCHEMAS, messages=convo
        )
        if response.stop_reason != "tool_use":
            reply = "".join(block.text for block in response.content if block.type == "text").strip()
            return {"reply": reply, "tool_calls": [_as_dict(c) for c in calls], "run_id": run_id}

        # Claude asked for one or more tools: run each and collect the results.
        convo.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            handler = HANDLERS.get(block.name)
            try:
                result = handler(**block.input) if handler else {"error": f"Unknown tool {block.name}"}
            except TypeError as e:  # Claude passed arguments the tool doesn't accept
                result = {"error": f"Bad arguments: {e}"}
            ok = "error" not in result
            calls.append(ToolCall.objects.create(run_id=run_id, tool_name=block.name, tool_input=block.input, result=result, ok=ok))
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result), "is_error": not ok})
        convo.append({"role": "user", "content": results})

    return {"reply": "I got stuck going round in circles there. Could you rephrase that?",
            "tool_calls": [_as_dict(c) for c in calls], "run_id": run_id}


def _as_dict(call: ToolCall) -> dict[str, Any]:
    return {"tool": call.tool_name, "input": call.tool_input, "result": call.result, "ok": call.ok}
