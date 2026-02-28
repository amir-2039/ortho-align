import prisma from '../lib/prisma';
import { UserRole, EmployeeType } from '@prisma/client';

export class ProductionService {
  static async addProductionUrl(
    caseId: string,
    url: string,
    description: string | undefined,
    userId: string
  ) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    const productionUrl = await prisma.caseProductionUrl.create({
      data: {
        caseId,
        url,
        description,
        addedById: userId,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeType: true,
          },
        },
      },
    });

    return productionUrl;
  }

  static async getProductionUrls(caseId: string) {
    return prisma.caseProductionUrl.findMany({
      where: { caseId },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async deleteProductionUrl(urlId: string) {
    const url = await prisma.caseProductionUrl.findUnique({
      where: { id: urlId },
    });

    if (!url) {
      throw new Error('Production URL not found');
    }

    await prisma.caseProductionUrl.delete({
      where: { id: urlId },
    });

    return { message: 'Production URL deleted successfully' };
  }

  static async canUserAccessProduction(
    caseId: string,
    userId: string,
    userRole: UserRole,
    employeeType?: EmployeeType | null
  ): Promise<boolean> {
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return false;
    }

    // Client can access their own cases
    if (userRole === UserRole.CLIENT && caseRecord.createdById === userId) {
      return true;
    }

    // Employee can access if they are designer or QC
    if (
      userRole === UserRole.EMPLOYEE &&
      (caseRecord.designerId === userId || caseRecord.qcId === userId)
    ) {
      return true;
    }

    return false;
  }

  static canUserAddProduction(
    caseId: string,
    userId: string,
    userRole: UserRole,
    employeeType?: EmployeeType | null,
    caseDesignerId?: string | null
  ): boolean {
    // Only designers can add production files/URLs
    if (userRole !== UserRole.EMPLOYEE) {
      return false;
    }

    if (!employeeType) {
      return false;
    }

    // Must be a designer or both, and must be assigned to the case
    if (
      (employeeType === EmployeeType.DESIGNER || employeeType === EmployeeType.BOTH) &&
      caseDesignerId === userId
    ) {
      return true;
    }

    return false;
  }
}
