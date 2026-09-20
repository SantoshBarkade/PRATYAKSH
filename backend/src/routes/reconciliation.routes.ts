import { Router } from 'express';
import { reconciliationController } from '../controllers/reconciliation.controller';

const router = Router({ mergeParams: true });

router.get('/', reconciliationController.getReconciliations.bind(reconciliationController));
router.post('/:id/resolve', reconciliationController.resolveReconciliation.bind(reconciliationController));

// Activity bound evidence
router.get('/activities/:activityId/evidence', reconciliationController.getEvidence.bind(reconciliationController));

export default router;
