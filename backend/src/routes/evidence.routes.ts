import { Router } from 'express';
import multer from 'multer';
import { evidenceController } from '../controllers/evidence.controller';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('file'), evidenceController.importEvidence.bind(evidenceController));

export default router;
