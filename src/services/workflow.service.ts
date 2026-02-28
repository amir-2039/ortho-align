import { CaseStatus, UserRole, EmployeeType } from '@prisma/client';
import prisma from '../lib/prisma';

interface StatusTransition {
  from: CaseStatus;
  to: CaseStatus;
  allowedRoles: UserRole[];
  allowedEmployeeTypes?: EmployeeType[];
}

const statusTransitions: StatusTransition[] = [
  {
    from: CaseStatus.PENDING_PAYMENT,
    to: CaseStatus.OPENED,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    from: CaseStatus.OPENED,
    to: CaseStatus.ASSIGNED,
    allowedRoles: [UserRole.ADMIN],
  },
  {
    from: CaseStatus.ASSIGNED,
    to: CaseStatus.IN_DESIGN,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.DESIGNER, EmployeeType.BOTH],
  },
  {
    from: CaseStatus.IN_DESIGN,
    to: CaseStatus.PENDING_QC,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.DESIGNER, EmployeeType.BOTH],
  },
  {
    from: CaseStatus.PENDING_QC,
    to: CaseStatus.QC_REJECTED,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.QC, EmployeeType.BOTH],
  },
  {
    from: CaseStatus.PENDING_QC,
    to: CaseStatus.PENDING_CLIENT_REVIEW,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.QC, EmployeeType.BOTH],
  },
  {
    from: CaseStatus.QC_REJECTED,
    to: CaseStatus.IN_DESIGN,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.DESIGNER, EmployeeType.BOTH],
  },
  {
    from: CaseStatus.PENDING_CLIENT_REVIEW,
    to: CaseStatus.CLIENT_REJECTED,
    allowedRoles: [UserRole.CLIENT],
  },
  {
    from: CaseStatus.PENDING_CLIENT_REVIEW,
    to: CaseStatus.APPROVED,
    allowedRoles: [UserRole.CLIENT],
  },
  {
    from: CaseStatus.CLIENT_REJECTED,
    to: CaseStatus.IN_DESIGN,
    allowedRoles: [UserRole.EMPLOYEE],
    allowedEmployeeTypes: [EmployeeType.DESIGNER, EmployeeType.BOTH],
  },
];

export class WorkflowService {
  static validateTransition(
    currentStatus: CaseStatus,
    newStatus: CaseStatus,
    userRole: UserRole,
    employeeType?: EmployeeType | null
  ): boolean {
    const transition = statusTransitions.find(
      (t) => t.from === currentStatus && t.to === newStatus
    );

    if (!transition) {
      return false;
    }

    if (!transition.allowedRoles.includes(userRole)) {
      return false;
    }

    if (transition.allowedEmployeeTypes && userRole === UserRole.EMPLOYEE) {
      if (!employeeType || !transition.allowedEmployeeTypes.includes(employeeType)) {
        return false;
      }
    }

    return true;
  }

  static async transitionCaseStatus(
    caseId: string,
    newStatus: CaseStatus,
    userId: string,
    userRole: UserRole,
    employeeType?: EmployeeType | null,
    note?: string
  ) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    if (!this.validateTransition(caseRecord.status, newStatus, userRole, employeeType)) {
      throw new Error(
        `Invalid status transition from ${caseRecord.status} to ${newStatus} for user role ${userRole}`
      );
    }

    const updatedCase = await prisma.$transaction([
      prisma.case.update({
        where: { id: caseId },
        data: { status: newStatus },
      }),
      prisma.caseWorkflowLog.create({
        data: {
          caseId,
          fromStatus: caseRecord.status,
          toStatus: newStatus,
          performedById: userId,
          note,
        },
      }),
    ]);

    return updatedCase[0];
  }

  static getAvailableTransitions(
    currentStatus: CaseStatus,
    userRole: UserRole,
    employeeType?: EmployeeType | null
  ): CaseStatus[] {
    return statusTransitions
      .filter((t) => {
        if (t.from !== currentStatus) return false;
        if (!t.allowedRoles.includes(userRole)) return false;
        if (t.allowedEmployeeTypes && userRole === UserRole.EMPLOYEE) {
          if (!employeeType || !t.allowedEmployeeTypes.includes(employeeType)) {
            return false;
          }
        }
        return true;
      })
      .map((t) => t.to);
  }
}
