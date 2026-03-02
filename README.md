<p align="center">
  <img src="https://img.shields.io/badge/RA--Lab-LaTeX%20Workshop%20IDE-6C3FC5?style=for-the-badge&logo=latex&logoColor=white" alt="RA-Lab" />
</p>

<h1 align="center">🔬 RA-Lab</h1>

<p align="center">
  <strong>A modern, web-based LaTeX Workshop IDE with an AI-powered coding agent</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Gemini_2.0-Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Tectonic-Compiler-FF6F00?style=flat-square" alt="Tectonic" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <em>Write, compile, preview, and perfect LaTeX documents — all from your browser.<br/>
  A full-featured Overleaf alternative with an autonomous AI coding agent built in.</em>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [System Requirements](#-system-requirements)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🔭 Overview

**RA-Lab** is a complete, self-hosted LaTeX Workshop IDE that runs entirely in your browser. It combines a professional-grade code editor, real-time PDF compilation via the [Tectonic](https://tectonic-typesetting.github.io/) engine, and a powerful **Gemini 2.0 Flash** AI coding agent that can generate, fix, refactor, explain, and complete LaTeX documents autonomously.

The application follows a clean **three-tier microservice architecture**:

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 18 + Vite | Code editor, PDF viewer, AI panels |
| **Backend** | Node.js + Express | File management, LaTeX compilation, API proxy |
| **AI Service** | Python + FastAPI | Gemini-powered coding agent with 6 interaction modes |

---

## ✨ Key Features

### 🖊️ Professional LaTeX Editor
- **CodeMirror 6** editor with LaTeX syntax highlighting (stex mode)
- Dark theme (One Dark) optimized for long editing sessions
- Line numbers, bracket matching, active line highlighting
- Cursor position tracking in the status bar
- Keyboard shortcuts: `Ctrl+S` (Save), `Ctrl+Enter` (Compile)

### ⚡ Real-Time Compilation
- **Tectonic** compiler — a modern, self-contained LaTeX engine
- Automatic package downloading (no manual `tlmgr` needed)
- Structured error/warning parsing from compiler output
- Instant inline PDF preview after successful compilation
- Compilation status indicators with error/warning badges

### 📄 Inline PDF Preview
- Side-by-side editor and PDF viewer with resizable panels
- Cache-busted PDF reloading after each compilation
- Clean inline rendering via `<object>` tag

### 🤖 AI Coding Agent (6 Modes)
Powered by **Google Gemini 2.0 Flash** through a dedicated FastAPI service:

| Mode | Description |
|------|-------------|
| 💬 **Chat** | Multi-turn conversation with full context awareness |
| ✨ **Generate** | Create complete LaTeX documents from natural language descriptions |
| 🔧 **Fix** | Analyze compilation errors and auto-generate fixes |
| 🔄 **Refactor** | Improve code structure, readability, and best practices |
| 📖 **Explain** | Get detailed explanations of LaTeX code, section by section |
| 📝 **Complete** | Intelligent code completion based on document context |

### 🎯 Structured Code Edits
- AI responses include machine-parseable `<<<SUGGESTED_EDIT>>>` blocks
- **Accept / Reject** UI for each suggested edit with visual diff
- One-click application of edits directly to the editor
- Works in both the AI Helper and Agent panels

### 💾 Document Management
- Save, load, list, and delete `.tex` documents
- Find-and-replace patching API (used by the AI agent)
- Persistent workspace storage with automatic directory bootstrapping

### 🎨 Modern UI/UX
- **Dark IDE theme** with Tailwind CSS — designed to feel like VS Code
- **Resizable panels** (react-resizable-panels) for editor, PDF, and bottom panel
- **Three bottom tabs**: Compilation Log, AI Helper, Agent
- Toast notifications for all user actions
- Responsive status bar with cursor position, compilation status, file info

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│              (Vite dev server :5173)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Editor   │  │ PDF View │  │ AI Panel │              │
│  │(CodeMirror)│ │ (object) │  │(Agent/AI)│              │
│  └──────────┘  └──────────┘  └──────────┘              │
│            all /api/* requests proxied via Vite          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               Node.js / Express Backend                 │
│                    (port 3001)                           │
│                                                         │
│  /api/compile    → Tectonic compiler service             │
│  /api/document   → File CRUD + PDF serving               │
│  /api/agent/*    → Proxy to FastAPI ──────────┐          │
│  /api/health     → Health check               │          │
└───────────────────────────────────────────────┼─────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Coding Agent Service                │
│                    (port 8000)                           │
│                                                         │
│  POST /api/agent/generate   → LaTeX generation           │
│  POST /api/agent/fix        → Error fixing               │
│  POST /api/agent/refactor   → Code improvement           │
│  POST /api/agent/explain    → Code explanation           │
│  POST /api/agent/complete   → Code completion            │
│  POST /api/agent/chat       → Multi-turn conversation    │
│  POST /api/agent/apply-edit → Apply edit via Node        │
│  POST /api/agent/compile    → Compile via Node           │
│  GET  /api/agent/document   → Fetch doc via Node         │
│                                                         │
│              ┌──────────────────┐                        │
│              │  Google Gemini   │                        │
│              │  2.0 Flash API   │                        │
│              └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Design Principle:** The Node.js backend handles **no AI logic** — it focuses purely on file management, LaTeX compilation (via Tectonic), and proxying AI requests. All AI/Gemini functionality is encapsulated within the FastAPI service, ensuring clean separation of concerns and independent scalability.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 6.0 | Build tool & dev server |
| CodeMirror 6 | 4.23 | LaTeX code editor |
| Tailwind CSS | 3.4 | Utility-first styling |
| react-resizable-panels | 2.1 | Draggable panel layout |
| lucide-react | 0.468 | Icon library |
| react-hot-toast | 2.4 | Toast notifications |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥18.0 | Runtime |
| Express | 4.21 | HTTP framework |
| Tectonic | 0.15+ | LaTeX compiler |
| dotenv | 16.x | Environment variables |
| uuid | 11.0 | Unique temp directories |
| cors | 2.8 | Cross-origin support |

### AI Service
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | ≥3.10 | Runtime |
| FastAPI | 0.115 | Async web framework |
| Uvicorn | 0.34 | ASGI server |
| Pydantic | 2.10 | Request/response validation |
| httpx | 0.28 | Async HTTP client |
| python-dotenv | 1.0 | Environment variables |
| Google Gemini | 2.0 Flash | AI model |

---

## 📷 Screenshots

> *After cloning and running, navigate to `http://localhost:5173` to see the full IDE.*

**Main IDE View** — Editor (left), PDF Preview (right), Panels (bottom)

| Editor + PDF | AI Agent Panel | Compilation Log |
|:---:|:---:|:---:|
| LaTeX editor with syntax highlighting and live PDF preview | 6-mode AI coding agent with structured edit suggestions | Parsed compilation errors and warnings |

---

## 💻 System Requirements

| Requirement | Details |
|------------|---------|
| **Node.js** | v18.0.0 or higher ([download](https://nodejs.org/)) |
| **Python** | v3.10 or higher ([download](https://www.python.org/downloads/)) |
| **Tectonic** | v0.15+ LaTeX compiler ([install guide](https://tectonic-typesetting.github.io/en-US/install.html)) |
| **Git** | For cloning the repository |
| **Gemini API Key** | Free from [Google AI Studio](https://aistudio.google.com/apikey) |

### Installing Tectonic

<details>
<summary><strong>Windows</strong></summary>

```powershell
# Option 1: Download pre-built binary
Invoke-WebRequest -Uri "https://github.com/AziNou/tectonic_0.15.0_win10/raw/refs/heads/main/tectonic.exe" -OutFile tectonic.exe

# Option 2: Via Chocolatey
choco install tectonic

# Option 3: Via Scoop
scoop install tectonic
```

Place `tectonic.exe` in the project root directory.

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install tectonic
```

</details>

<details>
<summary><strong>Linux</strong></summary>

```bash
# Ubuntu/Debian
curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh

# Arch Linux
pacman -S tectonic

# Or via Conda
conda install -c conda-forge tectonic
```

</details>

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/RasheedAli-Shaik/RA-Lab.git
cd RA-Lab
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Get a free key from: https://aistudio.google.com/apikey
```

Open `.env` and replace `your_gemini_api_key_here` with your actual Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Install Tectonic

Download or install the Tectonic LaTeX compiler (see [System Requirements](#-system-requirements)) and ensure it's accessible:

- **Windows:** Place `tectonic.exe` in the project root directory
- **macOS/Linux:** Ensure `tectonic` is in your system `PATH`

### 4. Install Node.js Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 5. Set Up Python Environment

```bash
cd ../services

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## ▶️ Running the Application

You need to start **three services**. Open three terminal windows:

### Terminal 1 — Node.js Backend

```bash
cd server
npm start
```

> Server starts at `http://localhost:3001`

### Terminal 2 — FastAPI AI Service

```bash
cd services

# Activate virtual environment first
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

python main.py
```

> Agent starts at `http://localhost:8000`

### Terminal 3 — React Frontend

```bash
cd client
npm run dev
```

> Frontend starts at `http://localhost:5173`

### 🎉 Open the IDE

Navigate to **http://localhost:5173** in your browser.

### Quick Health Check

```bash
# Node.js backend
curl http://localhost:3001/api/health

# FastAPI agent
curl http://localhost:8000/health

# Agent through Node.js proxy
curl http://localhost:3001/api/agent/health
```

---

## 📁 Project Structure

```
RA-Lab/
├── .env.example              # Environment template (copy to .env)
├── .gitignore                # Git ignore rules
├── README.md                 # This file
│
├── server/                   # Node.js / Express backend
│   ├── index.js              # Entry point — Express app setup
│   ├── package.json          # Node.js dependencies
│   ├── routes/
│   │   ├── compile.js        # POST /api/compile, GET /api/compile/status
│   │   ├── document.js       # CRUD /api/document/*
│   │   └── agent.js          # Proxy /api/agent/* → FastAPI
│   ├── services/
│   │   ├── compiler.js       # Tectonic LaTeX compiler wrapper
│   │   └── fileManager.js    # Document storage & workspace management
│   └── middleware/
│       └── errorHandler.js   # Centralized error handling + AppError class
│
├── services/                 # Python / FastAPI AI service
│   ├── main.py               # FastAPI app — all endpoints
│   ├── agent.py              # GeminiAgent — Gemini API integration
│   ├── config.py             # Configuration (loads .env)
│   ├── models.py             # Pydantic request/response models
│   ├── prompts.py            # Agent system prompts (per-mode)
│   ├── node_bridge.py        # HTTP client for Node.js backend
│   ├── requirements.txt      # Python dependencies
│   └── tests/
│       └── test_agent.py     # 55 tests — unit + integration + edge cases
│
├── client/                   # React / Vite frontend
│   ├── index.html            # HTML entry point
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite config with API proxy
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── postcss.config.js     # PostCSS configuration
│   └── src/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # Main application component
│       ├── index.css         # Global styles + Tailwind imports
│       └── components/
│           ├── Editor.jsx    # CodeMirror 6 LaTeX editor
│           ├── PdfViewer.jsx # Inline PDF preview panel
│           ├── Toolbar.jsx   # Top toolbar (compile, save, download)
│           ├── LogPanel.jsx  # Compilation log viewer
│           ├── AIHelper.jsx  # AI chat assistant (uses agent backend)
│           ├── AgentPanel.jsx# 6-mode AI coding agent UI
│           └── StatusBar.jsx # Bottom status bar
│
└── tests/
    └── e2e.ps1               # End-to-end integration test suite
```

---

## 📡 API Reference

### Node.js Backend (`localhost:3001`)

#### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |

#### Compilation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/compile` | Compile LaTeX source → PDF |
| `GET` | `/api/compile/status` | Check Tectonic installation status |

#### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/document/save` | Save a `.tex` document |
| `GET` | `/api/document/load?filename=` | Load a document |
| `GET` | `/api/document/list` | List all documents |
| `DELETE` | `/api/document/delete?filename=` | Delete a document |
| `PATCH` | `/api/document/patch` | Find-and-replace edit |
| `GET` | `/api/document/pdf` | Serve compiled PDF |

#### Agent Proxy (→ FastAPI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/generate` | Generate LaTeX from description |
| `POST` | `/api/agent/fix` | Fix compilation errors |
| `POST` | `/api/agent/refactor` | Improve code quality |
| `POST` | `/api/agent/explain` | Explain LaTeX code |
| `POST` | `/api/agent/complete` | Complete partial code |
| `POST` | `/api/agent/chat` | Multi-turn AI conversation |
| `POST` | `/api/agent/apply-edit` | Apply edit to saved document |
| `POST` | `/api/agent/compile` | Compile via Node backend |
| `GET` | `/api/agent/document?filename=` | Fetch document content |
| `GET` | `/api/agent/health` | Agent service health |

### FastAPI Agent Service (`localhost:8000`)

All agent endpoints accept JSON with at minimum a `query` field. Modes that modify code (`fix`, `refactor`, `explain`, `complete`) also require `code`.

**Request Body (single-turn):**

```json
{
  "query": "Generate a LaTeX beamer presentation",
  "code": "\\documentclass{article}...",
  "logs": "error: undefined control sequence...",
  "filename": "document.tex"
}
```

**Request Body (chat):**

```json
{
  "messages": [
    { "role": "user", "content": "What is \\section?" },
    { "role": "assistant", "content": "The \\section command..." },
    { "role": "user", "content": "How about \\subsection?" }
  ],
  "code": "...",
  "logs": "..."
}
```

**Response:**

```json
{
  "success": true,
  "response": "Here is the fix:\n<<<SUGGESTED_EDIT>>>\n<<<FIND>>>\n...\n<<<REPLACE>>>\n...\n<<<END_EDIT>>>",
  "edits": [
    { "find": "old text", "replace": "new text" }
  ],
  "model": "gemini-2.0-flash",
  "mode": "fix"
}
```

---

## 🧪 Testing

### FastAPI Unit & Integration Tests

```bash
cd services
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Run all 55 tests with coverage
pytest tests/ -v --cov=. --cov-report=term-missing

# Quick run
pytest tests/ -q
```

**Coverage:** 88% across all modules (config, models, prompts, agent, main, node_bridge)

| Module | Coverage |
|--------|----------|
| `config.py` | 100% |
| `models.py` | 100% |
| `prompts.py` | 100% |
| `agent.py` | 82% |
| `main.py` | 84% |
| `node_bridge.py` | 38%* |

*\* node_bridge has lower coverage because its methods require a running Node.js backend — they are tested via the E2E suite.*

### End-to-End Tests

Requires all three services running:

```powershell
# PowerShell (Windows)
.\tests\e2e.ps1
```

Tests cover:
- ✅ Document CRUD (save, load, list, patch, delete)
- ✅ LaTeX compilation (valid, invalid, edge cases)
- ✅ Tectonic health check
- ✅ PDF serving
- ✅ Input validation (400 errors)
- ✅ Error handling (404s)
- ✅ FastAPI agent endpoints (generate, explain, chat)
- ✅ Agent validation (missing code → 400, empty body → 422)
- ✅ Node.js ↔ FastAPI bridge (document proxy, apply-edit, compile)
- ✅ Node.js → FastAPI proxy chain
- ✅ Frontend serving and API proxying

---

## 🔧 Environment Variables

All configuration is managed through a single `.env` file in the project root:

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | **Required.** Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model to use |
| `PORT` | `3001` | Node.js backend port |
| `AGENT_PORT` | `8000` | FastAPI service port |
| `NODE_BACKEND_URL` | `http://localhost:3001` | URL for FastAPI → Node communication |
| `AGENT_URL` | `http://localhost:8000` | URL for Node → FastAPI proxy |

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/RasheedAli-Shaik">Rasheed Ali Shaik</a></strong>
</p>
