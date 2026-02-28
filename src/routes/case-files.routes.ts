import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { UserRole, FileCategory } from '@prisma/client';
import { S3Service } from '../services/s3.service';
import { CaseFileService } from '../services/case-file.service';
import { CaseService } from '../services/case.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * @swagger
 * /api/cases/{id}/files:
 *   post:
 *     tags: [Case Files]
 *     summary: Upload files to a case
 *     description: Upload files (scans, photos, x-rays) to a case with category classification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - files
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [SCAN, PHOTO, XRAY, OTHER]
 *                 description: Category of files being uploaded
 *                 example: SCAN
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (max 50MB each)
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Files uploaded successfully
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaseFile'
 *       400:
 *         description: Invalid input or file validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only upload to own cases
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/files',
  authenticate,
  authorize(UserRole.CLIENT, UserRole.ADMIN),
  upload.array('files', 10),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const { category } = req.body;
      const uploadedFiles = req.files as Express.Multer.File[];

      if (!category) {
        res.status(400).json({ error: 'Category is required' });
        return;
      }

      const fileCategory = S3Service.getCategoryFromString(category);
      if (!fileCategory) {
        res.status(400).json({ 
          error: 'Invalid category. Must be one of: SCAN, PHOTO, XRAY, OTHER' 
        });
        return;
      }

      if (!uploadedFiles || uploadedFiles.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - can only upload to your own cases' });
        return;
      }

      for (const file of uploadedFiles) {
        if (!S3Service.validateFileType(file.mimetype)) {
          res.status(400).json({ 
            error: `Invalid file type: ${file.originalname}. Allowed: JPG, PNG, PDF, DICOM, STL` 
          });
          return;
        }

        if (!S3Service.validateFileSize(file.size)) {
          res.status(400).json({ 
            error: `File too large: ${file.originalname}. Max size: 50MB` 
          });
          return;
        }
      }

      const uploadPromises = uploadedFiles.map(async (file) => {
        const { fileUrl, fileName } = await S3Service.uploadFile(file, caseId, fileCategory);
        return {
          category: fileCategory,
          fileName,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
        };
      });

      const uploadedFileData = await Promise.all(uploadPromises);

      await CaseFileService.addFilesToCase(caseId, uploadedFileData);

      const files = await CaseFileService.getCaseFiles(caseId);

      res.status(201).json({
        message: 'Files uploaded successfully',
        files,
      });
    } catch (error: any) {
      console.error('Upload files error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/files:
 *   get:
 *     tags: [Case Files]
 *     summary: Get all files for a case
 *     description: Retrieve all files associated with a case, optionally filtered by category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [SCAN, PHOTO, XRAY, OTHER]
 *         description: Filter by file category
 *         example: SCAN
 *     responses:
 *       200:
 *         description: List of case files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaseFile'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
router.get('/:id/files', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;
    const categoryParam = req.query.category as string | undefined;

    const caseRecord = await CaseService.getCaseById(caseId);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    if (req.user!.role === UserRole.CLIENT && caseRecord.createdById !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (
      req.user!.role === UserRole.EMPLOYEE &&
      caseRecord.designerId !== req.user!.id &&
      caseRecord.qcId !== req.user!.id
    ) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let category: FileCategory | undefined;
    if (categoryParam) {
      const parsedCategory = S3Service.getCategoryFromString(categoryParam);
      if (!parsedCategory) {
        res.status(400).json({ 
          error: 'Invalid category. Must be one of: SCAN, PHOTO, XRAY, OTHER' 
        });
        return;
      }
      category = parsedCategory;
    }

    const files = await CaseFileService.getCaseFiles(caseId, category);

    res.json({ files });
  } catch (error) {
    console.error('Get case files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/cases/{id}/files/{fileId}:
 *   delete:
 *     tags: [Case Files]
 *     summary: Delete a case file
 *     description: Delete a file from a case (removes from S3 and database)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *         example: clxfile123
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File or case not found
 */
router.delete(
  '/:id/files/:fileId',
  authenticate,
  authorize(UserRole.CLIENT, UserRole.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const fileId = req.params.fileId as string;

      const file = await CaseFileService.getFileById(fileId);

      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      if (file.caseId !== caseId) {
        res.status(400).json({ error: 'File does not belong to this case' });
        return;
      }

      if (req.user!.role === UserRole.CLIENT && file.case.createdById !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const result = await CaseFileService.deleteFile(fileId);

      res.json(result);
    } catch (error: any) {
      console.error('Delete file error:', error);
      res.status(error.message === 'File not found' ? 404 : 500).json({ 
        error: error.message || 'Internal server error' 
      });
    }
  }
);

export default router;
