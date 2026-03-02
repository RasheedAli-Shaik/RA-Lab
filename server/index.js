/**
 * RA-Lab Server — Entry Point
 *
 * Express application that provides:
 *  • /api/compile   — LaTeX compilation via tectonic
 *  • /api/document  — Document CRUD & PDF serving
 *  • /api/agent     — Proxy to FastAPI coding agent (Gemini AI)
 *  • /api/health    — Health check
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env in project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const compileRoutes = require('./routes/compile');
const documentRoutes = require('./routes/document');
const agentRoutes = require('./routes/agent');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

/* ------------------------------------------------------------------ */
/*  Bootstrap directories                                             */
/* ------------------------------------------------------------------ */
const dirs = [
  path.join(__dirname, 'workspace'),
  path.join(__dirname, 'workspace', 'documents'),
  path.join(__dirname, 'workspace', 'output'),
  path.join(__dirname, 'temp'),
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ------------------------------------------------------------------ */
/*  Middleware                                                        */
/* ------------------------------------------------------------------ */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'ralab-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/compile', compileRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/agent', agentRoutes);

/* ------------------------------------------------------------------ */
/*  Error handling                                                    */
/* ------------------------------------------------------------------ */
app.use(notFoundHandler);
app.use(errorHandler);

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received — shutting down gracefully.');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('\nSIGINT received — shutting down gracefully.');
  process.exit(0);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WARN] Unhandled Rejection at:', promise, 'reason:', reason);
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║            RA-Lab Server v1.0.0                ║
║         LaTeX Workshop IDE Backend            ║
╠═══════════════════════════════════════════════╣
║  Server :  http://localhost:${PORT}               ║
║  Health :  http://localhost:${PORT}/api/health     ║
╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;
