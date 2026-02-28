import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { FileCategory } from '@prisma/client';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export class S3Service {
  static async uploadFile(
    file: Express.Multer.File,
    caseId: string,
    category: FileCategory
  ): Promise<{ fileUrl: string; fileName: string }> {
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `cases/${caseId}/${category.toLowerCase()}/${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      fileUrl,
      fileName: file.originalname,
    };
  }

  static async deleteFile(fileUrl: string): Promise<void> {
    const key = fileUrl.split('.amazonaws.com/')[1];

    if (!key) {
      throw new Error('Invalid file URL');
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  }

  static getCategoryFromString(category: string): FileCategory | null {
    const upperCategory = category.toUpperCase();
    if (Object.values(FileCategory).includes(upperCategory as FileCategory)) {
      return upperCategory as FileCategory;
    }
    return null;
  }

  static validateFileType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/dicom',
      'model/stl',
      'application/sla',
    ];
    return allowedTypes.includes(mimetype);
  }

  static validateFileSize(size: number): boolean {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    return size <= MAX_FILE_SIZE;
  }
}
