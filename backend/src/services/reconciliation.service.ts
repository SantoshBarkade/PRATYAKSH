import { Types } from 'mongoose';
import { ExecutionUpdate, IExecutionUpdate } from '../models/ExecutionUpdate';
import { Reconciliation, IReconciliation } from '../models/Reconciliation';
import { progressService } from './progress.service';
import { riskService } from './risk.service';
import { ConflictDetail } from '../types';

export class ReconciliationService {
  /**
   * Reconciles an incoming evidence update against existing evidence for the same activity and date.
   * Modifies the incoming update's status in memory. You must .save() it afterwards.
   */
  async reconcile(incoming: IExecutionUpdate): Promise<{ status: 'ALIGNED' | 'CONFLICT'; reconciliationId?: Types.ObjectId }> {
    if (!incoming.activityId || !incoming.logicalDate) {
      return { status: 'ALIGNED' };
    }

    // Find other evidence for the same activity on the same logical date
    const existingEvidence = await ExecutionUpdate.find({
      projectId: incoming.projectId,
      activityId: incoming.activityId,
      logicalDate: incoming.logicalDate,
      _id: { $ne: incoming._id },
      // don't reconcile against discarded/failed evidence
      processingStatus: { $in: ['MATCHED', 'PROCESSED', 'CONFLICT_REVIEW_REQUIRED'] }
    });

    if (existingEvidence.length === 0) {
      return { status: 'ALIGNED' };
    }

    const conflicts: ConflictDetail[] = [];

    // Compare progress (Tolerance: 5 percentage points)
    if (typeof incoming.progress === 'number') {
      const conflictingProgress = existingEvidence.filter(e => 
        typeof e.progress === 'number' && Math.abs(e.progress - (incoming.progress as number)) > 5
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
    } else {
      // If incoming has no progress but others do, it's not strictly a conflict unless it contradicts.
      // We will skip strict conflict on null progress for now.
    }

    // Compare status
    if (incoming.extractedStatus) {
      const incomingNormalized = incoming.extractedStatus.toUpperCase().trim();
      const conflictingStatus = existingEvidence.filter(e => 
        e.extractedStatus && e.extractedStatus.toUpperCase().trim() !== incomingNormalized
      );
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

      const allEvidenceIds = [incoming._id, ...existingEvidence.map(e => e._id)];
      
      // Upsert reconciliation record for this activity + date
      // Try to find an unresolved reconciliation for this activity to group them
      // Alternatively, just create a new one. Since multiple conflicts can arise, 
      // let's group by activity and date. We don't have a reportDate on Reconciliation, 
      // but we can query by existing unresolved conflict for this activity.
      let rec = await Reconciliation.findOne({
        projectId: incoming.projectId,
        activityId: incoming.activityId,
        logicalDate: incoming.logicalDate,
        status: 'CONFLICT'
      });

      if (!rec) {
        rec = new Reconciliation({
          projectId: incoming.projectId,
          activityId: incoming.activityId,
          logicalDate: incoming.logicalDate,
          status: 'CONFLICT',
          evidenceIds: allEvidenceIds,
          conflicts
        });
      } else {
        // Append new evidence and conflicts
        allEvidenceIds.forEach(id => {
          if (!rec!.evidenceIds.includes(id)) {
             rec!.evidenceIds.push(id);
          }
        });
        
        // Simplistic conflict merge (in reality, we might want to merge fields carefully)
        for (const c of conflicts) {
          const existingConflict = rec.conflicts.find(x => x.field === c.field);
          if (existingConflict) {
             c.values.forEach(v => {
                if (!existingConflict.values.find(ev => ev.evidenceId.toString() === v.evidenceId.toString())) {
                   existingConflict.values.push(v);
                }
             });
          } else {
             rec.conflicts.push(c);
          }
        }
      }
      
      await rec.save();

      // Mark other conflicting evidence as CONFLICT_REVIEW_REQUIRED if not already
      for (const e of existingEvidence) {
        if (e.processingStatus !== 'CONFLICT_REVIEW_REQUIRED') {
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
