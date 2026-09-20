export const parseTxt = (buffer: Buffer): string => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Text buffer is empty');
  }

  // Parse as UTF-8
  const text = buffer.toString('utf-8');

  if (!text || text.trim().length === 0) {
    const error = new Error('No extractable text found in TXT file.');
    error.name = 'TxtExtractionError';
    throw error;
  }

  // Normalize basic whitespace (remove excessive blank lines)
  return text.replace(/\n\s*\n/g, '\n').trim();
};
