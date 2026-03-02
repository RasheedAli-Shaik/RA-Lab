"""
GeminiAgent — core agent logic.

Wraps the Gemini generative-language REST API and provides:
  • Single-turn request  (generate / fix / refactor / explain / complete)
  • Multi-turn chat
  • Parsing of <<<SUGGESTED_EDIT>>> blocks from the model output
"""
from __future__ import annotations

import re
from typing import Optional

import httpx

from config import (
    GEMINI_ENDPOINT,
    GEMINI_MODEL,
    GENERATION_CONFIG,
    SAFETY_SETTINGS,
)
from models import SuggestedEdit
from prompts import AGENT_SYSTEM_PROMPT, MODE_PROMPTS


# ── Edit-block parser ──────────────────────────────────────────────
_EDIT_RE = re.compile(
    r"<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\n?([\s\S]*?)<<<REPLACE>>>\n?([\s\S]*?)<<<END_EDIT>>>",
    re.MULTILINE,
)


def parse_edits(text: str) -> list[SuggestedEdit]:
    """Extract structured edits from a model response string."""
    edits: list[SuggestedEdit] = []
    for m in _EDIT_RE.finditer(text):
        find = m.group(1).rstrip("\n")
        replace = m.group(2).rstrip("\n")
        edits.append(SuggestedEdit(find=find, replace=replace))
    return edits


# ── Gemini Agent ───────────────────────────────────────────────────
class GeminiAgent:
    """Stateless helper that calls the Gemini REST API."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=60.0)

    # -- public -------------------------------------------------------

    async def run(
        self,
        *,
        query: str,
        mode: str = "chat",
        code: Optional[str] = None,
        logs: Optional[str] = None,
    ) -> tuple[str, list[SuggestedEdit]]:
        """Single-turn agent call.  Returns (response_text, edits)."""
        user_message = self._build_user_message(query, mode, code, logs)
        system = AGENT_SYSTEM_PROMPT
        mode_extra = MODE_PROMPTS.get(mode, "")
        if mode_extra:
            system = f"{system}\n\n{mode_extra}"

        body = self._build_request_body(system, [{"role": "user", "text": user_message}])
        text = await self._call_gemini(body)
        edits = parse_edits(text)
        return text, edits

    async def chat(
        self,
        *,
        messages: list[dict],
        code: Optional[str] = None,
        logs: Optional[str] = None,
    ) -> tuple[str, list[SuggestedEdit]]:
        """Multi-turn conversation.  ``messages`` is a list of
        ``{"role": "user"|"assistant", "content": "..."}`` dicts.
        """
        contents: list[dict] = []
        for msg in messages:
            role = msg["role"] if msg["role"] != "assistant" else "model"
            contents.append({"role": role, "text": msg["content"]})

        # Append context (code / logs) to the last user message
        if contents:
            last = contents[-1]
            extra_parts: list[str] = []
            if code:
                extra_parts.append(f"\n\n**LaTeX Source Code:**\n```latex\n{code}\n```")
            if logs:
                extra_parts.append(f"\n\n**Compilation Logs:**\n```\n{logs}\n```")
            if extra_parts:
                last["text"] += "".join(extra_parts)

        body = self._build_request_body(AGENT_SYSTEM_PROMPT, contents)
        text = await self._call_gemini(body)
        edits = parse_edits(text)
        return text, edits

    async def close(self) -> None:
        await self._client.aclose()

    # -- private ------------------------------------------------------

    @staticmethod
    def _build_user_message(
        query: str, mode: str, code: Optional[str], logs: Optional[str]
    ) -> str:
        parts: list[str] = [query]
        if logs:
            parts.append(f"\n**Compilation Logs:**\n```\n{logs}\n```")
        if code:
            parts.append(f"\n**LaTeX Source Code:**\n```latex\n{code}\n```")
        return "\n".join(parts)

    @staticmethod
    def _build_request_body(system: str, turns: list[dict]) -> dict:
        contents = []
        for t in turns:
            role = t["role"] if t["role"] in ("user", "model") else "user"
            contents.append({"role": role, "parts": [{"text": t["text"]}]})

        return {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": GENERATION_CONFIG,
            "safetySettings": SAFETY_SETTINGS,
        }

    async def _call_gemini(self, body: dict) -> str:
        """POST to Gemini and return the first candidate text."""
        resp = await self._client.post(
            GEMINI_ENDPOINT,
            json=body,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Gemini API HTTP {resp.status_code}: {resp.text[:500]}"
            )

        data = resp.json()
        candidate = (data.get("candidates") or [None])[0]
        if not candidate:
            block = data.get("promptFeedback", {}).get("blockReason", "unknown")
            raise RuntimeError(f"Gemini returned no candidates (blockReason={block})")

        text = (candidate.get("content", {}).get("parts") or [{}])[0].get("text", "")
        if not text:
            raise RuntimeError("Gemini returned an empty response text")

        return text
