import prisma from '../lib/prisma';
import { CaseStatus } from '@prisma/client';

export interface DashboardStats {
  totalPatients: number;
  totalCases: number;
  casesThisMonth: number;
  totalRefinements: number;
  refinementsThisMonth: number;
  casesByStatus: {
    pendingPayment: number;
    inDesignReview: number;
    inQcReview: number;
    approvalRequired: number;
    completed: number;
    cancelled: number;
  };
}

export class DashboardService {
  static async getClientDashboard(clientId: string): Promise<DashboardStats> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total patients
    const totalPatients = await prisma.patient.count({
      where: { createdById: clientId },
    });

    // Get all cases for this client
    const allCases = await prisma.case.findMany({
      where: { createdById: clientId },
      select: {
        id: true,
        status: true,
        refinementCount: true,
        createdAt: true,
      },
    });

    const totalCases = allCases.length;

    // Cases this month
    const casesThisMonth = allCases.filter(
      (c) => c.createdAt >= firstDayOfMonth
    ).length;

    // Total refinements (sum of all refinement counts)
    const totalRefinements = allCases.reduce(
      (sum, c) => sum + c.refinementCount,
      0
    );

    // Refinements this month
    const refinementsThisMonth = await prisma.caseWorkflowLog.count({
      where: {
        case: { createdById: clientId },
        toStatus: {
          in: [CaseStatus.QC_REJECTED, CaseStatus.CLIENT_REJECTED],
        },
        createdAt: { gte: firstDayOfMonth },
      },
    });

    // Cases by status
    const casesByStatus = {
      pendingPayment: allCases.filter((c) => c.status === CaseStatus.PENDING_PAYMENT).length,
      inDesignReview: allCases.filter((c) => 
        c.status === CaseStatus.IN_DESIGN || 
        c.status === CaseStatus.ASSIGNED ||
        c.status === CaseStatus.OPENED
      ).length,
      inQcReview: allCases.filter((c) => c.status === CaseStatus.PENDING_QC).length,
      approvalRequired: allCases.filter((c) => c.status === CaseStatus.PENDING_CLIENT_REVIEW).length,
      completed: allCases.filter((c) => c.status === CaseStatus.APPROVED).length,
      cancelled: allCases.filter((c) => c.status === CaseStatus.CANCELLED).length,
    };

    return {
      totalPatients,
      totalCases,
      casesThisMonth,
      totalRefinements,
      refinementsThisMonth,
      casesByStatus,
    };
  }
}
