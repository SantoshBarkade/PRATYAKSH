/**
 * PRATYAKSH — String Utilities
 * 
 * Provides simple string similarity and normalization functions
 * to avoid external NLP dependencies for M3 fuzzy matching.
 */

/**
 * Normalizes a string for matching by lowercasing, trimming,
 * and collapsing multiple whitespaces.
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes a string into meaningful lowercase words,
 * removing generic stop words to improve keyword matching.
 */
export function tokenize(str: string): Set<string> {
  const genericWords = new Set(['work', 'activity', 'task', 'execution', 'completed', 'progress', 'is', 'the', 'of', 'and', 'to', 'for', 'on', 'in', 'at']);
  const tokens = normalizeString(str).split(' ').filter(t => t.length > 0 && !genericWords.has(t));
  return new Set(tokens);
}

/**
 * Calculates Jaccard Index (intersection over union) of tokens.
 * Useful for Keyword Match level.
 */
export function keywordMatchScore(str1: string, str2: string): number {
  const set1 = tokenize(str1);
  const set2 = tokenize(str2);
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersection++;
    }
  }
  
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

/**
 * Calculates Sørensen–Dice coefficient between two strings based on character bigrams.
 * Better for fuzzy matching typos and partial word overlaps than Levenshtein distance.
 */
export function diceCoefficient(str1: string, str2: string): number {
  const s1 = normalizeString(str1).replace(/\s/g, '');
  const s2 = normalizeString(str2).replace(/\s/g, '');
  
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;
  
  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bg = s1.slice(i, i + 2);
    bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
  }
  
  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bg = s2.slice(i, i + 2);
    const count = bigrams1.get(bg);
    if (count && count > 0) {
      intersection++;
      bigrams1.set(bg, count - 1);
    }
  }
  
  return (2.0 * intersection) / ((s1.length - 1) + (s2.length - 1));
}
