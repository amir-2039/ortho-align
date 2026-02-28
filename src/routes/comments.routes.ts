import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { CommentService } from '../services/comment.service';
import { CaseService } from '../services/case.service';
import prisma from '../lib/prisma';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

/**
 * @swagger
 * /api/cases/{id}/comments:
 *   post:
 *     tags: [Case Comments]
 *     summary: Add comment to case
 *     description: Add a comment with optional file attachments. Accessible by CLIENT (owner) and QC/Designer.
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
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Comment text
 *                 example: Please review the alignment on tooth #8
 *               isInternal:
 *                 type: boolean
 *                 default: false
 *                 description: If true, comment is only visible to employees (QC/Designer). Clients cannot see internal comments.
 *                 example: false
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Optional file attachments (max 10MB each)
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/CaseComment'
 *       400:
 *         description: Missing comment text
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot comment on this case
 *       404:
 *         description: Case not found
 */
router.post(
  '/:id/comments',
  authenticate,
  upload.array('files', 5),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const caseId = req.params.id as string;
      const { comment, isInternal } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!comment || comment.trim().length === 0) {
        res.status(400).json({ error: 'Comment text is required' });
        return;
      }

      const caseRecord = await CaseService.getCaseById(caseId);
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      const canAccess = await CommentService.canUserAccessComments(
        caseId,
        req.user!.id,
        req.user!.role
      );

      if (!canAccess) {
        res.status(403).json({ error: 'Forbidden - cannot comment on this case' });
        return;
      }

      // Parse isInternal from form data (comes as string)
      const isInternalBool = isInternal === 'true' || isInternal === true;

      const newComment = await CommentService.addComment(
        caseId,
        req.user!.id,
        comment,
        isInternalBool,
        files
      );

      res.status(201).json({ comment: newComment });
    } catch (error: any) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /api/cases/{id}/comments:
 *   get:
 *     tags: [Case Comments]
 *     summary: Get case comments
 *     description: Retrieve all comments for a case with attachments. Accessible by CLIENT (owner) and QC/Designer.
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
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaseComment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 */
router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caseId = req.params.id as string;

    const caseRecord = await CaseService.getCaseById(caseId);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const canAccess = await CommentService.canUserAccessComments(
      caseId,
      req.user!.id,
      req.user!.role
    );

    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const comments = await CommentService.getCaseComments(caseId, req.user!.role);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/cases/{id}/comments/{commentId}:
 *   delete:
 *     tags: [Case Comments]
 *     summary: Delete comment
 *     description: Delete a comment and its attachments. Only comment author or ADMIN can delete.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: clxcomment123
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only delete own comments
 *       404:
 *         description: Comment not found
 */
router.delete(
  '/:id/comments/:commentId',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const commentId = req.params.commentId as string;

      const comment = await prisma.caseComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // Only comment author or ADMIN can delete
      if (req.user!.role !== 'ADMIN' && comment.userId !== req.user!.id) {
        res.status(403).json({ error: 'Forbidden - can only delete your own comments' });
        return;
      }

      const result = await CommentService.deleteComment(commentId);

      res.json(result);
    } catch (error: any) {
      console.error('Delete comment error:', error);
      res.status(error.message === 'Comment not found' ? 404 : 500).json({
        error: error.message || 'Internal server error',
      });
    }
  }
);

export default router;
