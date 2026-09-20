import { Router } from 'express';
import { uploadReport, submitTextReport, listReports } from '../controllers/report.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router({ mergeParams: true });

router.post('/upload', uploadMiddleware, uploadReport);
router.post('/text', submitTextReport);
router.get('/', listReports);

export const reportRoutes = router;
