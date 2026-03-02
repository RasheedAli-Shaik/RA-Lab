/**
 * /api/compile routes
 *
 * POST /api/compile — Receive LaTeX source, compile with tectonic,
 *                     return structured result (logs, errors, PDF status).
 */

const express = require('express');
const router = express.Router();
const { CompilerService } = require('../services/compiler');
const { AppError } = require('../middleware/errorHandler');

const compiler = new CompilerService();

/**
 * POST /api/compile
 *
 * Body: { code: string }
 *
 * Response:
 *   200 — { success, logs, errors, warnings, exitCode, pdfGenerated, message }
 *   400 — validation error
 *   500 — unexpected server / tectonic error
 */
router.post('/', async (req, res, next) => {
  try {
    const { code } = req.body;

    // ---- Input validation ----
    if (code === undefined || code === null) {
      throw new AppError(
        'Missing required field "code". Please send a JSON body with { "code": "<latex source>" }.',
        400
      );
    }

    if (typeof code !== 'string') {
      throw new AppError(
        'Field "code" must be a string containing LaTeX source code.',
        400
      );
    }

    if (code.trim().length === 0) {
      throw new AppError(
        'Field "code" must not be empty. Provide valid LaTeX source code.',
        400
      );
    }

    // ---- Compile ----
    const result = await compiler.compile(code);

    return res.json({
      success: result.success,
      logs: result.logs,
      errors: result.errors,
      warnings: result.warnings,
      exitCode: result.exitCode,
      pdfGenerated: result.pdfGenerated,
      message: result.success
        ? 'Compilation successful — PDF generated.'
        : 'Compilation completed with errors — check logs for details.',
    });
  } catch (err) {
    // Surface tectonic-not-found as a 503 Service Unavailable
    if (err.message && err.message.includes('tectonic binary not found')) {
      return next(new AppError(err.message, 503));
    }
    // Surface timeout as 408
    if (err.message && err.message.includes('timed out')) {
      return next(new AppError(err.message, 408));
    }
    return next(err);
  }
});

/**
 * GET /api/compile/status
 *
 * Quick health-check for the compiler subsystem.
 */
router.get('/status', async (_req, res, next) => {
  try {
    const info = await compiler.checkInstallation();
    return res.json({
      success: true,
      tectonic: info,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
