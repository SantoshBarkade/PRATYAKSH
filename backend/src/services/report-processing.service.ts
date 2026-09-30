import { Project } from '../models/Project';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { parsePdf } from '../parsers/pdf.parser';
import { parseTxt, extractSignalsFromText } from '../parsers/text.parser';
import { extractionService } from './extraction.service';
import { matchingService } from './matching.service';
import { reconciliationService } from './reconciliation.service';
import { progressService } from './progress.service';
import { riskService } from './risk.service';
import { getLogicalDateString } from '../utils/date.utils';
import { SourceType, ExecutionSignal } from '../types';

export class ReportProcessingService {
  /**
   * Processes a multi-signal TXT site report or evidence document.
   * Robust, deterministic, and supports natural text variants.
   */
  async processTxtReport(
    projectId: string,
    fileBuffer: Buffer | null,
    directText: string | null,
    fileName: string | null,
    reportDateMetadata: string | null
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      const err = new Error('Project not found');
      err.name = 'NotFoundError';
      throw err;
    }

    let rawText = '';
    if (fileBuffer) {
      rawText = parseTxt(fileBuffer);
    } else if (directText) {
      rawText = directText.trim();
    } else {
      throw new Error('No TXT content provided');
    }

    // 1. Extract all structured execution signals
    const { signals, extractionMethod } = await extractionService.extractSignals(rawText, {
      sourceFileName: fileName,
      projectId
    });

    if (signals.length === 0) {
      return {
        success: true,
        importedRows: 0,
        results: [],
        result: {
          events: [],
          signalsCount: 0,
          matchedActivities: 0,
          unmatchedActivities: 0,
          extractionMethod
        },
        warnings: ['No valid execution signals identified in document.']
      };
    }

    const processedResults = [];
    const matchedActivities: string[] = [];
    const unmatchedActivities: string[] = [];

    // 2. Process each execution signal
    for (const signal of signals) {
      // Date Normalization
      let reportDate: Date | null = null;
      let logicalDate: string | null = null;

      const dateStr = signal.observationDate || reportDateMetadata;
      if (dateStr) {
        let dateObj = new Date(dateStr);
        const projectYear = project.plannedStartDate.getUTCFullYear();
        
        if (!/\d{4}/.test(dateStr)) {
          dateObj = new Date(`${dateStr} ${projectYear}`);
        }
        
        if (!isNaN(dateObj.getTime())) {
          reportDate = dateObj;
          logicalDate = getLogicalDateString(dateObj);
        }
      }

      // Persist initial ExecutionUpdate
      const matchTarget = signal.activityCode || signal.activityName;
      const update = new ExecutionUpdate({
        projectId: project._id,
        activityId: null,
        sourceType: 'TXT',
        sourceFileName: fileName || signal.source,
        reportDate,
        logicalDate,
        rawText: signal.rawText || rawText,
        extractedActivity: matchTarget,
        progress: signal.actualProgress,
        reason: signal.reason,
        extractedStatus: signal.status,
        extractionConfidence: signal.confidence ?? 1.0,
        extractionMethod,
        processingStatus: 'EXTRACTED'
      });

      await update.save();

      let matchResult;
      let progressUpdate;

      // 3. Match against project schedule
      if (matchTarget) {
        matchResult = await matchingService.matchActivity(project._id.toString(), matchTarget);
        
        update.matchScore = matchResult.matchScore ?? null;
        update.matchMethod = matchResult.matchMethod ?? null;
        update.matchingDecision = matchResult.decision;

        if (matchResult.decision === 'AUTO_MATCH' && matchResult.matchedActivityId) {
          update.activityId = matchResult.matchedActivityId as any;
          update.processingStatus = 'MATCHED';
          await update.save();

          matchedActivities.push(signal.activityCode || matchResult.matchedActivityCode || matchTarget);

          // Reconcile multi-source evidence
          const reconciliationResult = await reconciliationService.reconcile(update);

          if (reconciliationResult.status === 'ALIGNED') {
            // Apply trusted progress update
            const result = await progressService.processExecutionUpdate(
              matchResult.matchedActivityId,
              update._id.toString()
            );

            if (result && result.activityUpdated) {
              update.processingStatus = 'PROCESSED';
              await update.save();
              progressUpdate = result;

              // Propagate delay and dependency risks
              await riskService.propagateRisks(projectId);
            } else {
              update.processingStatus = 'PROCESSED';
              await update.save();
            }
          }
        } else {
          // UNMATCHED or REVIEW_REQUIRED: Route to review queue, DO NOT mutate Activity
          update.processingStatus = matchResult.decision === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'UNMATCHED';
          await update.save();
          unmatchedActivities.push(signal.activityCode || matchTarget);
        }
      } else {
        update.processingStatus = 'UNMATCHED';
        update.matchingDecision = 'UNMATCHED';
        await update.save();
        unmatchedActivities.push('UNKNOWN');
      }

      processedResults.push({
        executionUpdateId: update._id,
        projectId: project._id,
        activityCode: signal.activityCode,
        activityName: signal.activityName,
        actualProgress: signal.actualProgress,
        processingStatus: update.processingStatus,
        matchingDecision: update.matchingDecision,
        matching: matchResult,
        progress: progressUpdate ? {
          actual: progressUpdate.actualProgress,
          plannedAtReportDate: progressUpdate.plannedProgress,
          variance: progressUpdate.variance
        } : undefined,
        activityStatus: progressUpdate ? progressUpdate.activityStatus : undefined
      });
    }

    return {
      success: true,
      importedRows: processedResults.length,
      results: processedResults,
      result: {
        events: processedResults,
        signalsCount: processedResults.length,
        matchedActivities: matchedActivities.length,
        unmatchedActivities: unmatchedActivities.length,
        matchedList: matchedActivities,
        unmatchedList: unmatchedActivities,
        extractionMethod
      },
      summary: {
        totalSignals: processedResults.length,
        matched: matchedActivities,
        unmatched: unmatchedActivities,
        extractionMethod
      }
    };
  }

  /**
   * Backwards-compatible single-report processor (PDF / unstructured text).
   */
  async processReport(
    projectId: string,
    sourceType: SourceType,
    fileBuffer: Buffer | null,
    directText: string | null,
    fileName: string | null,
    reportDateMetadata: string | null
  ) {
    if (sourceType === 'TXT') {
      return this.processTxtReport(projectId, fileBuffer, directText, fileName, reportDateMetadata);
    }

    // 1. Validate project
    const project = await Project.findById(projectId);
    if (!project) {
      const err = new Error('Project not found');
      err.name = 'NotFoundError';
      throw err;
    }

    // 2. Extract / Parse text
    let rawText = '';
    if (sourceType === 'TEXT') {
      if (!directText || directText.trim().length === 0) {
        const err = new Error('Report contains insufficient text for extraction');
        err.name = 'ValidationError';
        throw err;
      }
      rawText = directText.trim();
    } else if (sourceType === 'PDF') {
      if (!fileBuffer) throw new Error('PDF buffer missing');
      rawText = await parsePdf(fileBuffer);
    } else {
      throw new Error(`Unsupported source type: ${sourceType}`);
    }

    // 3. Extract structured data
    let extraction;
    let processingStatus: 'EXTRACTED' | 'FAILED' = 'EXTRACTED';
    let processingError: string | null = null;

    try {
      extraction = await extractionService.extractReportData(rawText);
      
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

    // 4. Save initial ExecutionUpdate
    const update = new ExecutionUpdate({
      projectId: project._id,
      activityId: null,
      sourceType,
      sourceFileName: fileName,
      reportDate: extraction.date ? new Date(extraction.date) : (reportDateMetadata ? new Date(reportDateMetadata) : null),
      logicalDate: extraction.date ? getLogicalDateString(new Date(extraction.date)) : (reportDateMetadata ? getLogicalDateString(new Date(reportDateMetadata)) : null),
      rawText,
      extractedActivity: extraction.activity,
      progress: extraction.progress,
      reason: extraction.reason,
      extractedStatus: extraction.status,
      extractionConfidence: extraction.extractionConfidence,
      extractionMethod: extraction.extractionMethod,
      processingStatus,
      processingError
    });
    
    await update.save();

    let matchResult;
    let progressUpdate;

    if (processingStatus === 'EXTRACTED' && extraction.activity) {
      matchResult = await matchingService.matchActivity(project._id.toString(), extraction.activity);
      
      update.matchScore = matchResult.matchScore ?? null;
      update.matchMethod = matchResult.matchMethod ?? null;
      update.matchingDecision = matchResult.decision;
      
      if (matchResult.decision === 'AUTO_MATCH' && matchResult.matchedActivityId) {
        update.activityId = matchResult.matchedActivityId as any;
        update.processingStatus = 'MATCHED';
        await update.save();
        
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
    } else if (processingStatus === 'EXTRACTED' && !extraction.activity) {
      update.processingStatus = 'UNMATCHED';
      update.matchingDecision = 'UNMATCHED';
      await update.save();
    }

    const singleEvent = {
      executionUpdateId: update._id,
      projectId: project._id,
      sourceType,
      processingStatus: update.processingStatus,
      extraction,
      extractionConfidence: extraction.extractionConfidence,
      extractionMethod: extraction.extractionMethod,
      matching: matchResult,
      progress: progressUpdate ? {
        actual: progressUpdate.actualProgress,
        plannedAtReportDate: progressUpdate.plannedProgress,
        variance: progressUpdate.variance
      } : undefined,
      activityStatus: progressUpdate ? progressUpdate.activityStatus : undefined
    };

    return {
      success: true,
      importedRows: 1,
      results: [singleEvent],
      result: {
        events: [singleEvent],
        signalsCount: 1,
        ...singleEvent
      }
    };
  }
}

export const reportProcessingService = new ReportProcessingService();
