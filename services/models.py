"""
Pydantic models for request / response payloads.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────────
class AgentMode(str, Enum):
    """Supported coding-agent interaction modes."""
    generate = "generate"
    fix = "fix"
    refactor = "refactor"
    explain = "explain"
    complete = "complete"
    chat = "chat"


# ── Requests ────────────────────────────────────────────────────────
class AgentRequest(BaseModel):
    """Unified request payload for every agent endpoint."""
    query: str = Field(..., min_length=1, description="User instruction / question")
    code: Optional[str] = Field(None, description="Current LaTeX source code")
    logs: Optional[str] = Field(None, description="Tectonic compilation logs")
    filename: Optional[str] = Field("document.tex", description="Target document name")


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Multi-turn conversation request."""
    messages: list[ChatMessage] = Field(..., min_length=1)
    code: Optional[str] = None
    logs: Optional[str] = None
    filename: Optional[str] = "document.tex"


# ── Edits ───────────────────────────────────────────────────────────
class SuggestedEdit(BaseModel):
    """A single find-and-replace edit extracted from the agent response."""
    find: str
    replace: str


class ApplyEditRequest(BaseModel):
    """Request to apply a single edit to a document via the Node backend."""
    filename: str = "document.tex"
    find: str = Field(..., min_length=1)
    replace: str


# ── Responses ───────────────────────────────────────────────────────
class AgentResponse(BaseModel):
    """Standard agent response."""
    success: bool = True
    response: str
    edits: list[SuggestedEdit] = Field(default_factory=list)
    model: str = ""
    mode: str = ""


class ApplyEditResponse(BaseModel):
    success: bool
    message: str
    filename: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str
    version: str
