/**
 * FileManager
 *
 * Handles transient document storage for the current editing session.
 * Provides CRUD-like operations on .tex files stored under
 * `workspace/documents/` and serves the compiled PDF from
 * `workspace/output/`.
 *
 * Designed to leave room for a future FastAPI service that may
 * read, rewrite, or patch the file via the same REST surface.
 */

const fs = require('fs/promises');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');
const DOCUMENTS_DIR = path.join(WORKSPACE_DIR, 'documents');
const OUTPUT_DIR = path.join(WORKSPACE_DIR, 'output');

class FileManager {
  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                    */
  /* ------------------------------------------------------------------ */

  /** Create workspace directories if they do not already exist. */
  async initializeWorkspace() {
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }

  /* ------------------------------------------------------------------ */
  /*  Document CRUD                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Save (create / overwrite) a .tex document.
   *
   * @param {string} filename - Desired filename (sanitised internally)
   * @param {string} content  - Full LaTeX source
   * @returns {Promise<object>} { filename, path, size }
   */
  async saveDocument(filename, content) {
    const safeName = this._sanitizeFilename(filename);
    const filePath = path.join(DOCUMENTS_DIR, safeName);
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      filename: safeName,
      path: filePath,
      size: Buffer.byteLength(content, 'utf-8'),
    };
  }

  /**
   * Load a .tex document.
   *
   * @param {string} filename
   * @returns {Promise<object|null>} { filename, content, size, lastModified } or null
   */
  async loadDocument(filename) {
    const safeName = this._sanitizeFilename(filename);
    const filePath = path.join(DOCUMENTS_DIR, safeName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      return {
        filename: safeName,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * List all .tex documents in the workspace.
   *
   * @returns {Promise<object[]>} Array of { filename, size, lastModified }
   */
  async listDocuments() {
    try {
      const entries = await fs.readdir(DOCUMENTS_DIR);
      const texFiles = entries.filter((f) => f.endsWith('.tex'));

      const docs = await Promise.all(
        texFiles.map(async (filename) => {
          const filePath = path.join(DOCUMENTS_DIR, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        })
      );

      return docs;
    } catch {
      return [];
    }
  }

  /**
   * Delete a .tex document.
   *
   * @param {string} filename
   * @returns {Promise<boolean>} true if deleted, false if not found
   */
  async deleteDocument(filename) {
    const safeName = this._sanitizeFilename(filename);
    const filePath = path.join(DOCUMENTS_DIR, safeName);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Patch (for future FastAPI integration)                            */
  /* ------------------------------------------------------------------ */

  /**
   * Apply a find-and-replace patch to a document.
   * The future FastAPI coding-agent service will call this endpoint
   * to make targeted edits to the LaTeX source.
   *
   * @param {string} filename
   * @param {string} find    - Exact substring to locate
   * @param {string} replace - Replacement string
   * @returns {Promise<object|null>}
   */
  async patchDocument(filename, find, replace) {
    const doc = await this.loadDocument(filename);
    if (!doc) return null;

    if (!doc.content.includes(find)) {
      return { patched: false, reason: 'Search pattern not found in document' };
    }

    const updated = doc.content.replace(find, replace);
    await this.saveDocument(filename, updated);
    return { patched: true, filename: this._sanitizeFilename(filename) };
  }

  /* ------------------------------------------------------------------ */
  /*  PDF output                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Return the absolute path to the most recently compiled PDF,
   * or null if no PDF has been generated yet.
   */
  async getCompiledPdfPath() {
    const pdfPath = path.join(OUTPUT_DIR, 'document.pdf');
    try {
      await fs.access(pdfPath);
      return pdfPath;
    } catch {
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Sanitise a filename to prevent path traversal and dangerous chars.
   * Always ensures a .tex extension.
   *
   * @param {string} filename
   * @returns {string}
   */
  _sanitizeFilename(filename) {
    // Strip directory components
    let safe = path.basename(String(filename));
    // Allow only alphanumerics, dots, hyphens, underscores
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Ensure .tex extension
    if (!safe.endsWith('.tex')) {
      safe += '.tex';
    }
    // Fallback for empty names
    if (safe === '.tex') {
      safe = 'document.tex';
    }
    return safe;
  }
}

module.exports = { FileManager };
