/**
 * /api/document routes
 *
 * POST   /api/document/save   — Save / overwrite a .tex document
 * GET    /api/document/load   — Load a .tex document by filename
 * GET    /api/document/list   — List all stored .tex documents
 * DELETE /api/document/delete — Delete a document by filename
 * PATCH  /api/document/patch  — Find-and-replace patch (future FastAPI hook)
 * GET    /api/document/pdf    — Serve the latest compiled PDF
 */

const express = require('express');
const path = require('path');
const router = express.Router();
const { FileManager } = require('../services/fileManager');
const { AppError } = require('../middleware/errorHandler');

const fileManager = new FileManager();

// Ensure workspace exists on module load
fileManager.initializeWorkspace().catch((err) => {
  console.error('[FileManager] workspace init failed:', err.message);
});

/* ------------------------------------------------------------------ */
/*  POST /api/document/save                                           */
/* ------------------------------------------------------------------ */
router.post('/save', async (req, res, next) => {
  try {
    const { code, filename } = req.body;

    if (!code || typeof code !== 'string') {
      throw new AppError(
        'Missing or invalid "code" field. Provide a string of LaTeX source.',
        400
      );
    }

    const name = filename && typeof filename === 'string' ? filename : 'document.tex';
    const result = await fileManager.saveDocument(name, code);

    return res.json({
      success: true,
      message: 'Document saved successfully.',
      document: result,
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/document/load?filename=...                               */
/* ------------------------------------------------------------------ */
router.get('/load', async (req, res, next) => {
  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      throw new AppError(
        'Query parameter "filename" is required (e.g. ?filename=document.tex).',
        400
      );
    }

    const doc = await fileManager.loadDocument(filename);

    if (!doc) {
      throw new AppError(`Document "${filename}" not found.`, 404);
    }

    return res.json({
      success: true,
      document: doc,
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/document/list                                            */
/* ------------------------------------------------------------------ */
router.get('/list', async (_req, res, next) => {
  try {
    const documents = await fileManager.listDocuments();

    return res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /api/document/delete?filename=...                          */
/* ------------------------------------------------------------------ */
router.delete('/delete', async (req, res, next) => {
  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      throw new AppError(
        'Query parameter "filename" is required.',
        400
      );
    }

    const deleted = await fileManager.deleteDocument(filename);

    if (!deleted) {
      throw new AppError(`Document "${filename}" not found.`, 404);
    }

    return res.json({
      success: true,
      message: `Document "${filename}" deleted.`,
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  PATCH /api/document/patch                                         */
/*  Body: { filename?, find, replace }                                */
/*  Designed for integration with a future FastAPI coding-agent.      */
/* ------------------------------------------------------------------ */
router.patch('/patch', async (req, res, next) => {
  try {
    const { filename = 'document.tex', find, replace } = req.body;

    if (!find || typeof find !== 'string') {
      throw new AppError(
        'Field "find" is required and must be a non-empty string.',
        400
      );
    }
    if (replace === undefined || replace === null || typeof replace !== 'string') {
      throw new AppError(
        'Field "replace" is required and must be a string.',
        400
      );
    }

    const result = await fileManager.patchDocument(filename, find, replace);

    if (result === null) {
      throw new AppError(`Document "${filename}" not found.`, 404);
    }

    if (!result.patched) {
      return res.status(422).json({
        success: false,
        message: result.reason,
      });
    }

    return res.json({
      success: true,
      message: 'Document patched successfully.',
      filename: result.filename,
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/document/pdf                                             */
/*  Serves the latest compiled PDF as application/pdf.                */
/* ------------------------------------------------------------------ */
router.get('/pdf', async (_req, res, next) => {
  try {
    const pdfPath = await fileManager.getCompiledPdfPath();

    if (!pdfPath) {
      throw new AppError(
        'No compiled PDF available. Compile a document first.',
        404
      );
    }

    return res.sendFile(path.resolve(pdfPath), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
