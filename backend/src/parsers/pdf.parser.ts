import { spawn } from 'child_process';
import path from 'path';

export const parsePdf = async (buffer: Buffer): Promise<string> => {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty');
  }

  return new Promise<string>((resolve, reject) => {
    // Run pdf-parse in an isolated node process to guarantee zero shared worker state contamination
    const child = spawn(
      process.execPath,
      [
        '-e',
        `
        const pdfParse = require('pdf-parse');
        const chunks = [];
        process.stdin.on('data', c => chunks.push(c));
        process.stdin.on('end', async () => {
          try {
            const buf = Buffer.concat(chunks);
            const res = await pdfParse(buf);
            process.stdout.write(JSON.stringify({ success: true, text: res.text }));
          } catch (err) {
            process.stdout.write(JSON.stringify({ success: false, error: err.message }));
          }
        });
        `
      ],
      {
        cwd: path.resolve(__dirname, '../../')
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.success) {
          if (!parsed.text || parsed.text.trim().length === 0) {
            const error = new Error('No extractable text found in PDF. OCR is not enabled in the prototype.');
            error.name = 'PdfExtractionError';
            return reject(error);
          }
          resolve(parsed.text.replace(/\n\s*\n/g, '\n').trim());
        } else {
          reject(new Error(`Failed to parse PDF: ${parsed.error}`));
        }
      } catch (_e) {
        reject(new Error(`Failed to parse PDF: ${stderr || 'Process exited with code ' + code}`));
      }
    });

    child.stdin.write(buffer);
    child.stdin.end();
  });
};

