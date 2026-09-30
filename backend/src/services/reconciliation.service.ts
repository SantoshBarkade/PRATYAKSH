import { Types } from 'mongoose';
import { ExecutionUpdate, IExecutionUpdate } from '../models/ExecutionUpdate';
import { Reconciliation, IReconciliation } from '../models/Reconciliation';
import { progressService } from './progress.service';
import { riskService } from './risk.service';
import { ConflictDetail } from '../types';

export class ReconciliationService {
  /**
   * Reconciles an incoming evidence update against existing evidence for the same activity.
   * Dynamically groups multi-source observations within the active reporting cycle.
   * Modifies the incoming update's status in memory. You must .save() it afterwards.
   */
  async reconcile(incoming: IExecutionUpdate): Promise<{ status: 'ALIGNED' | 'CONFLICT'; reconciliationId?: Types.ObjectId }> {
    if (!incoming.activityId) {
      return { status: 'ALIGNED' };
    }

    // Determine normalized observation date for incoming update
    const incomingDateStr = incoming.logicalDate || (incoming.reportDate ? incoming.reportDate.toISOString().split('T')[0] : null);
    const incomingTime = incoming.reportDate
      ? incoming.reportDate.getTime()
      : (incomingDateStr ? new Date(incomingDateStr).getTime() : null);

    // Find all valid candidate evidence records for the same project and activity
    const candidates = await ExecutionUpdate.find({
      projectId: incoming.projectId,
      activityId: incoming.activityId,
      _id: { $ne: incoming._id },
      processingStatus: { $in: ['MATCHED', 'PROCESSED', 'CONFLICT_REVIEW_REQUIRED'] }
    });

    if (candidates.length === 0) {
      return { status: 'ALIGNED' };
    }

    // Check for an existing open conflict record for this activity
    const activeRec = await Reconciliation.findOne({
      projectId: incoming.projectId,
      activityId: incoming.activityId,
      status: 'CONFLICT'
    });

    const activeRecEvidenceIds = new Set(
      activeRec ? activeRec.evidenceIds.map(id => id.toString()) : []
    );

    // Reporting cycle proximity: evidence within 14 days belongs to the same reporting/observation cycle
    const CYCLE_WINDOW_DAYS = 14;
    const existingEvidence = candidates.filter(e => {
      // Always include if already part of an active unresolved conflict
      if (activeRecEvidenceIds.has(e._id.toString())) {
        return true;
      }

      const eDateStr = e.logicalDate || (e.reportDate ? e.reportDate.toISOString().split('T')[0] : null);
      const eTime = e.reportDate
        ? e.reportDate.getTime()
        : (eDateStr ? new Date(eDateStr).getTime() : null);

      if (incomingTime !== null && !isNaN(incomingTime) && eTime !== null && !isNaN(eTime)) {
        const diffDays = Math.abs(incomingTime - eTime) / (1000 * 60 * 60 * 24);
        return diffDays <= CYCLE_WINDOW_DAYS;
      }

      // If one or both lack dates, check record creation time proximity (14 days)
      const eCreatedTime = e.createdAt ? new Date(e.createdAt).getTime() : null;
      const incomingCreatedTime = incoming.createdAt ? new Date(incoming.createdAt).getTime() : Date.now();
      if (eCreatedTime && Math.abs(incomingCreatedTime - eCreatedTime) / (1000 * 60 * 60 * 24) <= CYCLE_WINDOW_DAYS) {
        return true;
      }

      return true;
    });

    if (existingEvidence.length === 0) {
      return { status: 'ALIGNED' };
    }

    const conflicts: ConflictDetail[] = [];

    // Compare progress (Any numerical discrepancy between distinct evidence streams constitutes an audit conflict)
    if (typeof incoming.progress === 'number') {
      const conflictingProgress = existingEvidence.filter(e => 
        typeof e.progress === 'number' && Math.abs(e.progress - (incoming.progress as number)) > 0
      );
      if (conflictingProgress.length > 0) {
        conflicts.push({
          field: 'progress',
          values: [
            { evidenceId: incoming._id.toString(), value: incoming.progress },
            ...conflictingProgress.map(e => ({ evidenceId: e._id.toString(), value: e.progress }))
          ]
        });
      }
    }

    // Compare status (Direct contradictions e.g. COMPLETED vs IN_PROGRESS/DELAYED/NOT_STARTED)
    if (incoming.extractedStatus) {
      const incomingNormalized = incoming.extractedStatus.toUpperCase().trim();
      const conflictingStatus = existingEvidence.filter(e => {
        if (!e.extractedStatus) return false;
        const eNorm = e.extractedStatus.toUpperCase().trim();
        if (eNorm === incomingNormalized) return false;

        // VERIFIED is an audit state compatible with IN_PROGRESS / ON_TRACK
        const isProgressA = ['IN_PROGRESS', 'ON_TRACK', 'VERIFIED'].includes(incomingNormalized) &&
                            ['IN_PROGRESS', 'ON_TRACK', 'VERIFIED'].includes(eNorm);
        if (isProgressA) return false;

        return true;
      });

      if (conflictingStatus.length > 0) {
        conflicts.push({
          field: 'status',
          values: [
            { evidenceId: incoming._id.toString(), value: incoming.extractedStatus },
            ...conflictingStatus.map(e => ({ evidenceId: e._id.toString(), value: e.extractedStatus }))
          ]
        });
      }
    }

    if (conflicts.length > 0) {
      incoming.processingStatus = 'CONFLICT_REVIEW_REQUIRED';
      await incoming.save();

      // Collect all evidence IDs genuinely involved in the conflict
      const involvedEvidenceIdStrings = new Set<string>();
      involvedEvidenceIdStrings.add(incoming._id.toString());
      for (const c of conflicts) {
        for (const v of c.values) {
          involvedEvidenceIdStrings.add(v.evidenceId.toString());
        }
      }

      // Upsert reconciliation record for this activity
      let rec = activeRec;
      if (!rec) {
        rec = await Reconciliation.findOne({
          projectId: incoming.projectId,
          activityId: incoming.activityId,
          status: 'CONFLICT'
        });
      }

      const effectiveLogicalDate = incoming.logicalDate ||
        (incoming.reportDate ? incoming.reportDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

      if (!rec) {
        rec = new Reconciliation({
          projectId: incoming.projectId,
          activityId: incoming.activityId,
          logicalDate: effectiveLogicalDate,
          status: 'CONFLICT',
          evidenceIds: Array.from(involvedEvidenceIdStrings).map(id => new Types.ObjectId(id)),
          conflicts
        });
      } else {
        if (incoming.logicalDate) {
          rec.logicalDate = incoming.logicalDate;
        }

        // Append new evidence IDs without duplicates
        for (const idStr of involvedEvidenceIdStrings) {
          if (!rec.evidenceIds.some(existingId => existingId.toString() === idStr)) {
            rec.evidenceIds.push(new Types.ObjectId(idStr));
          }
        }

        // Merge conflicts by field
        for (const c of conflicts) {
          const existingConflict = rec.conflicts.find(x => x.field === c.field);
          if (existingConflict) {
            for (const v of c.values) {
              const exists = existingConflict.values.some(
                ev => ev.evidenceId.toString() === v.evidenceId.toString()
              );
              if (!exists) {
                existingConflict.values.push(v);
              }
            }
          } else {
            rec.conflicts.push(c);
          }
        }
      }

      await rec.save();

      // Mark all conflicting evidence as CONFLICT_REVIEW_REQUIRED
      for (const e of existingEvidence) {
        if (involvedEvidenceIdStrings.has(e._id.toString()) && e.processingStatus !== 'CONFLICT_REVIEW_REQUIRED') {
          e.processingStatus = 'CONFLICT_REVIEW_REQUIRED';
          await e.save();
        }
      }

      return { status: 'CONFLICT', reconciliationId: rec._id };
    }

    return { status: 'ALIGNED' };
  }

  async resolveReconciliation(
    projectId: string,
    reconciliationId: string,
    action: 'ACCEPT_EVIDENCE' | 'KEEP_CURRENT_STATE',
    resolutionEvidenceId?: string
  ) {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(reconciliationId)) {
      throw new Error('Invalid IDs');
    }

    const rec = await Reconciliation.findOne({
      _id: new Types.ObjectId(reconciliationId),
      projectId: new Types.ObjectId(projectId),
      status: 'CONFLICT'
    });

    if (!rec) {
      throw new Error('Active reconciliation not found');
    }

    rec.status = 'RESOLVED';
    rec.resolvedAt = new Date();
    rec.resolutionAction = action;

    if (action === 'ACCEPT_EVIDENCE') {
      if (!resolutionEvidenceId || !Types.ObjectId.isValid(resolutionEvidenceId)) {
        throw new Error('resolutionEvidenceId is required when accepting evidence');
      }
      rec.resolutionEvidenceId = new Types.ObjectId(resolutionEvidenceId);
      
      const winningEvidence = await ExecutionUpdate.findById(resolutionEvidenceId);
      if (!winningEvidence) {
         throw new Error('Winning evidence not found');
      }

      // Mark the chosen evidence as processed so it won't conflict with itself next time
      winningEvidence.processingStatus = 'PROCESSED';
      await winningEvidence.save();

      // Process Progress (Trusted State Update)
      const result = await progressService.processExecutionUpdate(
        rec.activityId.toString(), 
        winningEvidence._id.toString()
      );
      
      if (result && result.activityUpdated) {
        // Propagate Risks (M4)
        await riskService.propagateRisks(projectId);
      }
    }
    
    // For KEEP_CURRENT_STATE, we just mark it resolved and don't update activity
    // But we should mark all involved evidence as PROCESSED or DISCARDED?
    // The prompt says "do not mutate Activity. Resolve the reconciliation. Preserve all evidence."
    // Let's just mark them PROCESSED or leave as CONFLICT_REVIEW_REQUIRED but since the reconciliation is RESOLVED, it's fine.
    // However, to prevent them from causing future conflicts over and over, we could mark them PROCESSED or RESOLVED.
    // Let's mark all involved evidence as PROCESSED so they don't clog up the queue.
    const allEvidence = await ExecutionUpdate.find({ _id: { $in: rec.evidenceIds } });
    for (const ev of allEvidence) {
       // We can mark all as PROCESSED or keep them as CONFLICT_REVIEW_REQUIRED and rely on Reconciliation status.
       // Marking PROCESSED makes them disappear from "active" queues if any.
       ev.processingStatus = 'PROCESSED';
       await ev.save();
    }

    await rec.save();
    
    return rec;
  }
}

export const reconciliationService = new ReconciliationService();
