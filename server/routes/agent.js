/**
 * /api/agent routes
 */

const express = require('express');
const router = express.Router();
const { AppError } = require('../middleware/errorHandler');

const AGENT_BASE_URL = process.env.AGENT_URL || 'http://localhost:8000';

async function proxyToAgent(path, method, body, res, next) {
  try {
    const url = `${AGENT_BASE_URL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const agentRes = await fetch(url, options);
    const data = await agentRes.json();

    if (!agentRes.ok) {
      const detail = data?.detail || data?.error?.message || 'Agent request failed';
      return next(new AppError(detail, agentRes.status));
    }

    return res.json(data);
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      return next(
        new AppError(
          'Coding agent service is not running. Start it with: python services/main.py',
          503
        )
      );
    }
    return next(new AppError(`Agent proxy error: ${err.message}`, 502));
  }
}

// Single-turn agent endpoints 
router.post('/generate', (req, res, next) =>
  proxyToAgent('/api/agent/generate', 'POST', req.body, res, next)
);

router.post('/fix', (req, res, next) =>
  proxyToAgent('/api/agent/fix', 'POST', req.body, res, next)
);

router.post('/refactor', (req, res, next) =>
  proxyToAgent('/api/agent/refactor', 'POST', req.body, res, next)
);

router.post('/explain', (req, res, next) =>
  proxyToAgent('/api/agent/explain', 'POST', req.body, res, next)
);

router.post('/complete', (req, res, next) =>
  proxyToAgent('/api/agent/complete', 'POST', req.body, res, next)
);

// Multi-turn chat
router.post('/chat', (req, res, next) =>
  proxyToAgent('/api/agent/chat', 'POST', req.body, res, next)
);

// Apply edit 
router.post('/apply-edit', (req, res, next) =>
  proxyToAgent('/api/agent/apply-edit', 'POST', req.body, res, next)
);

// Document proxy
router.get('/document', async (req, res, next) => {
  const filename = req.query.filename || 'document.tex';
  return proxyToAgent(`/api/agent/document?filename=${encodeURIComponent(filename)}`, 'GET', null, res, next);
});

// Compile proxy
router.post('/compile', (req, res, next) =>
  proxyToAgent('/api/agent/compile', 'POST', req.body, res, next)
);

// Agent health
router.get('/health', async (_req, res, next) => {
  return proxyToAgent('/health', 'GET', null, res, next);
});

module.exports = router;
