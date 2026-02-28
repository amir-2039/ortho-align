import { Request } from 'express';
import { UserRole, EmployeeType } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeType?: EmployeeType | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
