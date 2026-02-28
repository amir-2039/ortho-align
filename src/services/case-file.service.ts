import prisma from '../lib/prisma';
import { FileCategory } from '@prisma/client';
import { S3Service } from './s3.service';

export class CaseFileService {
  static async addFilesToCase(
    caseId: string,
    files: Array<{
      category: FileCategory;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>
  ) {
    const caseFiles = await prisma.caseFile.createMany({
      data: files.map((file) => ({
        caseId,
        category: file.category,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      })),
    });

    return caseFiles;
  }

  static async getCaseFiles(caseId: string, category?: FileCategory) {
    const where: any = { caseId };
    if (category) {
      where.category = category;
    }

    return prisma.caseFile.findMany({
      where,
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  }

  static async deleteFile(fileId: string) {
    const file = await prisma.caseFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    await S3Service.deleteFile(file.fileUrl);

    await prisma.caseFile.delete({
      where: { id: fileId },
    });

    return { message: 'File deleted successfully' };
  }

  static async getFileById(fileId: string) {
    return prisma.caseFile.findUnique({
      where: { id: fileId },
      include: {
        case: {
          select: {
            id: true,
            createdById: true,
            status: true,
          },
        },
      },
    });
  }
}
