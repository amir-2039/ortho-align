import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { UserRole, Gender } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * /api/patients:
 *   post:
 *     tags: [Patients]
 *     summary: Create a new patient
 *     description: Create a new patient record (CLIENT and ADMIN only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Smith
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: FEMALE
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               address:
 *                 type: string
 *                 example: "123 Main St, New York, NY 10001"
 *               notes:
 *                 type: string
 *                 example: Regular patient, upper arch needed
 *     responses:
 *       201:
 *         description: Patient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *             example:
 *               patient:
 *                 id: clx456def
 *                 name: Jane Smith
 *                 gender: FEMALE
 *                 dateOfBirth: "1990-01-15"
 *                 address: "123 Main St, New York, NY 10001"
 *                 notes: Regular patient, upper arch needed
 *                 createdById: clx123abc
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 createdBy:
 *                   id: clx123abc
 *                   name: Dr. John Doe
 *                   email: john@example.com
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/', authenticate, authorize(UserRole.CLIENT, UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, gender, dateOfBirth, address, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Patient name is required' });
      return;
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        notes,
        createdById: req.user!.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({ patient });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: List all patients
 *     description: Get list of patients (Clients see only their own, Admin/Employees see all)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of patients to return
 *     responses:
 *       200:
 *         description: List of patients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const whereClause: any = {};

    if (req.user!.role === UserRole.CLIENT) {
      whereClause.createdById = req.user!.id;
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cases: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ patients });
  } catch (error) {
    console.error('List patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient by ID
 *     description: Get detailed patient information including all cases
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *         example: clx456def
 *     responses:
 *       200:
 *         description: Patient details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only view own patients
 *       404:
 *         description: Patient not found
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cases: {
          include: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (req.user!.role === UserRole.CLIENT && patient.createdById !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/patients/{id}:
 *   patch:
 *     tags: [Patients]
 *     summary: Update patient
 *     description: Update patient information (CLIENT own patients, ADMIN all patients)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *         example: clx456def
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Smith Updated
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: FEMALE
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               address:
 *                 type: string
 *                 example: "456 Oak Ave, Brooklyn, NY 11201"
 *               notes:
 *                 type: string
 *                 example: Updated patient notes
 *     responses:
 *       200:
 *         description: Patient updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *             example:
 *               patient:
 *                 id: clx456def
 *                 name: Jane Smith Updated
 *                 gender: FEMALE
 *                 dateOfBirth: "1990-01-15"
 *                 address: "456 Oak Ave, Brooklyn, NY 11201"
 *                 notes: Updated patient notes
 *                 createdById: clx123abc
 *                 createdAt: "2024-01-15T10:30:00.000Z"
 *                 createdBy:
 *                   id: clx123abc
 *                   name: Dr. John Doe
 *                   email: john@example.com
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Patient not found
 */
router.patch('/:id', authenticate, authorize(UserRole.CLIENT, UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, gender, dateOfBirth, address, notes } = req.body;

    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (req.user!.role === UserRole.CLIENT && existingPatient.createdById !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender || null;
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (address !== undefined) updateData.address = address || null;
    if (notes !== undefined) updateData.notes = notes;

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ patient });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
