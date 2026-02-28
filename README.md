# OrthoAlign Case Management System

A comprehensive Node.js application for managing dental cases with a multi-stage workflow system, role-based access control, and payment processing.

## Features

- **Role-Based Access Control**: Three user types (Client, Admin, Employee)
- **Employee Types**: Designer, QC, or Both
- **Multi-Stage Case Workflow**: From payment through design, QC, and client approval
- **Patient Management**: Clients can manage multiple patients
- **Payment Integration**: Ready for payment gateway integration with webhook support
- **Audit Trail**: Complete workflow logging for compliance
- **REST API**: Clean, well-documented API endpoints
- **Interactive API Documentation**: Swagger/OpenAPI documentation with try-it-out functionality

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **API Documentation**: Swagger UI + OpenAPI 3.0

## Project Structure

```
orthoalign/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── lib/
│   │   └── prisma.ts          # Prisma client instance
│   ├── middleware/
│   │   └── auth.ts            # Authentication & authorization
│   ├── routes/
│   │   ├── auth.routes.ts     # Login/register endpoints
│   │   ├── cases.routes.ts    # Case management endpoints
│   │   ├── patients.routes.ts # Patient management endpoints
│   │   ├── payments.routes.ts # Payment processing endpoints
│   │   └── users.routes.ts    # User management endpoints
│   ├── services/
│   │   ├── case.service.ts    # Case business logic
│   │   ├── payment.service.ts # Payment business logic
│   │   └── workflow.service.ts# Status transition logic
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── app.ts                 # Express app setup
│   └── index.ts               # Application entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/orthoalign?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   PORT=3000
   NODE_ENV="development"
   ```

5. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

6. **Run database migrations**:
   ```bash
   npm run prisma:migrate
   ```

7. **Start the development server**:
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

## API Documentation

Once the server is running, access the interactive Swagger documentation at:

**`http://localhost:3000/api-docs`**

The Swagger UI provides:
- Complete API reference for all 37 endpoints
- Request/response schemas with examples
- Try-it-out functionality to test endpoints directly
- Authentication support (click "Authorize" and enter your JWT token)
- Example payloads for all operations

### Quick Documentation Access

```bash
# Start the server
npm run dev

# Open in browser
open http://localhost:3000/api-docs
```

## Database Schema

### User Roles

- **CLIENT**: Can create patients and cases, approve/reject final work
- **ADMIN**: Full access, assigns cases to employees
- **EMPLOYEE**: Designer, QC, or both

### Case Workflow

```
PENDING_PAYMENT → OPENED → ASSIGNED → IN_DESIGN → PENDING_QC
                                           ↓
                              QC_REJECTED ←┘
                                           ↓
                              PENDING_CLIENT_REVIEW
                                    ↓           ↓
                          CLIENT_REJECTED   APPROVED
                                    ↓
                              IN_DESIGN
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Patients

- `POST /api/patients` - Create a new patient
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient details
- `PATCH /api/patients/:id` - Update patient

### Cases

- `POST /api/cases` - Create a new case
- `GET /api/cases` - List cases (filtered by role)
- `GET /api/cases/:id` - Get case details
- `PATCH /api/cases/:id/notes` - Update case notes
- `POST /api/cases/:id/assign` - Assign case to designer/QC (Admin only)
- `POST /api/cases/:id/transition` - Transition case status
- `GET /api/cases/:id/available-transitions` - Get available status transitions

### Payments

- `POST /api/payments` - Create a payment
- `GET /api/payments/case/:caseId` - Get payments for a case
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/complete` - Mark payment as completed (Admin)
- `POST /api/payments/:id/fail` - Mark payment as failed (Admin)
- `POST /api/payments/webhook` - Payment webhook handler

### Users

- `GET /api/users` - List all users (Admin only)
- `GET /api/users/employees` - List employees (Admin only)
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PATCH /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

## Authentication

All endpoints (except `/api/auth/register`, `/api/auth/login`, and `/api/payments/webhook`) require authentication.

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Example Usage

### 1. Register a Client

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123",
    "name": "Dr. Smith",
    "role": "CLIENT"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123"
  }'
```

### 3. Create a Patient

```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "John Doe",
    "dateOfBirth": "1990-01-01",
    "notes": "Regular patient"
  }'
```

### 4. Create a Case

```bash
curl -X POST http://localhost:3000/api/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "patientId": "<patient-id>",
    "notes": "Upper arch alignment"
  }'
```

### 5. Create Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "caseId": "<case-id>",
    "amount": 1500.00,
    "externalId": "stripe_payment_id"
  }'
```

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Deploy migrations to production
npm run prisma:migrate:prod

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Push schema changes without migrations
npm run db:push

# Reset database (WARNING: deletes all data)
npm run db:reset
```

## Workflow Validation

The system enforces strict status transitions based on user roles:

- **Clients** can:
  - Create cases (→ PENDING_PAYMENT)
  - Approve (PENDING_CLIENT_REVIEW → APPROVED)
  - Reject (PENDING_CLIENT_REVIEW → CLIENT_REJECTED)

- **Admins** can:
  - Mark payment as completed (PENDING_PAYMENT → OPENED)
  - Assign cases (OPENED → ASSIGNED)

- **Designers** can:
  - Start work (ASSIGNED → IN_DESIGN)
  - Submit for QC (IN_DESIGN → PENDING_QC)
  - Rework after rejection (QC_REJECTED/CLIENT_REJECTED → IN_DESIGN)

- **QC** can:
  - Approve (PENDING_QC → PENDING_CLIENT_REVIEW)
  - Reject (PENDING_QC → QC_REJECTED)

## Security Considerations

1. **Change JWT Secret**: Update `JWT_SECRET` in `.env` with a strong random string
2. **Database Credentials**: Use strong passwords for PostgreSQL
3. **HTTPS**: Use HTTPS in production
4. **Rate Limiting**: Consider adding rate limiting middleware
5. **Input Validation**: Add request validation (e.g., with Zod or Joi)
6. **CORS**: Configure CORS appropriately for your frontend domain

## Future Enhancements

- [ ] File upload support for case attachments
- [ ] Email notifications for workflow transitions
- [ ] Real-time updates using WebSockets
- [ ] Advanced search and filtering
- [ ] Reporting and analytics dashboard
- [ ] Integration with actual payment gateways (Stripe, PayPal)
- [ ] Two-factor authentication
- [ ] Activity logs and audit trails

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
