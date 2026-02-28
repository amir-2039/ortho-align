import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { UserRole } from '@prisma/client';
import { PrescriptionService } from '../services/prescription.service';
import { CaseService } from '../services/case.service';

const router = Router();

/**
 * @swagger
 * /api/cases/{id}/prescription:
 *   post:
 *     tags: [Prescriptions]
 *     summary: Create or update case prescription
 *     description: Add or update prescription details for a case (Step 2 of case creation)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrescriptionInput'
 *     responses:
 *       200:
 *         description: Prescription created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prescription:
 *                   $ref: '#/components/schemas/Prescription'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only modify own cases
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/prescription',
  authenticate,
  authorize(UserRole.CLIENT, UserRole.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - can only modify your own cases' });
        return;
      }

      const prescription = await PrescriptionService.createOrUpdatePrescription(caseId, req.body);

      res.json({ prescription });
    } catch (error: any) {
      console.error('Create/update prescription error:', error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/prescription:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Get case prescription
 *     description: Retrieve prescription details for a case
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     responses:
 *       200:
 *         description: Prescription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prescription:
 *                   $ref: '#/components/schemas/Prescription'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case or prescription not found
 */
router.get('/:id/prescription', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;

    const caseRecord = await CaseService.getCaseById(caseId);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (
      req.user!.role === UserRole.EMPLOYEE &&
      caseRecord.designerId !== req.user!.id &&
      caseRecord.qcId !== req.user!.id
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const prescription = await PrescriptionService.getPrescription(caseId);

    if (!prescription) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/cases/{id}/prescription:
 *   delete:
 *     tags: [Prescriptions]
 *     summary: Delete case prescription
 *     description: Remove prescription from a case
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     responses:
 *       200:
 *         description: Prescription deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Prescription deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Prescription not found
 */
router.delete(
  '/:id/prescription',
  authenticate,
  authorize(UserRole.CLIENT, UserRole.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const result = await PrescriptionService.deletePrescription(caseId);

      res.json(result);
    } catch (error: any) {
      console.error('Delete prescription error:', error);
      res.status(error.message === 'Prescription not found' ? 404 : 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }
);

export default router;
