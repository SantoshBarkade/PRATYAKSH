import { Activity, IActivity } from '../models/Activity';
import { MatchCandidate, MatchDecision, MatchMethod, MatchResult } from '../types';
import { diceCoefficient, keywordMatchScore, normalizeString } from '../utils/string.utils';

// Centralized matching thresholds
const THRESHOLDS = {
  AUTO_MATCH: 0.90,
  REVIEW: 0.70,
  MIN_MARGIN: 0.05,
};

// Simple alias dictionary for Level 4
const ALIASES: Record<string, string[]> = {
  'foundation': ['rcc footing', 'rcc foundation', 'footing', 'footing work', 'foundation concrete'],
  // Add other simple conceptual mappings if necessary
};

export class MatchingService {
  async matchActivity(projectId: string, extractedActivityStr: string | null): Promise<MatchResult> {
    if (!extractedActivityStr) {
      return this.createUnmatchedResult();
    }

    // 1. Fetch all project activities (acceptable for MVP screening)
    const activities = await Activity.find({ projectId });
    if (activities.length === 0) {
      return this.createUnmatchedResult();
    }

    const normExtracted = normalizeString(extractedActivityStr);
    const candidates: MatchCandidate[] = [];

    for (const activity of activities) {
      const normName = normalizeString(activity.name);
      const code = activity.activityCode.toLowerCase();

      // LEVEL 0: Activity Code (Strongest)
      if (normExtracted.includes(code)) {
        return this.createAutoMatchResult(activity, 1.0, 'EXACT'); // Or create a new MATCH_METHOD like ACTIVITY_CODE if added to types. Wait, 'EXACT' is fine, let's use what's in types. Actually, type says EXACT.
        // Wait, types allow 'EXACT', 'NORMALIZED_EXACT', 'KEYWORD', 'FUZZY', 'SEMANTIC', 'LLM_FALLBACK'. 
        // We'll map ACTIVITY_CODE to EXACT for now to respect strict types, but I can add it later if needed.
        // I will just use EXACT.
      }

      let bestScore = 0;
      let bestMethod: MatchMethod = 'FUZZY';

      // LEVEL 1: Exact Name
      if (extractedActivityStr.trim().toLowerCase() === activity.name.trim().toLowerCase()) {
        bestScore = 1.0;
        bestMethod = 'EXACT';
      } 
      // LEVEL 2: Normalized Name
      else if (normExtracted === normName || normExtracted.includes(normName)) {
        bestScore = 1.0;
        bestMethod = 'NORMALIZED_EXACT';
      }
      else {
        // LEVEL 4: Alias Match (Check before keywords/fuzzy for semantic correctness)
        const activityAliases = ALIASES[normName] || [];
        let matchedAlias = false;
        for (const alias of activityAliases) {
          if (normExtracted === normalizeString(alias) || normExtracted.includes(normalizeString(alias))) {
            bestScore = 0.95;
            bestMethod = 'KEYWORD'; // Map alias to keyword conceptually
            matchedAlias = true;
            break;
          }
        }

        if (!matchedAlias) {
          // LEVEL 3: Keyword Token Match
          const keyScore = keywordMatchScore(normExtracted, normName);
          
          // LEVEL 5: Fuzzy Match
          const fuzzScore = diceCoefficient(normExtracted, normName);

          if (keyScore >= fuzzScore) {
            bestScore = keyScore;
            bestMethod = 'KEYWORD';
          } else {
            bestScore = fuzzScore;
            bestMethod = 'FUZZY';
          }
        }
      }

      candidates.push({
        activityId: activity._id.toString(),
        activityCode: activity.activityCode,
        name: activity.name,
        matchScore: bestScore,
        matchMethod: bestMethod,
      });
    }

    // Rank candidates
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    const top = candidates[0];
    const second = candidates.length > 1 ? candidates[1] : null;

    // Decision Logic
    let decision: MatchDecision = 'UNMATCHED';

    if (top.matchScore >= THRESHOLDS.AUTO_MATCH) {
      if (!second || (top.matchScore - second.matchScore) >= THRESHOLDS.MIN_MARGIN) {
        decision = 'AUTO_MATCH';
      } else {
        decision = 'REVIEW_REQUIRED'; // Too close to call
      }
    } else if (top.matchScore >= THRESHOLDS.REVIEW) {
      decision = 'REVIEW_REQUIRED';
    }

    if (decision === 'UNMATCHED') {
      return this.createUnmatchedResult();
    }

    return {
      decision,
      matchedActivityId: decision === 'AUTO_MATCH' ? top.activityId : undefined,
      matchedActivityCode: decision === 'AUTO_MATCH' ? top.activityCode : undefined,
      matchedActivityName: decision === 'AUTO_MATCH' ? top.name : undefined,
      matchScore: decision === 'AUTO_MATCH' ? top.matchScore : top.matchScore,
      matchMethod: decision === 'AUTO_MATCH' ? top.matchMethod : top.matchMethod,
      candidates: candidates.filter(c => c.matchScore >= THRESHOLDS.REVIEW),
    };
  }

  private createUnmatchedResult(): MatchResult {
    return {
      decision: 'UNMATCHED',
      matchScore: 0,
      candidates: [],
    };
  }

  private createAutoMatchResult(activity: IActivity, score: number, method: MatchMethod): MatchResult {
    return {
      decision: 'AUTO_MATCH',
      matchedActivityId: activity._id.toString(),
      matchedActivityCode: activity.activityCode,
      matchedActivityName: activity.name,
      matchScore: score,
      matchMethod: method,
      candidates: [{
        activityId: activity._id.toString(),
        activityCode: activity.activityCode,
        name: activity.name,
        matchScore: score,
        matchMethod: method
      }],
    };
  }
}

export const matchingService = new MatchingService();
