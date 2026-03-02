"""
NodeBridge — thin HTTP client that talks to the Node.js backend.

Used by the FastAPI agent to:
  • Read the current document source
  • Apply edits (PATCH)
  • Trigger compilation
  • Fetch compilation status
"""
from __future__ import annotations

from typing import Optional

import httpx

from config import NODE_BACKEND_URL


class NodeBridge:
    """Async helper for calling the Node.js RA-Lab backend."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=NODE_BACKEND_URL, timeout=120.0
        )

    # ── Document ────────────────────────────────────────────────────

    async def load_document(self, filename: str = "document.tex") -> Optional[str]:
        """Return document content or None if not found."""
        resp = await self._client.get(
            "/api/document/load", params={"filename": filename}
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        doc = data.get("document", {})
        return doc.get("content") if isinstance(doc, dict) else None

    async def save_document(self, filename: str, code: str) -> dict:
        resp = await self._client.post(
            "/api/document/save",
            json={"filename": filename, "code": code},
        )
        resp.raise_for_status()
        return resp.json()

    async def patch_document(self, filename: str, find: str, replace: str) -> dict:
        resp = await self._client.patch(
            "/api/document/patch",
            json={"filename": filename, "find": find, "replace": replace},
        )
        resp.raise_for_status()
        return resp.json()

    # ── Compilation ─────────────────────────────────────────────────

    async def compile(self, code: str) -> dict:
        resp = await self._client.post(
            "/api/compile", json={"code": code}
        )
        resp.raise_for_status()
        return resp.json()

    async def compile_status(self) -> dict:
        resp = await self._client.get("/api/compile/status")
        resp.raise_for_status()
        return resp.json()

    # ── Health ──────────────────────────────────────────────────────

    async def health(self) -> dict:
        resp = await self._client.get("/api/health")
        resp.raise_for_status()
        return resp.json()

    # ── Lifecycle ───────────────────────────────────────────────────

    async def close(self) -> None:
        await self._client.aclose()
