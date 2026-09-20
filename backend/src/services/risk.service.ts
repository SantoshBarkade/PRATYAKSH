import { Types } from 'mongoose';
import { Activity } from '../models/Activity';
import { Dependency } from '../models/Dependency';
import { Risk, IRisk } from '../models/Risk';
import type { RiskType, RiskSeverity, ActivityStatus, DependencyRisk } from '../types';

export interface PropagateRisksResult {
  projectId: string;
  riskSources: number;
  risksCreated: number;
  risksUpdated: number;
  risksResolved: number;
  activeRiskCount: number;
  affectedActivityCount: number;
  graphWarnings: string[];
}

interface RiskCandidate {
  logicalKey: string;
  projectId: Types.ObjectId;
  activityId: Types.ObjectId;
  targetActivityId: Types.ObjectId;
  riskType: RiskType;
  severity: RiskSeverity;
  distance: number;
  path: Types.ObjectId[];
  reason: string;
  sourceActivityStatus: ActivityStatus;
  sourceVariance: number | null;
  sourceActualProgress: number | null;
  sourcePlannedProgressAtReportDate: number | null;
  sourceReportDate: Date | null;
}

export class RiskService {
  public async propagateRisks(projectIdStr: string): Promise<PropagateRisksResult> {
    const projectId = new Types.ObjectId(projectIdStr);
    const graphWarnings: string[] = [];

    // 1. Load activities and build map
    const activities = await Activity.find({ projectId }).lean();
    const activityMap = new Map<string, any>();
    for (const act of activities) {
      activityMap.set(act._id.toString(), act);
    }

    // 2. Load dependencies and build graph
    const dependencies = await Dependency.find({ projectId }).lean();
    const successorMap = new Map<string, Set<string>>();

    for (const dep of dependencies) {
      const pred = dep.predecessorActivityId.toString();
      const succ = dep.successorActivityId.toString();

      // Validate self-dependency
      if (pred === succ) {
        graphWarnings.push(`Self-dependency detected for activity ${pred}`);
        continue;
      }

      // Validate missing source/target (cross-project or missing)
      if (!activityMap.has(pred)) {
        graphWarnings.push(`Dependency predecessor ${pred} not found in project`);
        continue;
      }
      if (!activityMap.has(succ)) {
        graphWarnings.push(`Dependency successor ${succ} not found in project`);
        continue;
      }

      if (!successorMap.has(pred)) {
        successorMap.set(pred, new Set());
      }
      // Set automatically deduplicates edges
      successorMap.get(pred)!.add(succ);
    }

    // 3. Identify risk sources
    const riskSources = activities.filter(
      (a) => a.activityStatus === 'DELAYED' || a.dependencyRisk === 'AT_RISK'
    );

    // 4. BFS Traversal to generate candidates
    const candidates = new Map<string, RiskCandidate>();

    for (const source of riskSources) {
      const sourceId = source._id.toString();
      
      const queue: { id: string; dist: number; path: string[] }[] = [];
      const visited = new Set<string>();

      queue.push({ id: sourceId, dist: 0, path: [sourceId] });
      visited.add(sourceId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        
        // If not the source itself, generate a candidate
        if (current.id !== sourceId) {
          const distance = current.dist;
          const targetAct = activityMap.get(current.id);
          
          let severity: RiskSeverity = 'LOW';
          let riskType: RiskType = distance === 1 ? 'DOWNSTREAM_DELAY' : 'POTENTIAL_DOWNSTREAM_DELAY';

          if (source.activityStatus === 'DELAYED') {
            severity = distance === 1 ? 'HIGH' : 'MEDIUM';
          } else if (source.dependencyRisk === 'AT_RISK') {
            severity = distance === 1 ? 'MEDIUM' : 'LOW';
          }

          const logicalKey = `${projectIdStr}:${sourceId}:${current.id}:${riskType}`;
          
          // Only take the first (shortest) path found via BFS
          if (!candidates.has(logicalKey)) {
            let reason = '';
            const sourceInfo = source.activityStatus === 'DELAYED' 
              ? `${source.activityCode} is DELAYED`
              : `${source.activityCode} is AT_RISK from an upstream delay`;
            
            if (distance === 1) {
              reason = `${targetAct.activityCode} is exposed because its predecessor ${sourceInfo}.`;
            } else {
              reason = `${targetAct.activityCode} is exposed because ${sourceInfo} through transitive dependencies.`;
            }

            reason += ` Dependency path: ${current.path.map(id => activityMap.get(id).activityCode).join(' → ')}.`;

            if (source.actualProgress !== null && source.plannedProgress !== null) {
              const variance = source.actualProgress - source.plannedProgress;
              reason += ` ${source.activityCode} has ${source.actualProgress}% actual progress against ${source.plannedProgress}% planned progress, a variance of ${variance} points.`;
            }

            candidates.set(logicalKey, {
              logicalKey,
              projectId,
              activityId: source._id,
              targetActivityId: targetAct._id,
              riskType,
              severity,
              distance,
              path: current.path.map(id => new Types.ObjectId(id)),
              reason,
              sourceActivityStatus: source.activityStatus,
              sourceVariance: source.actualProgress - source.plannedProgress,
              sourceActualProgress: source.actualProgress,
              sourcePlannedProgressAtReportDate: source.plannedProgress,
              sourceReportDate: source.updatedAt || new Date()
            });
          }
        }

        // Expand neighbors
        const successors = successorMap.get(current.id) || new Set<string>();
        for (const succ of successors) {
          if (!visited.has(succ)) {
            visited.add(succ);
            queue.push({ id: succ, dist: current.dist + 1, path: [...current.path, succ] });
          } else if (succ === sourceId) {
            // Cycle back to source
            graphWarnings.push(`Cycle detected in dependency graph involving ${source.activityCode}`);
          }
        }
      }
    }

    // 5. Reconcile with existing OPEN risks
    const existingOpenRisks = await Risk.find({ projectId, status: 'OPEN' });
    const existingMap = new Map<string, IRisk>();
    for (const r of existingOpenRisks) {
      existingMap.set(r.logicalKey, r);
    }

    let risksCreated = 0;
    let risksUpdated = 0;
    let risksResolved = 0;
    
    // We will collect active logical keys to efficiently compute dependencyRisk later
    const activeRiskTargetSeverities = new Map<string, RiskSeverity[]>();

    // Create or Update
    for (const [key, cand] of candidates.entries()) {
      let activeRiskRec: IRisk;
      if (existingMap.has(key)) {
        // CASE 2 — STILL ACTIVE
        const existing = existingMap.get(key)!;
        existing.severity = cand.severity;
        existing.distance = cand.distance;
        existing.path = cand.path;
        existing.reason = cand.reason;
        existing.sourceActivityStatus = cand.sourceActivityStatus;
        existing.sourceVariance = cand.sourceVariance;
        existing.sourceActualProgress = cand.sourceActualProgress;
        existing.sourcePlannedProgressAtReportDate = cand.sourcePlannedProgressAtReportDate;
        existing.sourceReportDate = cand.sourceReportDate;
        
        await existing.save();
        risksUpdated++;
        activeRiskRec = existing;
      } else {
        // CASE 1 — NEW OR REOPENED
        // Check if there is a RESOLVED risk to re-use (history reopening)
        const resolvedRisk = await Risk.findOne({ logicalKey: key, status: 'RESOLVED' });
        if (resolvedRisk) {
          resolvedRisk.status = 'OPEN';
          resolvedRisk.resolvedAt = null;
          resolvedRisk.severity = cand.severity;
          resolvedRisk.distance = cand.distance;
          resolvedRisk.path = cand.path;
          resolvedRisk.reason = cand.reason;
          resolvedRisk.sourceActivityStatus = cand.sourceActivityStatus;
          resolvedRisk.sourceVariance = cand.sourceVariance;
          resolvedRisk.sourceActualProgress = cand.sourceActualProgress;
          resolvedRisk.sourcePlannedProgressAtReportDate = cand.sourcePlannedProgressAtReportDate;
          resolvedRisk.sourceReportDate = cand.sourceReportDate;
          
          await resolvedRisk.save();
          risksCreated++;
          activeRiskRec = resolvedRisk;
        } else {
          const newRisk = new Risk({
            ...cand,
            status: 'OPEN',
            impactedActivityIds: [cand.targetActivityId] // Legacy compatibility
          });
          await newRisk.save();
          risksCreated++;
          activeRiskRec = newRisk;
        }
      }
      
      const targetIdStr = cand.targetActivityId.toString();
      if (!activeRiskTargetSeverities.has(targetIdStr)) {
        activeRiskTargetSeverities.set(targetIdStr, []);
      }
      activeRiskTargetSeverities.get(targetIdStr)!.push(cand.severity);
    }

    // Resolve obsolete
    for (const [key, existing] of existingMap.entries()) {
      if (!candidates.has(key)) {
        // CASE 3 — RESOLVED
        existing.status = 'RESOLVED';
        existing.resolvedAt = new Date();
        await existing.save();
        risksResolved++;
      }
    }

    // 6. Synchronize Activity.dependencyRisk
    // We only care about activities in activeRiskTargetSeverities, and any other activity currently not NONE.
    // Let's do bulk operations.
    const bulkOps = [];
    
    for (const act of activities) {
      const idStr = act._id.toString();
      let newDependencyRisk: DependencyRisk = 'NONE';
      
      if (activeRiskTargetSeverities.has(idStr)) {
        const severities = activeRiskTargetSeverities.get(idStr)!;
        if (severities.includes('HIGH') || severities.includes('CRITICAL' as any)) { // CRITICAL for future proofing
          newDependencyRisk = 'AT_RISK';
        } else {
          newDependencyRisk = 'POTENTIAL_RISK'; // MEDIUM or LOW
        }
      }
      
      if (act.dependencyRisk !== newDependencyRisk) {
        bulkOps.push({
          updateOne: {
            filter: { _id: act._id },
            update: { $set: { dependencyRisk: newDependencyRisk } }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await Activity.bulkWrite(bulkOps);
    }

    return {
      projectId: projectIdStr,
      riskSources: riskSources.length,
      risksCreated,
      risksUpdated,
      risksResolved,
      activeRiskCount: candidates.size,
      affectedActivityCount: activeRiskTargetSeverities.size,
      graphWarnings: Array.from(new Set(graphWarnings)) // deduplicate warnings
    };
  }
}

export const riskService = new RiskService();
