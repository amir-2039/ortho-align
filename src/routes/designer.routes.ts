import { Router, Response } from 'express';
import { authenticate, authorizeEmployee } from '../middleware/auth';
import { AuthRequest } from '../types';
import { EmployeeType, CaseStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { WorkflowService } from '../services/workflow.service';

const router = Router();

/**
 * @swagger
 * /api/designer/cases/{id}/submit-to-qc:
 *   post:
 *     tags: [Designer Actions]
 *     summary: Designer submits case for QC review
 *     description: Designer submits completed work to QC for review (IN_DESIGN → PENDING_QC)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the submission
 *                 example: Completed all alignments as requested
 *     responses:
 *       200:
 *         description: Case submitted to QC successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Case submitted to QC for review
 *                 case:
 *                   type: object
 *       400:
 *         description: Invalid case status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not assigned designer or invalid status
 *       404:
 *         description: Case not found
 */
router.post('/cases/:id/submit-to-qc', authenticate, authorizeEmployee(EmployeeType.DESIGNER, EmployeeType.BOTH), async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Check if user is the assigned designer
    if (caseRecord.designerId !== userId) {
      res.status(403).json({ error: 'Forbidden - you are not the assigned designer for this case' });
      return;
    }

    // Check if case is in IN_DESIGN status
    if (caseRecord.status !== CaseStatus.IN_DESIGN) {
      res.status(400).json({ error: `Cannot submit case in status: ${caseRecord.status}. Case must be in IN_DESIGN status.` });
      return;
    }

    const updatedCase = await WorkflowService.transitionCaseStatus(
      caseId,
      CaseStatus.PENDING_QC,
      userId,
      req.user!.role,
      req.user!.employeeType,
      notes || undefined
    );

    res.json({
      message: 'Case submitted to QC for review',
      case: updatedCase,
    });
  } catch (error: any) {
    console.error('Submit to QC error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
