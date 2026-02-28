import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { UserRole } from '@prisma/client';
import { CaseSubmissionService } from '../services/case-submission.service';
import { CaseService } from '../services/case.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * @swagger
 * /api/cases/{id}/payment-proof:
 *   post:
 *     tags: [Case Submission]
 *     summary: Upload payment proof for case
 *     description: Upload payment proof document (Step 3 - Part 1)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Payment proof document (max 10MB)
 *     responses:
 *       200:
 *         description: Payment proof uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentProofUrl:
 *                   type: string
 *                   example: https://orthoalign.s3.ap-southeast-1.amazonaws.com/cases/clx789ghi/payment-proof/1234567890-receipt.pdf
 *       400:
 *         description: Invalid status or missing file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/payment-proof',
  authenticate,
  authorize(UserRole.CLIENT, UserRole.ADMIN),
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'Payment proof file is required' });
        return;
      }

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - can only upload to your own cases' });
        return;
      }

      const result = await CaseSubmissionService.uploadPaymentProof(caseId, file);

      res.json(result);
    } catch (error: any) {
      console.error('Upload payment proof error:', error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/submit:
 *   post:
 *     tags: [Case Submission]
 *     summary: Submit case for admin approval
 *     description: Submit case after uploading payment proof (Step 3 - Part 2). Changes status to PENDING_APPROVAL.
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
 *         description: Case submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Missing requirements (files, prescription, payment proof)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/submit',
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
        res.status(403).json({ error: 'Forbidden - can only submit your own cases' });
        return;
      }

      const submittedCase = await CaseSubmissionService.submitCase(caseId, req.user!.id);

      res.json({ case: submittedCase });
    } catch (error: any) {
      console.error('Submit case error:', error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/approve-payment:
 *   post:
 *     tags: [Case Submission]
 *     summary: Approve payment and assign designers (ADMIN only)
 *     description: Approve payment proof and assign designer/QC. Changes status to IN_DESIGN.
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
 *             type: object
 *             required:
 *               - designerId
 *               - qcId
 *             properties:
 *               designerId:
 *                 type: string
 *                 example: clx111jkl
 *                 description: User ID of designer
 *               qcId:
 *                 type: string
 *                 example: clx222mno
 *                 description: User ID of QC
 *     responses:
 *       200:
 *         description: Payment approved and case assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Invalid status or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Case, designer, or QC not found
 */
router.post(
  '/:id/approve-payment',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const { designerId, qcId } = req.body;

      if (!designerId || !qcId) {
        res.status(400).json({ error: 'Designer ID and QC ID are required' });
        return;
      }

      const approvedCase = await CaseSubmissionService.approvePaymentAndAssign(
        caseId,
        designerId,
        qcId,
        req.user!.id
      );

      res.json({ case: approvedCase });
    } catch (error: any) {
      console.error('Approve payment error:', error);
      res.status(error.message.includes('not found') ? 404 : 400).json({
        error: error.message || 'Internal server error',
      });
    }
  }
);

export default router;
