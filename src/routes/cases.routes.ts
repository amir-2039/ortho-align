import { Router, Response } from 'express';
import { authenticate, authorize, authorizeEmployee } from '../middleware/auth';
import { AuthRequest } from '../types';
import { CaseService } from '../services/case.service';
import { WorkflowService } from '../services/workflow.service';
import { UserRole, EmployeeType, CaseStatus } from '@prisma/client';
import './cases.swagger';

const router = Router();

router.post('/', authenticate, authorize(UserRole.CLIENT, UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, notes } = req.body;

    if (!patientId) {
      res.status(400).json({ error: 'Patient ID is required' });
      return;
    }

    const newCase = await CaseService.createCase({
      patientId,
      createdById: req.user!.id,
      notes,
    });

    res.status(201).json({ case: newCase });
  } catch (error: any) {
    console.error('Create case error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.user!.role === UserRole.CLIENT) {
      filters.createdById = req.user!.id;
    } else if (req.user!.role === UserRole.EMPLOYEE) {
      const viewAs = req.query.viewAs as string | undefined;
      
      if (viewAs === 'designer') {
        filters.designerId = req.user!.id;
      } else if (viewAs === 'qc') {
        filters.qcId = req.user!.id;
      } else {
        filters.designerId = req.user!.id;
      }
    }

    if (req.query.status) {
      filters.status = req.query.status as CaseStatus;
    }

    if (req.query.patientId) {
      filters.patientId = req.query.patientId as string;
    }

    const cases = await CaseService.listCases(filters);

    res.json({ cases });
  } catch (error) {
    console.error('List cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const caseRecord = await CaseService.getCaseById(id);

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

    res.json({ case: caseRecord });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/notes', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { notes } = req.body;

    const caseRecord = await CaseService.getCaseById(id);

    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const isOwner = req.user!.role === UserRole.CLIENT && caseRecord.createdById === req.user!.id;
    const isAssigned = req.user!.role === UserRole.EMPLOYEE && 
      (caseRecord.designerId === req.user!.id || caseRecord.qcId === req.user!.id);
    const isAdmin = req.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAssigned && !isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updatedCase = await CaseService.updateCaseNotes(id, notes);

    res.json({ case: updatedCase });
  } catch (error) {
    console.error('Update case notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/assign', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { designerId, qcId } = req.body;

    if (!designerId || !qcId) {
      res.status(400).json({ error: 'Designer ID and QC ID are required' });
      return;
    }

    const assignedCase = await CaseService.assignCase({
      caseId: id,
      designerId,
      qcId,
      assignedById: req.user!.id,
    });

    res.json({ case: assignedCase });
  } catch (error: any) {
    console.error('Assign case error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.post('/:id/transition', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const updatedCase = await WorkflowService.transitionCaseStatus(
      id,
      status as CaseStatus,
      req.user!.id,
      req.user!.role,
      req.user!.employeeType,
      note
    );

    res.json({ case: updatedCase });
  } catch (error: any) {
    console.error('Transition case error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.get('/:id/available-transitions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const caseRecord = await CaseService.getCaseById(id);

    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const availableTransitions = WorkflowService.getAvailableTransitions(
      caseRecord.status,
      req.user!.role,
      req.user!.employeeType
    );

    res.json({ availableTransitions });
  } catch (error) {
    console.error('Get available transitions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
