import { PaymentStatus, CaseStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export class PaymentService {
  static async createPayment(data: {
    caseId: string;
    amount: number;
    externalId?: string;
  }) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: data.caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    if (caseRecord.status !== CaseStatus.PENDING_PAYMENT) {
      throw new Error('Case is not in PENDING_PAYMENT status');
    }

    const payment = await prisma.payment.create({
      data: {
        caseId: data.caseId,
        amount: data.amount,
        status: PaymentStatus.PENDING,
        externalId: data.externalId,
      },
    });

    return payment;
  }

  static async markPaymentCompleted(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        case: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    const [updatedPayment, updatedCase] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      }),
      prisma.case.update({
        where: { id: payment.caseId },
        data: {
          status: CaseStatus.OPENED,
        },
      }),
      prisma.caseWorkflowLog.create({
        data: {
          caseId: payment.caseId,
          fromStatus: CaseStatus.PENDING_PAYMENT,
          toStatus: CaseStatus.OPENED,
          performedById: payment.case.createdById,
          note: 'Payment completed',
        },
      }),
    ]);

    return updatedPayment;
  }

  static async markPaymentFailed(paymentId: string, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
  }

  static async getPaymentsByCase(caseId: string) {
    return prisma.payment.findMany({
      where: { caseId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getPaymentById(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        case: {
          include: {
            patient: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
}
