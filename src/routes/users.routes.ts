import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { UserRole, EmployeeType } from '@prisma/client';
import { validatePassword, validateEmail } from '../lib/validation';
import './users.swagger';

const router = Router();

/**
 * @swagger
 * /api/users/employees:
 *   post:
 *     tags: [Users]
 *     summary: Create employee account (ADMIN only)
 *     description: |
 *       Admin creates employee accounts (DESIGNER/QC). Employees cannot self-register.
 *       
 *       **Password Requirements:**
 *       - Minimum 8 characters
 *       - At least one uppercase letter (A-Z)
 *       - At least one number (0-9)
 *       - At least one special character (!@#$%^&*)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - employeeType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: designer@orthoalign.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Designer123!
 *                 description: Temporary password for employee (they should change it)
 *               name:
 *                 type: string
 *                 example: Alex Designer
 *               employeeType:
 *                 type: string
 *                 enum: [DESIGNER, QC, BOTH]
 *                 example: DESIGNER
 *           examples:
 *             designer:
 *               summary: Create Designer
 *               value:
 *                 email: designer@orthoalign.com
 *                 password: Designer123!
 *                 name: Alex Designer
 *                 employeeType: DESIGNER
 *             qc:
 *               summary: Create QC Specialist
 *               value:
 *                 email: qc@orthoalign.com
 *                 password: QcSpecialist123!
 *                 name: Sarah QC
 *                 employeeType: QC
 *             both:
 *               summary: Create Designer/QC (Both)
 *               value:
 *                 email: hybrid@orthoalign.com
 *                 password: Hybrid123!
 *                 name: Jordan Hybrid
 *                 employeeType: BOTH
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: clxemp123
 *                     email:
 *                       type: string
 *                       example: designer@orthoalign.com
 *                     name:
 *                       type: string
 *                       example: Alex Designer
 *                     role:
 *                       type: string
 *                       example: EMPLOYEE
 *                     employeeType:
 *                       type: string
 *                       example: DESIGNER
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 temporaryPassword:
 *                   type: string
 *                   example: Designer123!
 *                   description: Return the password so admin can provide it to employee
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       409:
 *         description: Email already exists
 */
router.post('/employees', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, employeeType } = req.body;

    // Validation
    if (!email || !password || !name || !employeeType) {
      res.status(400).json({ error: 'Missing required fields: email, password, name, employeeType' });
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
      return;
    }

    // Employee type validation
    if (!Object.values(EmployeeType).includes(employeeType)) {
      res.status(400).json({ error: 'Invalid employee type. Must be DESIGNER, QC, or BOTH' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create employee
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: UserRole.EMPLOYEE,
        employeeType,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeType: true,
        createdAt: true,
      },
    });

    res.status(201).json({ 
      user,
      temporaryPassword: password // Return password so admin can provide it to employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.query.role as UserRole | undefined;
    const employeeType = req.query.employeeType as EmployeeType | undefined;

    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    if (employeeType) {
      whereClause.employeeType = employeeType;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/employees', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = req.query.type as EmployeeType | undefined;

    const whereClause: any = {
      role: UserRole.EMPLOYEE,
    };

    if (type) {
      whereClause.employeeType = type;
    }

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        employeeType: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ employees });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, role, employeeType } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (role && !Object.values(UserRole).includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    if (employeeType && !Object.values(EmployeeType).includes(employeeType)) {
      res.status(400).json({ error: 'Invalid employee type' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (employeeType !== undefined) updateData.employeeType = employeeType;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
