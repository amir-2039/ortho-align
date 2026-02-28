import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { PaymentService } from '../services/payment.service';
import { UserRole } from '@prisma/client';
import './payments.swagger';

const router = Router();

router.post('/', authenticate, authorize(UserRole.CLIENT, UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { caseId, amount, externalId } = req.body;

    if (!caseId || !amount) {
      res.status(400).json({ error: 'Case ID and amount are required' });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' });
      return;
    }

    const payment = await PaymentService.createPayment({
      caseId,
      amount,
      externalId,
    });

    res.status(201).json({ payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.get('/case/:caseId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.caseId as string;

    const payments = await PaymentService.getPaymentsByCase(caseId);

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const payment = await PaymentService.getPaymentById(id);

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/complete', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const payment = await PaymentService.markPaymentCompleted(id);

    res.json({ payment });
  } catch (error: any) {
    console.error('Complete payment error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.post('/:id/fail', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const payment = await PaymentService.markPaymentFailed(id, reason);

    res.json({ payment });
  } catch (error: any) {
    console.error('Fail payment error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

router.post('/webhook', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId, externalId, status, signature } = req.body;

    if (!paymentId && !externalId) {
      res.status(400).json({ error: 'Payment ID or external ID is required' });
      return;
    }

    let payment;
    if (paymentId) {
      payment = await PaymentService.getPaymentById(paymentId);
    }

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (status === 'completed' || status === 'success') {
      await PaymentService.markPaymentCompleted(payment.id);
      res.json({ success: true, message: 'Payment marked as completed' });
    } else if (status === 'failed') {
      await PaymentService.markPaymentFailed(payment.id);
      res.json({ success: true, message: 'Payment marked as failed' });
    } else {
      res.status(400).json({ error: 'Invalid status' });
    }
  } catch (error: any) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
