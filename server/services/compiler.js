const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'workspace', 'output');

// Absolute path to the tectonic binary
const TECTONIC_BIN = path.join(__dirname, '..', '..', 'tectonic.exe');

// Maximum time (ms) we allow a single tectonic run.
// The first run may download packages, so we are generous.
const COMPILATION_TIMEOUT_MS = 120_000;

class CompilerService {
  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Compile LaTeX source code and return structured results.
   *
   * @param {string} sourceCode  Raw LaTeX source code
   * @returns {Promise<object>}  { success, logs, errors, warnings, exitCode, pdfGenerated }
   */
  async compile(sourceCode) {
    await this._ensureDirectories();

    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const texFileName = 'document.tex';
    const pdfFileName = 'document.pdf';
    const texFilePath = path.join(sessionDir, texFileName);
    const pdfFilePath = path.join(sessionDir, pdfFileName);

    try {
      // 1. Write source to disk
      await fs.writeFile(texFilePath, sourceCode, 'utf-8');

      // 2. Run tectonic
      const result = await this._executeTectonic(texFileName, sessionDir);

      // 3. Check whether a PDF was produced
      let pdfGenerated = false;
      try {
        await fs.access(pdfFilePath);
        pdfGenerated = true;
      } catch {
        // PDF does not exist — compilation likely failed
      }

      // 4. Copy PDF to persistent output location
      if (pdfGenerated) {
        const outputPdfPath = path.join(OUTPUT_DIR, 'document.pdf');
        await fs.copyFile(pdfFilePath, outputPdfPath);
      }

      // 5. Parse logs
      const combinedLogs = [result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n');
      const errors = this._parseErrors(combinedLogs);
      const warnings = this._parseWarnings(combinedLogs);

      return {
        success: result.exitCode === 0 && pdfGenerated,
        logs: combinedLogs || '(no compiler output)',
        errors,
        warnings,
        exitCode: result.exitCode,
        pdfGenerated,
      };
    } finally {
      // 6. Always clean up
      await this._cleanup(sessionDir);
    }
  }

  /**
   * Check whether the tectonic binary is reachable.
   * @returns {Promise<{installed: boolean, version: string|null}>}
   */
  async checkInstallation() {
    return new Promise((resolve) => {
      let output = '';
      const proc = spawn(TECTONIC_BIN, ['--version']);

      proc.stdout.on('data', (d) => {
        output += d.toString();
      });
      proc.on('close', (code) => {
        resolve({
          installed: code === 0,
          version: code === 0 ? output.trim() : null,
        });
      });
      proc.on('error', () => {
        resolve({ installed: false, version: null });
      });
    });
  }

  /*  Private helpers */
  /** Ensure temp and output directories exist. */
  async _ensureDirectories() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }

  /**
   * Spawn `tectonic` as a child process and capture its output.
   *
   * @param {string} texFileName  Name of the .tex file inside workingDir
   * @param {string} workingDir   Absolute path to the session temp directory
   * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
   */
  _executeTectonic(texFileName, workingDir) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const proc = spawn(TECTONIC_BIN, [texFileName], {
        cwd: workingDir,
      });

      // Guard: overall timeout
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill('SIGKILL');
          reject(
            new Error(
              `Compilation timed out after ${COMPILATION_TIMEOUT_MS / 1000}s. ` +
                'If this is the first compilation, tectonic may be downloading packages — please retry.'
            )
          );
        }
      }, COMPILATION_TIMEOUT_MS);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (signal) {
          reject(new Error(`tectonic process killed by signal ${signal}`));
          return;
        }

        resolve({ exitCode: code ?? 1, stdout, stderr });
      });

      proc.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (err.code === 'ENOENT') {
          reject(
            new Error(
              'tectonic binary not found. Please install tectonic and ensure it is on your PATH. ' +
                'Install guide: https://tectonic-typesetting.github.io/en-US/install.html'
            )
          );
        } else {
          reject(new Error(`Failed to start tectonic: ${err.message}`));
        }
      });
    });
  }

  /** Extract error-like lines from combined compiler output. */
  _parseErrors(output) {
    if (!output) return [];
    return output
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (line) =>
          line &&
          (line.startsWith('error:') ||
            line.startsWith('error[') ||
            line.startsWith('! ') ||
            line.toLowerCase().includes('fatal error') ||
            /^\s*!/.test(line))
      );
  }

  /** Extract warning-like lines from combined compiler output. */
  _parseWarnings(output) {
    if (!output) return [];
    return output
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (line) =>
          line &&
          (line.startsWith('warning:') ||
            line.toLowerCase().includes('latex warning') ||
            line.toLowerCase().includes('overfull') ||
            line.toLowerCase().includes('underfull'))
      );
  }

  /** Remove a directory tree, ignoring failures. */
  async _cleanup(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`[CompilerService] cleanup failed for ${dirPath}: ${err.message}`);
    }
  }
}

module.exports = { CompilerService };
