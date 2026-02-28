import { Router, Response } from 'express';
import { authenticate, authorizeEmployee } from '../middleware/auth';
import { AuthRequest } from '../types';
import { EmployeeType, CaseStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { WorkflowService } from '../services/workflow.service';

const router = Router();

/**
 * @swagger
 * /api/qc/cases/{id}/approve:
 *   post:
 *     tags: [QC Review]
 *     summary: QC approves case for client review
 *     description: QC approves the case (must be in PENDING_QC status), moving it to PENDING_CLIENT_REVIEW status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case approved for client review
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not assigned QC or invalid status
 *       404:
 *         description: Case not found
 */
router.post('/cases/:id/approve', authenticate, authorizeEmployee(EmployeeType.QC, EmployeeType.BOTH), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.id;

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Check if user is the assigned QC
    if (caseRecord.qcId !== userId) {
      res.status(403).json({ error: 'Forbidden - you are not the assigned QC for this case' });
      return;
    }

    // Check if case is in PENDING_QC status
    if (caseRecord.status !== CaseStatus.PENDING_QC) {
      res.status(400).json({ error: `Cannot approve case in status: ${caseRecord.status}` });
      return;
    }

    const updatedCase = await WorkflowService.transitionCaseStatus(
      caseId,
      CaseStatus.PENDING_CLIENT_REVIEW,
      userId,
      req.user!.role,
      req.user!.employeeType
    );

    res.json({
      message: 'Case approved and sent for client review',
      case: updatedCase,
    });
  } catch (error: any) {
    console.error('QC approve case error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/qc/cases/{id}/reject:
 *   post:
 *     tags: [QC Review]
 *     summary: QC rejects case back to designer
 *     description: QC rejects the case (must be in PENDING_QC status), moving it back to IN_DESIGN status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the rejection
 *                 example: Please adjust tooth #12 alignment
 *     responses:
 *       200:
 *         description: Case rejected back to designer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not assigned QC or invalid status
 *       404:
 *         description: Case not found
 */
router.post('/cases/:id/reject', authenticate, authorizeEmployee(EmployeeType.QC, EmployeeType.BOTH), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.id;
    const { notes } = req.body;

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Check if user is the assigned QC
    if (caseRecord.qcId !== userId) {
      res.status(403).json({ error: 'Forbidden - you are not the assigned QC for this case' });
      return;
    }

    // Check if case is in PENDING_QC status
    if (caseRecord.status !== CaseStatus.PENDING_QC) {
      res.status(400).json({ error: `Cannot reject case in status: ${caseRecord.status}` });
      return;
    }

    const updatedCase = await WorkflowService.transitionCaseStatus(
      caseId,
      CaseStatus.QC_REJECTED,
      userId,
      req.user!.role,
      req.user!.employeeType,
      notes || undefined
    );

    // Transition to IN_DESIGN immediately after rejection
    const finalCase = await WorkflowService.transitionCaseStatus(
      caseId,
      CaseStatus.IN_DESIGN,
      userId,
      req.user!.role,
      req.user!.employeeType
    );

    res.json({
      message: 'Case rejected and sent back to designer',
      case: finalCase,
    });
  } catch (error: any) {
    console.error('QC reject case error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
