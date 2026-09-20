import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { reconciliationService } from '../services/reconciliation.service';
import { Reconciliation } from '../models/Reconciliation';
import { ExecutionUpdate } from '../models/ExecutionUpdate';

export class ReconciliationController {
  async getReconciliations(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, error: 'Invalid project ID' });
      }

      const reconciliations = await Reconciliation.find({ projectId: new Types.ObjectId(projectId) })
        .populate('activityId', 'activityCode name')
        .populate('evidenceIds')
        .sort({ createdAt: -1 });

      return res.json({ success: true, reconciliations });
    } catch (error: any) {
      console.error('Get Reconciliations Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getEvidence(req: Request, res: Response) {
    try {
      const { projectId, activityId } = req.params;
      if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(activityId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID' });
      }

      const evidence = await ExecutionUpdate.find({
        projectId: new Types.ObjectId(projectId),
        activityId: new Types.ObjectId(activityId),
      }).sort({ reportDate: -1 });

      return res.json({ success: true, evidence });
    } catch (error: any) {
      console.error('Get Evidence Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async resolveReconciliation(req: Request, res: Response) {
    try {
      const { projectId, id } = req.params;
      const resolution = req.body.action || req.body.resolution;
      const evidenceId = req.body.resolutionEvidenceId || req.body.evidenceId;

      if (!['ACCEPT_EVIDENCE', 'KEEP_CURRENT_STATE'].includes(resolution)) {
        return res.status(400).json({ success: false, error: 'Invalid resolution action' });
      }

      const result = await reconciliationService.resolveReconciliation(
        projectId,
        id,
        resolution as any,
        evidenceId
      );

      return res.json({ success: true, reconciliation: result });
    } catch (error: any) {
      console.error('Resolve Reconciliation Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const reconciliationController = new ReconciliationController();
