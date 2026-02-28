import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OrthoAlign Case Management API',
      version: '1.0.0',
      description: 'A comprehensive case management system for dental practices with workflow tracking, role-based access control, and payment processing.',
      contact: {
        name: 'API Support',
        email: 'support@orthoalign.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.orthoalign.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx123abc' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', enum: ['CLIENT', 'ADMIN', 'EMPLOYEE'], example: 'CLIENT' },
            employeeType: { type: 'string', enum: ['DESIGNER', 'QC', 'BOTH'], nullable: true, example: null },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true, example: 'MALE' },
            region: { type: 'string', nullable: true, example: 'North America' },
            phone: { type: 'string', nullable: true, example: '+1-234-567-8900' },
            website: { type: 'string', nullable: true, example: 'https://example.com' },
            businessAddress: { type: 'string', nullable: true, example: '123 Main St, City, State 12345' },
            hearAboutUs: { type: 'string', nullable: true, example: 'Google Search' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx456def' },
            name: { type: 'string', example: 'Jane Smith' },
            gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true, example: 'FEMALE' },
            dateOfBirth: { type: 'string', format: 'date', nullable: true, example: '1990-01-15' },
            address: { type: 'string', nullable: true, example: '123 Main St, New York, NY 10001' },
            notes: { type: 'string', nullable: true, example: 'Regular patient' },
            createdById: { type: 'string', example: 'clx123abc' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Case: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx789ghi' },
            patientId: { type: 'string', example: 'clx456def' },
            createdById: { type: 'string', example: 'clx123abc' },
            status: {
              type: 'string',
              enum: [
                'PENDING_PAYMENT',
                'OPENED',
                'ASSIGNED',
                'IN_DESIGN',
                'PENDING_QC',
                'QC_REJECTED',
                'PENDING_CLIENT_REVIEW',
                'CLIENT_REJECTED',
                'APPROVED',
                'CANCELLED',
              ],
              example: 'PENDING_PAYMENT',
            },
            designerId: { type: 'string', nullable: true, example: null },
            qcId: { type: 'string', nullable: true, example: null },
            notes: { type: 'string', nullable: true, example: 'Upper arch alignment' },
            refinementCount: { type: 'number', example: 0, description: 'Number of times case was sent back for refinement' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx111jkl' },
            caseId: { type: 'string', example: 'clx789ghi' },
            amount: { type: 'number', format: 'float', example: 1500.0 },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'], example: 'PENDING' },
            externalId: { type: 'string', nullable: true, example: 'stripe_pi_123' },
            paidAt: { type: 'string', format: 'date-time', nullable: true, example: null },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CaseWorkflowLog: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx222mno' },
            caseId: { type: 'string', example: 'clx789ghi' },
            fromStatus: { type: 'string', nullable: true, example: 'ASSIGNED' },
            toStatus: { type: 'string', example: 'IN_DESIGN' },
            performedById: { type: 'string', example: 'clx123abc' },
            note: { type: 'string', nullable: true, example: 'Started working on case' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration',
      },
      {
        name: 'Dashboard',
        description: 'Client dashboard statistics',
      },
      {
        name: 'Patients',
        description: 'Patient management',
      },
      {
        name: 'Cases',
        description: 'Case management and workflow',
      },
      {
        name: 'Payments',
        description: 'Payment processing and tracking',
      },
      {
        name: 'Users',
        description: 'User management (Admin only)',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
