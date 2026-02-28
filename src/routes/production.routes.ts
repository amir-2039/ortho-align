import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, authorizeEmployee } from '../middleware/auth';
import { AuthRequest } from '../types';
import { UserRole, EmployeeType, FileCategory } from '@prisma/client';
import { S3Service } from '../services/s3.service';
import { CaseFileService } from '../services/case-file.service';
import { ProductionService } from '../services/production.service';
import { CaseService } from '../services/case.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for production files
  },
});

/**
 * @swagger
 * /api/cases/{id}/production/files:
 *   post:
 *     tags: [Production (Designer)]
 *     summary: Upload production files (DESIGNER only)
 *     description: Designer uploads production/solution files for assigned cases
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
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Production files (max 100MB each, up to 10 files)
 *     responses:
 *       201:
 *         description: Production files uploaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only assigned designer can upload
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/production/files',
  authenticate,
  authorizeEmployee(EmployeeType.DESIGNER, EmployeeType.BOTH),
  upload.array('files', 10),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const uploadedFiles = req.files as Express.Multer.File[];

      if (!uploadedFiles || uploadedFiles.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      // Check if user is the assigned designer
      if (caseRecord.designerId !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - only assigned designer can upload production files' });
        return;
      }

      // Validate files
      for (const file of uploadedFiles) {
        if (!S3Service.validateFileType(file.mimetype)) {
          res.status(400).json({ 
            error: `Invalid file type: ${file.originalname}` 
          });
          return;
        }
      }

      const uploadPromises = uploadedFiles.map(async (file) => {
        const { fileUrl, fileName } = await S3Service.uploadFile(file, caseId, FileCategory.PRODUCTION);
        return {
          category: FileCategory.PRODUCTION,
          fileName,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
        };
      });

      const uploadedFileData = await Promise.all(uploadPromises);

      await CaseFileService.addFilesToCase(caseId, uploadedFileData);

      const files = await CaseFileService.getCaseFiles(caseId, FileCategory.PRODUCTION);

      res.status(201).json({
        message: 'Production files uploaded successfully',
        files,
      });
    } catch (error: any) {
      console.error('Upload production files error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/production/urls:
 *   post:
 *     tags: [Production (Designer)]
 *     summary: Add production URL (DESIGNER only)
 *     description: Designer adds URL link to production files/solution
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://drive.google.com/file/d/abc123/view
 *                 description: URL to production files
 *               description:
 *                 type: string
 *                 example: Final 3D model files
 *                 description: Optional description of the URL content
 *     responses:
 *       201:
 *         description: Production URL added successfully
 *       400:
 *         description: Missing URL
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only assigned designer can add URLs
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/production/urls',
  authenticate,
  authorizeEmployee(EmployeeType.DESIGNER, EmployeeType.BOTH),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const { url, description } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      // Check if user is the assigned designer
      if (caseRecord.designerId !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - only assigned designer can add production URLs' });
        return;
      }

      const productionUrl = await ProductionService.addProductionUrl(
        caseId,
        url,
        description,
        req.user!.id
      );

      res.status(201).json({ productionUrl });
    } catch (error: any) {
      console.error('Add production URL error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/production/urls:
 *   get:
 *     tags: [Production (Designer)]
 *     summary: Get production URLs
 *     description: Get all production URLs for a case (Designer, QC, Client, Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     responses:
 *       200:
 *         description: List of production URLs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
router.get('/:id/production/urls', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;

    const caseRecord = await CaseService.getCaseById(caseId);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const canAccess = await ProductionService.canUserAccessProduction(
      caseId,
      req.user!.id,
      req.user!.role,
      req.user!.employeeType
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const urls = await ProductionService.getProductionUrls(caseId);

    res.json({ productionUrls: urls });
  } catch (error) {
    console.error('Get production URLs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/cases/{id}/production/urls/{urlId}:
 *   delete:
 *     tags: [Production (Designer)]
 *     summary: Delete production URL (DESIGNER only)
 *     description: Designer deletes a production URL they added
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: path
 *         name: urlId
 *         required: true
 *         schema:
 *           type: string
 *         description: Production URL ID
 *     responses:
 *       200:
 *         description: Production URL deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: URL not found
 */
router.delete(
  '/:id/production/urls/:urlId',
  authenticate,
  authorizeEmployee(EmployeeType.DESIGNER, EmployeeType.BOTH),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const urlId = req.params.urlId as string;

      const result = await ProductionService.deleteProductionUrl(urlId);

      res.json(result);
    } catch (error: any) {
      console.error('Delete production URL error:', error);
      res.status(error.message === 'Production URL not found' ? 404 : 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }
);

export default router;
