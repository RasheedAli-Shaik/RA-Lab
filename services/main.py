"""
RA-Lab FastAPI Coding Agent — Main Application

Endpoints:
  GET  /health                   → service health
  POST /api/agent/generate       → generate LaTeX from description
  POST /api/agent/fix            → fix compilation errors
  POST /api/agent/refactor       → refactor / improve code
  POST /api/agent/explain        → explain LaTeX code
  POST /api/agent/complete       → code completion
  POST /api/agent/chat           → multi-turn conversation
  POST /api/agent/apply-edit     → apply a single edit via Node backend
  GET  /api/agent/document       → fetch document from Node backend
  POST /api/agent/compile        → compile via Node backend
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import SERVICE_NAME, SERVICE_VERSION, AGENT_PORT, GEMINI_MODEL, GEMINI_API_KEY
from models import (
    AgentRequest,
    AgentResponse,
    ApplyEditRequest,
    ApplyEditResponse,
    ChatRequest,
    HealthResponse,
)
from agent import GeminiAgent
from node_bridge import NodeBridge


# ── Lifecycle ───────────────────────────────────────────────────────
_agent: GeminiAgent | None = None
_bridge: NodeBridge | None = None
_start_time: float = 0.0


def get_agent() -> GeminiAgent:
    """Lazy-init the agent (supports both lifespan and test contexts)."""
    global _agent
    if _agent is None:
        _agent = GeminiAgent()
    return _agent


def get_bridge() -> NodeBridge:
    """Lazy-init the bridge (supports both lifespan and test contexts)."""
    global _bridge
    if _bridge is None:
        _bridge = NodeBridge()
    return _bridge


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _agent, _bridge, _start_time
    _agent = GeminiAgent()
    _bridge = NodeBridge()
    _start_time = time.time()
    print(f"\n  RA-Lab Coding Agent v{SERVICE_VERSION} running on port {AGENT_PORT}\n")
    yield
    await _agent.close()
    await _bridge.close()


app = FastAPI(
    title="RA-Lab Coding Agent",
    version=SERVICE_VERSION,
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logger ──────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = int((time.time() - start) * 1000)
    print(
        f"[{time.strftime('%Y-%m-%dT%H:%M:%S')}] "
        f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)"
    )
    return response


# ── Global exception handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Mask Gemini API key from any error message
    msg = str(exc)
    if GEMINI_API_KEY:
        msg = msg.replace(GEMINI_API_KEY, "***")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"message": msg, "statusCode": 500}},
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ── Health ──────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        service=SERVICE_NAME,
        version=SERVICE_VERSION,
    )


# ── Single-turn agent endpoints ────────────────────────────────────
async def _agent_endpoint(req: AgentRequest, mode: str) -> AgentResponse:
    """Shared handler for generate / fix / refactor / explain / complete."""
    try:
        text, edits = await get_agent().run(
            query=req.query,
            mode=mode,
            code=req.code,
            logs=req.logs,
        )
        return AgentResponse(
            success=True,
            response=text,
            edits=edits,
            model=GEMINI_MODEL,
            mode=mode,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/agent/generate", response_model=AgentResponse)
async def agent_generate(req: AgentRequest):
    return await _agent_endpoint(req, "generate")


@app.post("/api/agent/fix", response_model=AgentResponse)
async def agent_fix(req: AgentRequest):
    if not req.code and not req.logs:
        raise HTTPException(
            status_code=400,
            detail="At least one of 'code' or 'logs' is required for fix mode.",
        )
    return await _agent_endpoint(req, "fix")


@app.post("/api/agent/refactor", response_model=AgentResponse)
async def agent_refactor(req: AgentRequest):
    if not req.code:
        raise HTTPException(
            status_code=400,
            detail="'code' is required for refactor mode.",
        )
    return await _agent_endpoint(req, "refactor")


@app.post("/api/agent/explain", response_model=AgentResponse)
async def agent_explain(req: AgentRequest):
    if not req.code:
        raise HTTPException(
            status_code=400,
            detail="'code' is required for explain mode.",
        )
    return await _agent_endpoint(req, "explain")


@app.post("/api/agent/complete", response_model=AgentResponse)
async def agent_complete(req: AgentRequest):
    if not req.code:
        raise HTTPException(
            status_code=400,
            detail="'code' is required for complete mode.",
        )
    return await _agent_endpoint(req, "complete")


# ── Multi-turn chat ─────────────────────────────────────────────────
@app.post("/api/agent/chat", response_model=AgentResponse)
async def agent_chat(req: ChatRequest):
    try:
        msgs = [{"role": m.role, "content": m.content} for m in req.messages]
        text, edits = await get_agent().chat(
            messages=msgs,
            code=req.code,
            logs=req.logs,
        )
        return AgentResponse(
            success=True,
            response=text,
            edits=edits,
            model=GEMINI_MODEL,
            mode="chat",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ── Apply edit via Node.js backend ──────────────────────────────────
@app.post("/api/agent/apply-edit", response_model=ApplyEditResponse)
async def apply_edit(req: ApplyEditRequest):
    try:
        result = await get_bridge().patch_document(
            filename=req.filename,
            find=req.find,
            replace=req.replace,
        )
        return ApplyEditResponse(
            success=result.get("success", False),
            message=result.get("message", ""),
            filename=req.filename,
        )
    except httpx.HTTPStatusError as exc:
        body = exc.response.json() if exc.response.headers.get("content-type", "").startswith("application/json") else {}
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=body.get("error", {}).get("message", str(exc)),
        )


# ── Proxy: fetch document from Node backend ────────────────────────
@app.get("/api/agent/document")
async def get_document(filename: str = "document.tex"):
    content = await get_bridge().load_document(filename)
    if content is None:
        raise HTTPException(status_code=404, detail=f'Document "{filename}" not found.')
    return {"success": True, "filename": filename, "content": content}


# ── Proxy: compile via Node backend ────────────────────────────────
@app.post("/api/agent/compile")
async def compile_document(req: AgentRequest):
    if not req.code:
        raise HTTPException(status_code=400, detail="'code' is required for compilation.")
    try:
        result = await get_bridge().compile(req.code)
        return result
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))


# ── Entrypoint ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=AGENT_PORT, reload=True)
