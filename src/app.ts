import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';

import authRoutes from './routes/auth.routes';
import patientsRoutes from './routes/patients.routes';
import casesRoutes from './routes/cases.routes';
import caseFilesRoutes from './routes/case-files.routes';
import prescriptionRoutes from './routes/prescription.routes';
import caseSubmissionRoutes from './routes/case-submission.routes';
import productionRoutes from './routes/production.routes';
import commentsRoutes from './routes/comments.routes';
import paymentsRoutes from './routes/payments.routes';
import usersRoutes from './routes/users.routes';
import dashboardRoutes from './routes/dashboard.routes';
import employeeRoutes from './routes/employee.routes';
import designerRoutes from './routes/designer.routes';
import qcRoutes from './routes/qc.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'OrthoAlign API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OrthoAlign API Documentation',
}));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/cases', caseFilesRoutes);
app.use('/api/cases', prescriptionRoutes);
app.use('/api/cases', caseSubmissionRoutes);
app.use('/api/cases', productionRoutes);
app.use('/api/cases', commentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/qc', qcRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
