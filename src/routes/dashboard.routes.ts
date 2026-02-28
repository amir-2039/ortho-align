import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { DashboardService } from '../services/dashboard.service';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get client dashboard statistics
 *     description: Get comprehensive dashboard stats including patients, cases, refinements, and status breakdown (CLIENT only)
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalPatients:
 *                       type: number
 *                       example: 25
 *                       description: Total number of patients registered by this client
 *                     totalCases:
 *                       type: number
 *                       example: 42
 *                       description: Total number of cases processed
 *                     casesThisMonth:
 *                       type: number
 *                       example: 8
 *                       description: Cases created this month
 *                     totalRefinements:
 *                       type: number
 *                       example: 15
 *                       description: Total number of refinements across all cases
 *                     refinementsThisMonth:
 *                       type: number
 *                       example: 3
 *                       description: Refinements that occurred this month
 *                     casesByStatus:
 *                       type: object
 *                       properties:
 *                         pendingPayment:
 *                           type: number
 *                           example: 2
 *                         inDesignReview:
 *                           type: number
 *                           example: 5
 *                           description: Cases in OPENED, ASSIGNED, or IN_DESIGN status
 *                         inQcReview:
 *                           type: number
 *                           example: 3
 *                         approvalRequired:
 *                           type: number
 *                           example: 4
 *                         completed:
 *                           type: number
 *                           example: 26
 *                         cancelled:
 *                           type: number
 *                           example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - CLIENT role required
 */
router.get('/', authenticate, authorize(UserRole.CLIENT), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await DashboardService.getClientDashboard(req.user!.id);
    res.json({ stats });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
