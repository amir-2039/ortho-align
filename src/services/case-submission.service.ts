import prisma from '../lib/prisma';
import { CaseStatus } from '@prisma/client';
import { S3Service } from './s3.service';

export class CaseSubmissionService {
  static async uploadPaymentProof(
    caseId: string,
    file: Express.Multer.File
  ): Promise<{ paymentProofUrl: string }> {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    if (caseRecord.status !== CaseStatus.PENDING_PAYMENT) {
      throw new Error('Case must be in PENDING_PAYMENT status to upload payment proof');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `cases/${caseId}/payment-proof/${timestamp}-${sanitizedFileName}`;

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const paymentProofUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await prisma.case.update({
      where: { id: caseId },
      data: { paymentProofUrl },
    });

    return { paymentProofUrl };
  }

  static async submitCase(caseId: string, userId: string) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        files: true,
        prescription: true,
      },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    if (caseRecord.status !== CaseStatus.PENDING_PAYMENT) {
      throw new Error('Case must be in PENDING_PAYMENT status to submit');
    }

    if (!caseRecord.paymentProofUrl) {
      throw new Error('Payment proof must be uploaded before submission');
    }

    if (caseRecord.files.length === 0) {
      throw new Error('At least one file must be uploaded before submission');
    }

    if (!caseRecord.prescription) {
      throw new Error('Prescription must be added before submission');
    }

    const [updatedCase] = await prisma.$transaction([
      prisma.case.update({
        where: { id: caseId },
        data: {
          status: CaseStatus.PENDING_APPROVAL,
          submittedAt: new Date(),
        },
        include: {
          patient: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          files: true,
          prescription: true,
        },
      }),
      prisma.caseWorkflowLog.create({
        data: {
          caseId,
          fromStatus: CaseStatus.PENDING_PAYMENT,
          toStatus: CaseStatus.PENDING_APPROVAL,
          performedById: userId,
          note: 'Case submitted with payment proof',
        },
      }),
    ]);

    return updatedCase;
  }

  static async approvePaymentAndAssign(
    caseId: string,
    designerId: string,
    qcId: string,
    adminId: string
  ) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    if (caseRecord.status !== CaseStatus.PENDING_APPROVAL) {
      throw new Error('Case must be in PENDING_APPROVAL status to approve');
    }

    const designer = await prisma.user.findUnique({
      where: { id: designerId },
    });

    const qc = await prisma.user.findUnique({
      where: { id: qcId },
    });

    if (!designer || !qc) {
      throw new Error('Designer or QC not found');
    }

    const [updatedCase] = await prisma.$transaction([
      prisma.case.update({
        where: { id: caseId },
        data: {
          status: CaseStatus.IN_DESIGN,
          designerId,
          qcId,
        },
        include: {
          patient: true,
          designer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          qc: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.caseAssignment.create({
        data: {
          caseId,
          designerId,
          qcId,
          assignedById: adminId,
        },
      }),
      prisma.caseWorkflowLog.create({
        data: {
          caseId,
          fromStatus: CaseStatus.PENDING_APPROVAL,
          toStatus: CaseStatus.IN_DESIGN,
          performedById: adminId,
          note: `Payment approved. Assigned to designer: ${designer.name}, QC: ${qc.name}`,
        },
      }),
    ]);

    return updatedCase;
  }
}
