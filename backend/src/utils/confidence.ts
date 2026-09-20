/**
 * PRATYAKSH — Matching Confidence Thresholds and Helpers
 *
 * NOTE: matchScore values are prototype ranking scores, NOT
 * mathematically calibrated probabilities. They represent the relative
 * plausibility of a candidate match within this pipeline.
 *
 * Thresholds are loaded from environment variables and can be adjusted
 * without code changes.
 */
import { env } from '../config/env';
import { MatchDecision } from '../types';

/**
 * Decides the match outcome based on the top candidate's score.
 * Thresholds: AUTO_MATCH_THRESHOLD / REVIEW_THRESHOLD from env.
 */
export function decideMatchOutcome(topScore: number): MatchDecision {
  if (topScore >= env.MATCH_AUTO_THRESHOLD) return 'AUTO_MATCH';
  if (topScore >= env.MATCH_REVIEW_THRESHOLD) return 'REVIEW_REQUIRED';
  return 'UNMATCHED';
}

/**
 * Clamp a numeric score to [0, 1].
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute Jaro similarity between two strings.
 * Used in fuzzy matching (Level 4).
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Jaro-Winkler similarity — boosts score for strings sharing a common prefix.
 */
export function jaroWinkler(s1: string, s2: string, prefixScale = 0.1): number {
  const jaro = jaroSimilarity(s1, s2);
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * prefixScale * (1 - jaro);
}

/**
 * Token-based overlap score: proportion of tokens in the query
 * that appear in the candidate string.
 */
export function tokenOverlapScore(query: string, candidate: string): number {
  const qTokens = tokenize(query);
  const cTokens = new Set(tokenize(candidate));
  if (qTokens.length === 0) return 0;
  const matches = qTokens.filter((t) => cTokens.has(t)).length;
  return matches / qTokens.length;
}

/**
 * Normalize a string for matching:
 * lowercase, remove punctuation, collapse whitespace.
 */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split a normalized string into tokens, removing common stop words.
 */
export function tokenize(s: string): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'on', 'at',
    'to', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'work', 'works', 'working', 'activity', 'activities', 'task',
    'construction', 'installation', 'completion',
  ]);
  return normalizeForMatch(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}
