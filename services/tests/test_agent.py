"""
Comprehensive test suite for the RA-Lab FastAPI Coding Agent.

Covers:
  • Unit tests  — parse_edits, GeminiAgent helpers, models
  • Integration — every FastAPI endpoint
  • Edge cases  — validation, error handling
  • Node bridge — proxy endpoints

Run:  pytest tests/ -v --tb=short
"""
from __future__ import annotations

import pytest
import re
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient

# ── bootstrap ──────────────────────────────────────────────────────
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
from agent import parse_edits, GeminiAgent
from models import (
    AgentRequest,
    AgentResponse,
    SuggestedEdit,
    ChatMessage,
    ChatRequest,
    ApplyEditRequest,
    HealthResponse,
    AgentMode,
)
from prompts import AGENT_SYSTEM_PROMPT, MODE_PROMPTS

client = TestClient(app)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. UNIT TESTS — parse_edits
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestParseEdits:
    def test_no_edits(self):
        assert parse_edits("Just some plain text") == []

    def test_single_edit(self):
        text = (
            "Here is a fix:\n"
            "<<<SUGGESTED_EDIT>>>\n"
            "<<<FIND>>>\n"
            "\\section{Intro}\n"
            "<<<REPLACE>>>\n"
            "\\section{Introduction}\n"
            "<<<END_EDIT>>>\n"
            "That should work."
        )
        edits = parse_edits(text)
        assert len(edits) == 1
        assert edits[0].find == "\\section{Intro}"
        assert edits[0].replace == "\\section{Introduction}"

    def test_multiple_edits(self):
        text = (
            "<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\nA\n<<<REPLACE>>>\nB\n<<<END_EDIT>>>\n"
            "Some text\n"
            "<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\nC\n<<<REPLACE>>>\nD\n<<<END_EDIT>>>\n"
        )
        edits = parse_edits(text)
        assert len(edits) == 2
        assert edits[0].find == "A"
        assert edits[0].replace == "B"
        assert edits[1].find == "C"
        assert edits[1].replace == "D"

    def test_multiline_edit(self):
        text = (
            "<<<SUGGESTED_EDIT>>>\n"
            "<<<FIND>>>\n"
            "line1\nline2\nline3\n"
            "<<<REPLACE>>>\n"
            "new1\nnew2\n"
            "<<<END_EDIT>>>"
        )
        edits = parse_edits(text)
        assert len(edits) == 1
        assert "line1\nline2\nline3" in edits[0].find
        assert "new1\nnew2" in edits[0].replace

    def test_empty_replace(self):
        text = (
            "<<<SUGGESTED_EDIT>>>\n"
            "<<<FIND>>>\n"
            "delete me\n"
            "<<<REPLACE>>>\n"
            "\n"
            "<<<END_EDIT>>>"
        )
        edits = parse_edits(text)
        assert len(edits) == 1
        assert edits[0].find == "delete me"

    def test_empty_string(self):
        assert parse_edits("") == []

    def test_malformed_block_ignored(self):
        text = "<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\nno end block"
        assert parse_edits(text) == []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. UNIT TESTS — Pydantic Models
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestModels:
    def test_agent_request_minimal(self):
        r = AgentRequest(query="hello")
        assert r.query == "hello"
        assert r.code is None
        assert r.filename == "document.tex"

    def test_agent_request_full(self):
        r = AgentRequest(query="q", code="c", logs="l", filename="f.tex")
        assert r.code == "c"

    def test_agent_request_empty_query_rejected(self):
        with pytest.raises(Exception):
            AgentRequest(query="")

    def test_agent_response(self):
        r = AgentResponse(
            success=True,
            response="hi",
            edits=[SuggestedEdit(find="a", replace="b")],
            model="m",
            mode="chat",
        )
        assert len(r.edits) == 1

    def test_chat_message_invalid_role(self):
        with pytest.raises(Exception):
            ChatMessage(role="invalid", content="hi")

    def test_chat_request(self):
        cr = ChatRequest(
            messages=[ChatMessage(role="user", content="hi")],
            code="code",
        )
        assert len(cr.messages) == 1

    def test_apply_edit_request(self):
        r = ApplyEditRequest(find="a", replace="b")
        assert r.filename == "document.tex"

    def test_health_response(self):
        r = HealthResponse(service="s", version="v")
        assert r.status == "healthy"

    def test_agent_mode_enum(self):
        assert AgentMode.generate == "generate"
        assert AgentMode.fix == "fix"
        assert AgentMode.chat == "chat"

    def test_suggested_edit_model(self):
        e = SuggestedEdit(find="x", replace="y")
        assert e.find == "x" and e.replace == "y"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. UNIT TESTS — Prompts
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestPrompts:
    def test_system_prompt_nonempty(self):
        assert len(AGENT_SYSTEM_PROMPT) > 100

    def test_mode_prompts_keys(self):
        expected = {"generate", "fix", "refactor", "explain", "complete", "chat"}
        assert set(MODE_PROMPTS.keys()) == expected

    def test_all_mode_prompts_are_strings(self):
        for k, v in MODE_PROMPTS.items():
            assert isinstance(v, str), f"MODE_PROMPTS[{k}] is not a string"

    def test_system_prompt_mentions_edit_format(self):
        assert "<<<SUGGESTED_EDIT>>>" in AGENT_SYSTEM_PROMPT


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. INTEGRATION TESTS — Health
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestHealth:
    def test_health_endpoint(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ralab-agent"
        assert data["version"] == "1.0.0"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. INTEGRATION TESTS — Agent single-turn endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOCK_GEMINI_RESPONSE = {
    "candidates": [
        {
            "content": {
                "parts": [
                    {
                        "text": (
                            "Here is the fix:\n"
                            "<<<SUGGESTED_EDIT>>>\n"
                            "<<<FIND>>>\n"
                            "\\section{Intro}\n"
                            "<<<REPLACE>>>\n"
                            "\\section{Introduction}\n"
                            "<<<END_EDIT>>>\n"
                        )
                    }
                ]
            },
            "finishReason": "STOP",
        }
    ]
}

MOCK_GEMINI_PLAIN = {
    "candidates": [
        {
            "content": {
                "parts": [{"text": "LaTeX is a typesetting system."}]
            },
            "finishReason": "STOP",
        }
    ]
}


def _mock_post_edits(*args, **kwargs):
    """Mock httpx post that returns a response with edit blocks."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = MOCK_GEMINI_RESPONSE
    return mock_resp


def _mock_post_plain(*args, **kwargs):
    """Mock httpx post that returns a plain text response."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = MOCK_GEMINI_PLAIN
    return mock_resp


def _mock_post_error(*args, **kwargs):
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.text = "Rate limited"
    return mock_resp


class TestAgentGenerate:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_generate_success(self, mock_call):
        mock_call.return_value = "```latex\n\\documentclass{article}\n```"
        resp = client.post(
            "/api/agent/generate",
            json={"query": "Create a simple article"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["mode"] == "generate"
        assert len(data["response"]) > 0

    def test_generate_missing_query(self):
        resp = client.post("/api/agent/generate", json={})
        assert resp.status_code == 422  # Pydantic validation


class TestAgentFix:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_fix_with_code_and_logs(self, mock_call):
        mock_call.return_value = (
            "<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\nbad\n<<<REPLACE>>>\ngood\n<<<END_EDIT>>>"
        )
        resp = client.post(
            "/api/agent/fix",
            json={"query": "fix errors", "code": "bad", "logs": "error: bad"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"]
        assert data["mode"] == "fix"
        assert len(data["edits"]) == 1

    def test_fix_no_code_or_logs(self):
        resp = client.post(
            "/api/agent/fix",
            json={"query": "fix"},
        )
        assert resp.status_code == 400


class TestAgentRefactor:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_refactor_success(self, mock_call):
        mock_call.return_value = "No changes needed. The code looks good."
        resp = client.post(
            "/api/agent/refactor",
            json={"query": "improve", "code": "\\documentclass{article}"},
        )
        assert resp.status_code == 200
        assert resp.json()["mode"] == "refactor"

    def test_refactor_no_code(self):
        resp = client.post(
            "/api/agent/refactor",
            json={"query": "improve"},
        )
        assert resp.status_code == 400


class TestAgentExplain:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_explain_success(self, mock_call):
        mock_call.return_value = "This document creates an article."
        resp = client.post(
            "/api/agent/explain",
            json={"query": "explain", "code": "\\documentclass{article}"},
        )
        assert resp.status_code == 200
        assert resp.json()["mode"] == "explain"

    def test_explain_no_code(self):
        resp = client.post(
            "/api/agent/explain",
            json={"query": "explain"},
        )
        assert resp.status_code == 400


class TestAgentComplete:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_complete_success(self, mock_call):
        mock_call.return_value = (
            "<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\n\\begin{document}\n"
            "<<<REPLACE>>>\n\\begin{document}\n\\maketitle\n<<<END_EDIT>>>"
        )
        resp = client.post(
            "/api/agent/complete",
            json={"query": "complete", "code": "\\begin{document}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "complete"
        assert len(data["edits"]) >= 1

    def test_complete_no_code(self):
        resp = client.post(
            "/api/agent/complete",
            json={"query": "complete"},
        )
        assert resp.status_code == 400


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. INTEGRATION TESTS — Chat
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestAgentChat:
    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_chat_single_message(self, mock_call):
        mock_call.return_value = "Sure, I can help with LaTeX."
        resp = client.post(
            "/api/agent/chat",
            json={
                "messages": [{"role": "user", "content": "Help me with LaTeX"}],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"]
        assert data["mode"] == "chat"

    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_chat_multi_turn(self, mock_call):
        mock_call.return_value = "Use \\textbf{} for bold."
        resp = client.post(
            "/api/agent/chat",
            json={
                "messages": [
                    {"role": "user", "content": "How do I bold text?"},
                    {"role": "assistant", "content": "Use bold command."},
                    {"role": "user", "content": "Which command exactly?"},
                ],
            },
        )
        assert resp.status_code == 200

    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_chat_with_code(self, mock_call):
        mock_call.return_value = "The code looks fine."
        resp = client.post(
            "/api/agent/chat",
            json={
                "messages": [{"role": "user", "content": "review this"}],
                "code": "\\documentclass{article}",
            },
        )
        assert resp.status_code == 200

    def test_chat_empty_messages(self):
        resp = client.post(
            "/api/agent/chat",
            json={"messages": []},
        )
        assert resp.status_code == 422

    def test_chat_invalid_role(self):
        resp = client.post(
            "/api/agent/chat",
            json={"messages": [{"role": "invalid", "content": "hi"}]},
        )
        assert resp.status_code == 422


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. INTEGRATION TESTS — Apply Edit
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestApplyEdit:
    @patch("node_bridge.NodeBridge.patch_document", new_callable=AsyncMock)
    def test_apply_edit_success(self, mock_patch):
        mock_patch.return_value = {"success": True, "message": "Patched."}
        resp = client.post(
            "/api/agent/apply-edit",
            json={"find": "old", "replace": "new"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_apply_edit_empty_find(self):
        resp = client.post(
            "/api/agent/apply-edit",
            json={"find": "", "replace": "new"},
        )
        assert resp.status_code == 422


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. INTEGRATION TESTS — Document proxy
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestDocumentProxy:
    @patch("node_bridge.NodeBridge.load_document", new_callable=AsyncMock)
    def test_get_document_success(self, mock_load):
        mock_load.return_value = "\\documentclass{article}"
        resp = client.get("/api/agent/document?filename=test.tex")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"]
        assert data["content"] == "\\documentclass{article}"

    @patch("node_bridge.NodeBridge.load_document", new_callable=AsyncMock)
    def test_get_document_not_found(self, mock_load):
        mock_load.return_value = None
        resp = client.get("/api/agent/document?filename=nope.tex")
        assert resp.status_code == 404

    @patch("node_bridge.NodeBridge.load_document", new_callable=AsyncMock)
    def test_get_document_default_filename(self, mock_load):
        mock_load.return_value = "content"
        resp = client.get("/api/agent/document")
        assert resp.status_code == 200
        mock_load.assert_called_with("document.tex")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 9. INTEGRATION TESTS — Compile proxy
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestCompileProxy:
    @patch("node_bridge.NodeBridge.compile", new_callable=AsyncMock)
    def test_compile_success(self, mock_compile):
        mock_compile.return_value = {
            "success": True,
            "pdfGenerated": True,
            "logs": "ok",
        }
        resp = client.post(
            "/api/agent/compile",
            json={"query": "compile", "code": "\\documentclass{article}\\begin{document}x\\end{document}"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"]

    def test_compile_no_code(self):
        resp = client.post(
            "/api/agent/compile",
            json={"query": "compile"},
        )
        assert resp.status_code == 400


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 10. ERROR HANDLING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestErrorHandling:
    def test_unknown_route_404(self):
        resp = client.get("/api/agent/nonexistent")
        assert resp.status_code in (404, 405)

    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_gemini_502_error(self, mock_call):
        mock_call.side_effect = RuntimeError("Gemini API HTTP 429: Rate limited")
        resp = client.post(
            "/api/agent/generate",
            json={"query": "generate something"},
        )
        assert resp.status_code == 502

    def test_invalid_json_body(self):
        resp = client.post(
            "/api/agent/generate",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 422

    @patch("agent.GeminiAgent._call_gemini", new_callable=AsyncMock)
    def test_gemini_empty_response(self, mock_call):
        mock_call.side_effect = RuntimeError("Gemini returned an empty response text")
        resp = client.post(
            "/api/agent/generate",
            json={"query": "test"},
        )
        assert resp.status_code == 502


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 11. UNIT TESTS — GeminiAgent internal helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestGeminiAgentHelpers:
    def test_build_user_message_query_only(self):
        msg = GeminiAgent._build_user_message("hello", "chat", None, None)
        assert msg == "hello"

    def test_build_user_message_with_code(self):
        msg = GeminiAgent._build_user_message("q", "chat", "code", None)
        assert "```latex" in msg
        assert "code" in msg

    def test_build_user_message_with_logs(self):
        msg = GeminiAgent._build_user_message("q", "chat", None, "logs")
        assert "Compilation Logs" in msg

    def test_build_user_message_full(self):
        msg = GeminiAgent._build_user_message("q", "fix", "c", "l")
        assert "q" in msg and "c" in msg and "l" in msg

    def test_build_request_body_structure(self):
        body = GeminiAgent._build_request_body("sys", [{"role": "user", "text": "hi"}])
        assert "system_instruction" in body
        assert "contents" in body
        assert "generationConfig" in body
        assert "safetySettings" in body
        assert body["contents"][0]["role"] == "user"

    def test_build_request_body_model_role(self):
        body = GeminiAgent._build_request_body(
            "sys",
            [
                {"role": "user", "text": "q"},
                {"role": "model", "text": "a"},
            ],
        )
        assert body["contents"][1]["role"] == "model"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 12. UNIT TESTS — Config
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TestConfig:
    def test_config_values(self):
        from config import (
            SERVICE_NAME,
            SERVICE_VERSION,
            AGENT_PORT,
            GEMINI_MODEL,
            GEMINI_API_KEY,
            GENERATION_CONFIG,
            SAFETY_SETTINGS,
        )

        assert SERVICE_NAME == "ralab-agent"
        assert SERVICE_VERSION == "1.0.0"
        assert AGENT_PORT == 8000
        assert GEMINI_MODEL == "gemini-2.0-flash"
        assert len(GEMINI_API_KEY) > 10
        assert "temperature" in GENERATION_CONFIG
        assert len(SAFETY_SETTINGS) == 4
