import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { extractionService } from './extraction.service';
import { matchingService } from './matching.service';
import { progressService } from './progress.service';
import { getLogicalDateString } from '../utils/date.utils';
import { riskService } from './risk.service';

export class ExecutionEventService {
  /**
   * Process a natural language field execution event.
   */
  async processEvent(
    projectId: string,
    text: string,
    reportDateMetadata: string | null
  ) {
    if (!text || text.trim().length === 0) {
      const err = new Error('Event contains insufficient text for extraction');
      err.name = 'ValidationError';
      throw err;
    }

    const project = await Project.findById(projectId);
    if (!project) {
      const err = new Error('Project not found');
      err.name = 'NotFoundError';
      throw err;
    }

    // 1. Extract structured data
    let extraction;
    let processingStatus: 'EXTRACTED' | 'FAILED' = 'EXTRACTED';
    let processingError: string | null = null;

    try {
      extraction = await extractionService.extractReportData(text.trim());
      
      // Date Normalization
      if (extraction.date) {
        let dateObj = new Date(extraction.date);
        const projectYear = project.plannedStartDate.getUTCFullYear();
        
        if (!/\d{4}/.test(extraction.date)) {
           dateObj = new Date(`${extraction.date} ${projectYear}`);
        }
        
        if (isNaN(dateObj.getTime())) {
          extraction.date = reportDateMetadata ? new Date(reportDateMetadata).toISOString() : null;
        } else {
           extraction.date = dateObj.toISOString();
        }
      } else if (reportDateMetadata) {
        extraction.date = new Date(reportDateMetadata).toISOString();
      }

      if (extraction.progress !== null) {
        if (extraction.progress < 0 || extraction.progress > 100) {
          extraction.progress = null; 
        }
      }
    } catch (err: any) {
      processingStatus = 'FAILED';
      processingError = err.message || 'Unknown extraction error';
      extraction = {
        activity: null,
        date: null,
        progress: null,
        reason: null,
        status: null,
        extractionConfidence: 0,
        extractionMethod: 'DETERMINISTIC_FALLBACK' as const
      };
    }

    // 2. Persist Evidence
    const update = new ExecutionUpdate({
      projectId: project._id,
      activityId: null,
      sourceType: 'TEXT',
      sourceFileName: null,
      reportDate: extraction.date ? new Date(extraction.date) : (reportDateMetadata ? new Date(reportDateMetadata) : null),
      logicalDate: extraction.date ? getLogicalDateString(new Date(extraction.date)) : (reportDateMetadata ? getLogicalDateString(new Date(reportDateMetadata)) : null),
      rawText: text.trim(),
      extractedActivity: extraction.activity,
      progress: extraction.progress,
      reason: extraction.reason,
      extractedStatus: extraction.status,
      extractionConfidence: extraction.extractionConfidence,
      extractionMethod: extraction.extractionMethod,
      processingStatus: processingStatus,
      processingError
    });
    
    await update.save();

    let matchResult;
    let progressUpdate;

    if (processingStatus === 'EXTRACTED' && extraction.activity) {
      // 3. Match Activity
      matchResult = await matchingService.matchActivity(project._id.toString(), extraction.activity);
      
      update.matchScore = matchResult.matchScore ?? null;
      update.matchMethod = matchResult.matchMethod ?? null;
      update.matchingDecision = matchResult.decision;
      
      if (matchResult.decision === 'AUTO_MATCH' && matchResult.matchedActivityId) {
        update.activityId = matchResult.matchedActivityId as any;
        update.processingStatus = 'MATCHED';
        await update.save();
        
        const { reconciliationService } = require('./reconciliation.service');
        const reconciliationResult = await reconciliationService.reconcile(update);
        
        if (reconciliationResult.status === 'ALIGNED') {
          // 4. Process Progress (Trusted State Update)
          const result = await progressService.processExecutionUpdate(matchResult.matchedActivityId, update._id.toString());
          if (result && result.activityUpdated) {
             update.processingStatus = 'PROCESSED';
             await update.save();
             progressUpdate = result;
             
             // 5. Propagate Risks (M4)
             await riskService.propagateRisks(projectId);
          } else if (result && !result.activityUpdated) {
             update.processingStatus = 'PROCESSED';
             await update.save();
          }
        }
      } else if (matchResult.decision === 'REVIEW_REQUIRED' || matchResult.decision === 'UNMATCHED') {
        update.processingStatus = matchResult.decision;
        await update.save();
      }
    } else if (processingStatus === 'EXTRACTED' && !extraction.activity) {
      // If LLM couldn't even extract an activity name, mark as UNMATCHED
      update.processingStatus = 'UNMATCHED';
      update.matchingDecision = 'UNMATCHED';
      await update.save();
    }

    return {
      executionUpdateId: update._id,
      projectId: project._id,
      processingStatus: update.processingStatus,
      extraction,
      matching: matchResult,
      progress: progressUpdate ? {
         actual: progressUpdate.actualProgress,
         plannedAtReportDate: progressUpdate.plannedProgress,
         variance: progressUpdate.variance
      } : undefined,
      activityStatus: progressUpdate ? progressUpdate.activityStatus : undefined
    };
  }

  /**
   * Return bounded REVIEW_REQUIRED / UNMATCHED evidence.
   */
  async listReviewQueue(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      const err = new Error('Invalid project ID');
      err.name = 'ValidationError';
      throw err;
    }

    const pid = new Types.ObjectId(projectId);

    return await ExecutionUpdate.find({
      projectId: pid,
      processingStatus: { $in: ['REVIEW_REQUIRED', 'UNMATCHED'] }
    }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Human resolves an ambiguous event to a specific activity or discards it.
   */
  async resolveExecutionEvent(projectId: string, executionUpdateId: string, action: string, activityId?: string) {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(executionUpdateId)) {
      const err = new Error('Invalid IDs provided');
      err.name = 'ValidationError';
      throw err;
    }
    if (action === 'MATCH' && activityId && !Types.ObjectId.isValid(activityId)) {
      const err = new Error('Invalid activity ID provided');
      err.name = 'ValidationError';
      throw err;
    }

    const update = await ExecutionUpdate.findOne({ _id: new Types.ObjectId(executionUpdateId), projectId: new Types.ObjectId(projectId) });
    
    if (!update) {
      const err = new Error('Execution update not found');
      err.name = 'NotFoundError';
      throw err;
    }

    if (!['REVIEW_REQUIRED', 'UNMATCHED'].includes(update.processingStatus)) {
      const err = new Error(`Cannot resolve update in state ${update.processingStatus}`);
      err.name = 'ValidationError';
      throw err;
    }

    if (action === 'DISCARD') {
      update.processingStatus = 'DISCARDED';
      update.matchingDecision = 'MANUAL';
      await update.save();
      
      return {
        executionUpdateId: update._id,
        projectId,
        processingStatus: update.processingStatus,
        progressUpdated: false
      };
    }

    // Update with human resolution
    update.activityId = new Types.ObjectId(activityId!) as any;
    update.processingStatus = 'MATCHED';
    update.matchingDecision = 'MANUAL';
    await update.save();

    const { reconciliationService } = require('./reconciliation.service');
    const reconciliationResult = await reconciliationService.reconcile(update);
    
    if (reconciliationResult.status === 'ALIGNED') {
      // 4. Process Progress (Trusted State Update)
      const result = await progressService.processExecutionUpdate(activityId!, update._id.toString());
      
      if (result && result.activityUpdated) {
         update.processingStatus = 'PROCESSED';
         await update.save();
         
         // 5. Propagate Risks (M4)
         await riskService.propagateRisks(projectId);
      } else if (result && !result.activityUpdated) {
         update.processingStatus = 'PROCESSED';
         await update.save();
      }
    }

    return {
      executionUpdateId: update._id,
      projectId,
      activityId,
      processingStatus: update.processingStatus,
      progressUpdated: update.processingStatus === 'PROCESSED'
    };
  }

  /**
   * Processes a structured event (e.g. from XLSX).
   */
  async processStructuredEvent(projectId: string, row: any, sourceFileName: string | null) {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    const update = new ExecutionUpdate({
      projectId: project._id,
      activityId: null,
      sourceType: 'XLSX',
      sourceFileName,
      reportDate: new Date(row.reportDate),
      logicalDate: row.logicalDate || getLogicalDateString(new Date(row.reportDate)),
      rawText: JSON.stringify(row),
      extractedActivity: row.activityCode || row.activityName,
      progress: row.progress,
      reason: row.remarks,
      extractedStatus: row.status,
      extractionConfidence: 1, // deterministic source
      extractionMethod: 'DETERMINISTIC_FALLBACK',
      processingStatus: 'EXTRACTED'
    });
    
    await update.save();

    let matchResult;
    let progressUpdate;

    if (row.activityCode || row.activityName) {
      matchResult = await matchingService.matchActivity(project._id.toString(), row.activityCode || row.activityName);
      
      update.matchScore = matchResult.matchScore ?? null;
      update.matchMethod = matchResult.matchMethod ?? null;
      update.matchingDecision = matchResult.decision;
      
      if (matchResult.decision === 'AUTO_MATCH' && matchResult.matchedActivityId) {
        update.activityId = matchResult.matchedActivityId as any;
        update.processingStatus = 'MATCHED';
        await update.save();
        
        const { reconciliationService } = require('./reconciliation.service');
        const reconciliationResult = await reconciliationService.reconcile(update);
        
        if (reconciliationResult.status === 'ALIGNED') {
          const result = await progressService.processExecutionUpdate(matchResult.matchedActivityId, update._id.toString());
          if (result && result.activityUpdated) {
             update.processingStatus = 'PROCESSED';
             await update.save();
             progressUpdate = result;
             await riskService.propagateRisks(projectId);
          } else if (result && !result.activityUpdated) {
             update.processingStatus = 'PROCESSED';
             await update.save();
          }
        }
      } else if (matchResult.decision === 'REVIEW_REQUIRED' || matchResult.decision === 'UNMATCHED') {
        update.processingStatus = matchResult.decision;
        await update.save();
      }
    } else {
      update.processingStatus = 'UNMATCHED';
      update.matchingDecision = 'UNMATCHED';
      await update.save();
    }

    return {
      executionUpdateId: update._id,
      projectId: project._id,
      processingStatus: update.processingStatus,
      matching: matchResult,
      progress: progressUpdate ? {
         actual: progressUpdate.actualProgress,
         plannedAtReportDate: progressUpdate.plannedProgress,
         variance: progressUpdate.variance
      } : undefined,
      activityStatus: progressUpdate ? progressUpdate.activityStatus : undefined
    };
  }
}

export const executionEventService = new ExecutionEventService();
