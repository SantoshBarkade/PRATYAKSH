import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { executionEventService } from '../services/execution-event.service';
import { reportProcessingService } from '../services/report-processing.service';
import { parseExecutionXlsx } from '../parsers/execution-xlsx.parser';

export class EvidenceController {
  async importEvidence(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, error: 'Invalid project ID' });
      }

      // If it's a file upload (XLSX, PDF, TXT)
      if (req.file) {
        const ext = req.file.originalname.split('.').pop()?.toLowerCase();
        
        if (ext === 'xlsx') {
          const result = parseExecutionXlsx(req.file.buffer);
          
          if (result.errors.length > 0 && result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid XLSX format', details: result.errors });
          }

          // Process each valid row as a TEXT event (or direct properties)
          // For now, we simulate extraction by manually creating the event text or calling a new method?
          // The prompt says: "build a canonical prototype execution XLSX parser... Valid rows should continue processing."
          // We can construct a synthetic text like: "Activity Code: X, Name: Y, Progress: Z, Date: D, Status: S"
          // Or we can add an ingest method directly to executionEventService that takes structured data.
          // Let's add `processStructuredEvent` to `executionEventService` to bypass LLM.
          
          const processed = [];
          for (const row of result.rows) {
             const r = await executionEventService.processStructuredEvent(projectId, row, req.file.originalname);
             processed.push(r);
          }

          return res.json({
            success: true,
            importedRows: processed.length,
            results: processed,
            errors: result.errors,
            warnings: result.warnings
          });

        } else if (ext === 'pdf') {
          const result = await reportProcessingService.processReport(projectId, 'PDF', req.file.buffer, null, req.file.originalname, null);
          return res.json({ success: true, result });
        } else if (ext === 'txt') {
          const result = await reportProcessingService.processReport(projectId, 'TXT', req.file.buffer, null, req.file.originalname, null);
          return res.json({ success: true, result });
        } else {
           return res.status(400).json({ success: false, error: 'Unsupported file type' });
        }
      }

      // If it's direct text
      const { text, reportDate } = req.body;
      if (text) {
         const result = await executionEventService.processEvent(projectId, text, reportDate);
         return res.json({ success: true, result });
      }

      return res.status(400).json({ success: false, error: 'No file or text provided' });
    } catch (error: any) {
      console.error('Import Evidence Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const evidenceController = new EvidenceController();
