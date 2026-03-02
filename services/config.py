"""
RA-Lab FastAPI Coding Agent — Configuration
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (one level up from services/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# ── Gemini API ──────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_BASE_URL: str = (
    "https://generativelanguage.googleapis.com/v1beta/models"
)
GEMINI_ENDPOINT: str = (
    f"{GEMINI_BASE_URL}/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

# ── Node.js backend ────────────────────────────────────────────────
NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "http://localhost:3001")

# ── FastAPI service ─────────────────────────────────────────────────
SERVICE_NAME: str = "ralab-agent"
SERVICE_VERSION: str = "1.0.0"
AGENT_PORT: int = int(os.getenv("AGENT_PORT", "8000"))

# ── Generation config ──────────────────────────────────────────────
GENERATION_CONFIG = {
    "temperature": 0.25,
    "maxOutputTokens": 8192,
    "topP": 0.95,
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]
