import { Project } from '../models/Project';
import { ExecutionUpdate } from '../models/ExecutionUpdate';
import { parsePdf } from '../parsers/pdf.parser';
import { parseTxt } from '../parsers/text.parser';
import { extractionService } from './extraction.service';
import { SourceType } from '../types';

export class ReportProcessingService {
  async processReport(
    projectId: string,
    sourceType: SourceType,
    fileBuffer: Buffer | null,
    directText: string | null,
    fileName: string | null,
    reportDateMetadata: string | null
  ) {
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
    } else if (sourceType === 'TXT') {
      if (!fileBuffer) throw new Error('TXT buffer missing');
      rawText = parseTxt(fileBuffer);
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
        
        // If the string doesn't contain a 4 digit year, we append the project year.
        if (!/\d{4}/.test(extraction.date)) {
           dateObj = new Date(`${extraction.date} ${projectYear}`);
        }
        
        if (isNaN(dateObj.getTime())) {
          // If we have reportDateMetadata, use it, else null
          extraction.date = reportDateMetadata ? new Date(reportDateMetadata).toISOString() : null;
        } else {
           extraction.date = dateObj.toISOString();
        }
      } else if (reportDateMetadata) {
        extraction.date = new Date(reportDateMetadata).toISOString();
      }

      // Validation
      if (extraction.progress !== null) {
        if (extraction.progress < 0 || extraction.progress > 100) {
          extraction.progress = null; // invalid progress ignored instead of crashing
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

    // 4. Save initial ExecutionUpdate (so we have an ID and record of the report)
    const update = new ExecutionUpdate({
      projectId: project._id,
      activityId: null,
      sourceType,
      sourceFileName: fileName,
      reportDate: extraction.date ? new Date(extraction.date) : (reportDateMetadata ? new Date(reportDateMetadata) : null),
      rawText,
      extractedActivity: extraction.activity,
      progress: extraction.progress,
      reason: extraction.reason,
      extractedStatus: extraction.status,
      extractionConfidence: extraction.extractionConfidence,
      extractionMethod: extraction.extractionMethod,
      processingStatus: processingStatus, // Start with EXTRACTED or FAILED
      processingError
    });
    
    await update.save();

    let matchResult;
    let progressUpdate;

    if (processingStatus === 'EXTRACTED' && extraction.activity) {
      // 5. Match Activity
      matchResult = await require('./matching.service').matchingService.matchActivity(project._id.toString(), extraction.activity);
      
      update.matchScore = matchResult.matchScore ?? null;
      update.matchMethod = matchResult.matchMethod ?? null;
      update.matchingDecision = matchResult.decision;
      
      if (matchResult.decision === 'AUTO_MATCH' && matchResult.matchedActivityId) {
        update.activityId = matchResult.matchedActivityId as any;
        update.processingStatus = 'MATCHED';
        await update.save();
        
        const reconciliationResult = await require('./reconciliation.service').reconciliationService.reconcile(update);
        
        if (reconciliationResult.status === 'ALIGNED') {
          // 6. Process Progress
          const result = await require('./progress.service').progressService.processExecutionUpdate(matchResult.matchedActivityId, update._id.toString());
          if (result && result.activityUpdated) {
             update.processingStatus = 'PROCESSED';
             await update.save();
             progressUpdate = result;
             
             // 7. M3 -> M4 Integration (Risk Propagation)
             await require('./risk.service').riskService.propagateRisks(projectId);
          } else if (result && !result.activityUpdated) {
             // Out of order or ignored report
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

    return {
      reportId: update._id,
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
  }
}

export const reportProcessingService = new ReportProcessingService();
