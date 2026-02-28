import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { S3Service } from './s3.service';

export class CommentService {
  static async addComment(
    caseId: string,
    userId: string,
    comment: string,
    isInternal: boolean = false,
    files?: Express.Multer.File[]
  ) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error('Case not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create comment
    const newComment = await prisma.caseComment.create({
      data: {
        caseId,
        userId,
        comment,
        isInternal,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: true,
      },
    });

    // Upload attachments if provided
    if (files && files.length > 0) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const attachmentData = await Promise.all(
        files.map(async (file) => {
          const timestamp = Date.now();
          const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const key = `cases/${caseId}/comments/${newComment.id}/${timestamp}-${sanitizedFileName}`;

          const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
          });

          await s3Client.send(command);

          const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

          return {
            commentId: newComment.id,
            fileName: file.originalname,
            fileUrl,
            fileSize: file.size,
            mimeType: file.mimetype,
          };
        })
      );

      // Create attachment records
      await prisma.commentAttachment.createMany({
        data: attachmentData,
      });

      // Fetch the complete comment with attachments
      const commentWithAttachments = await prisma.caseComment.findUnique({
        where: { id: newComment.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          attachments: true,
        },
      });

      return commentWithAttachments;
    }

    return newComment;
  }

  static async getCaseComments(caseId: string, userRole: UserRole) {
    const whereClause: any = { caseId };
    
    // Clients can only see external comments
    if (userRole === UserRole.CLIENT) {
      whereClause.isInternal = false;
    }
    
    // Employees and Admins can see all comments
    
    return prisma.caseComment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  static async deleteComment(commentId: string) {
    const comment = await prisma.caseComment.findUnique({
      where: { id: commentId },
      include: {
        attachments: true,
      },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Delete attachments from S3
    if (comment.attachments.length > 0) {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      await Promise.all(
        comment.attachments.map(async (attachment) => {
          const key = attachment.fileUrl.split('.amazonaws.com/')[1];
          if (key) {
            const command = new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME!,
              Key: key,
            });
            await s3Client.send(command);
          }
        })
      );
    }

    // Delete comment (cascade will delete attachments from DB)
    await prisma.caseComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }

  static async canUserAccessComments(caseId: string, userId: string, userRole: UserRole): Promise<boolean> {
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
}
