# OrthoAlign Case Management System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Case Workflow](#case-workflow)
4. [Client Journey](#client-journey)
5. [Admin Workflow](#admin-workflow)
6. [Employee Workflow](#employee-workflow)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Features Summary](#features-summary)

---

## System Overview

OrthoAlign is a comprehensive case management system for orthodontic treatment planning. It enables doctors (clients) to create cases, upload diagnostic files, provide treatment instructions, and collaborate with designers and QC specialists through a structured workflow.

### Technology Stack
- **Backend**: Node.js with Express.js & TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3
- **Authentication**: JWT with bcrypt
- **API Documentation**: Swagger/OpenAPI 3.0

### Key Features
- ✅ Multi-role authentication (Client, Admin, Employee)
- ✅ Patient management
- ✅ Case creation with 3-step workflow
- ✅ File uploads (scans, photos, x-rays)
- ✅ Comprehensive prescription system
- ✅ Payment proof upload and verification
- ✅ Case assignment and workflow management
- ✅ Comments system with file attachments
- ✅ Dashboard with statistics
- ✅ Refinement tracking
- ✅ Complete audit trail

---

## User Roles & Permissions

### 1. CLIENT (Doctor)
**Capabilities:**
- Register and manage their account
- Create and manage patients
- Create cases for patients
- Upload diagnostic files (scans, photos, x-rays)
- Add prescription details
- Upload payment proof and submit cases
- View own cases and their status
- Add comments to own cases
- View dashboard statistics

**Access Restrictions:**
- Cannot view other clients' cases
- Cannot assign cases
- Cannot approve payments

### 2. ADMIN
**Capabilities:**
- Full system access
- View all users, patients, and cases
- Approve payment proofs
- Assign cases to designers and QC specialists
- Manage workflow transitions
- Add comments to any case
- Delete any comments
- Access all dashboard data

**Special Permissions:**
- Payment approval
- Case assignment
- User management

### 3. EMPLOYEE (Designer/QC)
**Capabilities:**
- View assigned cases only
- Work on design tasks
- Review and approve/reject designs
- Add comments to assigned cases
- Transition case status (within permissions)

**Employee Types:**
- **DESIGNER**: Works on case design
- **QC**: Reviews and approves designs
- **BOTH**: Can perform both roles

**Access Restrictions:**
- Cannot view unassigned cases
- Cannot approve payments
- Cannot assign cases

---

## Case Workflow

### Complete Case Status Flow

```mermaid
graph TD
    A[PENDING_PAYMENT] -->|Client uploads files| A
    A -->|Client adds prescription| A
    A -->|Client uploads payment proof| A
    A -->|Client submits case| B[PENDING_APPROVAL]
    B -->|Admin approves & assigns| C[IN_DESIGN]
    C -->|Designer works| D[PENDING_QC]
    D -->|QC approves| E[PENDING_CLIENT_REVIEW]
    D -->|QC rejects| C
    E -->|Client approves| F[APPROVED]
    E -->|Client rejects| C
    A -->|Cancel| G[CANCELLED]
    B -->|Cancel| G
    C -->|Cancel| G
    
    style A fill:#fff3cd
    style B fill:#d1ecf1
    style C fill:#d4edda
    style D fill:#fff3cd
    style E fill:#d1ecf1
    style F fill:#28a745,color:#fff
    style G fill:#f8d7da
```

### Status Definitions

| Status | Description | Who Can Transition |
|--------|-------------|-------------------|
| `PENDING_PAYMENT` | Case created, awaiting files, prescription, and payment proof | CLIENT, ADMIN |
| `PENDING_APPROVAL` | Case submitted, awaiting admin approval | ADMIN |
| `IN_DESIGN` | Designer working on case | Designer |
| `PENDING_QC` | Awaiting QC review | QC |
| `QC_REJECTED` | QC rejected, back to designer | Designer |
| `PENDING_CLIENT_REVIEW` | Awaiting client approval | CLIENT, ADMIN |
| `CLIENT_REJECTED` | Client rejected, back to designer | Designer |
| `APPROVED` | Case completed successfully | - |
| `CANCELLED` | Case cancelled | CLIENT, ADMIN |

---

## Client Journey

### Registration & Setup

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as Database
    
    C->>API: POST /api/auth/register
    Note over C,API: Name, Email, Password<br/>Gender, Region, Phone<br/>Business Address
    API->>API: Validate email, password<br/>(8+ chars, uppercase, number, special)
    API->>API: Hash password
    API->>DB: Create user (role: CLIENT)
    DB-->>API: User created
    API-->>C: Success + JWT token
```

### Complete Case Creation Flow

```mermaid
flowchart TD
    Start([Client Logs In]) --> CreatePatient[Create/Select Patient]
    CreatePatient --> CreateCase[Create Case for Patient]
    
    CreateCase --> Step1[Step 1: Upload Files]
    Step1 --> UploadScans[Upload Scans]
    Step1 --> UploadPhotos[Upload Photos]
    Step1 --> UploadXrays[Upload X-rays]
    
    UploadScans --> Step2[Step 2: Add Prescription]
    UploadPhotos --> Step2
    UploadXrays --> Step2
    
    Step2 --> Duration[Set Duration]
    Step2 --> ExistingCondition[Describe Existing Condition]
    Step2 --> Instructions[Set Treatment Instructions]
    Step2 --> ToothSelections[Select Specific Teeth]
    Step2 --> Retainer[Include Retainer Option]
    Step2 --> Additional[Additional Instructions]
    
    Duration --> Step3[Step 3: Submit Case]
    ExistingCondition --> Step3
    Instructions --> Step3
    ToothSelections --> Step3
    Retainer --> Step3
    Additional --> Step3
    
    Step3 --> UploadProof[Upload Payment Proof]
    UploadProof --> ValidateSubmission{All Requirements Met?}
    
    ValidateSubmission -->|No| Error[Show Error Message]
    Error --> Step1
    
    ValidateSubmission -->|Yes| Submit[Submit Case]
    Submit --> PendingApproval[Status: PENDING_APPROVAL]
    
    PendingApproval --> Monitor[Monitor Case Progress]
    Monitor --> AddComments[Add Comments/Attachments]
    Monitor --> ViewStatus[View Case Status]
    Monitor --> Dashboard[View Dashboard Stats]
    
    style Step1 fill:#e3f2fd
    style Step2 fill:#e8f5e9
    style Step3 fill:#fff3e0
    style PendingApproval fill:#fce4ec
```

### Client Dashboard

```mermaid
graph LR
    A[Client Dashboard] --> B[Total Patients]
    A --> C[Total Cases]
    A --> D[Cases This Month]
    A --> E[Total Refinements]
    A --> F[Refinements This Month]
    A --> G[Cases by Status]
    
    G --> G1[Payment Pending]
    G --> G2[In Design/Review]
    G --> G3[In QC Review]
    G --> G4[Approval Required]
    G --> G5[Completed]
    G --> G6[Cancelled]
    
    style A fill:#4CAF50,color:#fff
    style G fill:#2196F3,color:#fff
```

### Client API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new client account
- `POST /api/auth/login` - Login

**Patient Management:**
- `POST /api/patients` - Create patient
- `GET /api/patients` - List own patients
- `GET /api/patients/:id` - Get patient details
- `PATCH /api/patients/:id` - Update patient

**Case Management (Step 1 - Files):**
- `POST /api/cases` - Create new case
- `POST /api/cases/:id/files` - Upload files (scans/photos/x-rays)
- `GET /api/cases/:id/files` - List case files
- `DELETE /api/cases/:id/files/:fileId` - Delete file

**Case Management (Step 2 - Prescription):**
- `POST /api/cases/:id/prescription` - Add/update prescription
- `GET /api/cases/:id/prescription` - Get prescription

**Case Management (Step 3 - Submission):**
- `POST /api/cases/:id/payment-proof` - Upload payment proof
- `POST /api/cases/:id/submit` - Submit case for approval

**Case Viewing:**
- `GET /api/cases` - List own cases
- `GET /api/cases/:id` - Get case details

**Comments:**
- `POST /api/cases/:id/comments` - Add comment with attachments
- `GET /api/cases/:id/comments` - View case comments
- `DELETE /api/cases/:id/comments/:commentId` - Delete own comment

**Dashboard:**
- `GET /api/dashboard` - Get statistics

---

## Admin Workflow

### Admin Responsibilities

```mermaid
flowchart TD
    Start([Admin Dashboard]) --> Monitor[Monitor Pending Cases]
    
    Monitor --> PendingList[View PENDING_APPROVAL Cases]
    PendingList --> SelectCase[Select Case to Review]
    
    SelectCase --> ReviewProof[Review Payment Proof]
    SelectCase --> ReviewFiles[Review Uploaded Files]
    SelectCase --> ReviewPrescription[Review Prescription]
    
    ReviewProof --> Decision{Approve?}
    ReviewFiles --> Decision
    ReviewPrescription --> Decision
    
    Decision -->|No| AddComment[Add Comment Requesting Changes]
    AddComment --> ContactClient[Contact Client]
    
    Decision -->|Yes| SelectTeam[Select Designer & QC]
    SelectTeam --> AssignCase[Assign Case]
    AssignCase --> StatusChange[Status: IN_DESIGN]
    
    StatusChange --> NotifyTeam[Notify Designer & QC]
    NotifyTeam --> MonitorProgress[Monitor Case Progress]
    
    MonitorProgress --> ViewComments[View Comment Thread]
    MonitorProgress --> CheckStatus[Check Current Status]
    MonitorProgress --> ManageWorkflow[Manage Workflow Transitions]
    
    style Start fill:#9C27B0,color:#fff
    style AssignCase fill:#4CAF50,color:#fff
    style StatusChange fill:#FF9800,color:#fff
```

### Payment Approval & Assignment Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant API as API Server
    participant DB as Database
    participant N as Notification System
    
    A->>API: GET /api/cases?status=PENDING_APPROVAL
    API->>DB: Fetch pending cases
    DB-->>API: Cases list
    API-->>A: Display cases
    
    A->>API: Review case details
    API->>DB: Fetch case with files, prescription, payment proof
    DB-->>API: Complete case data
    API-->>A: Display for review
    
    A->>API: POST /api/cases/:id/approve-payment
    Note over A,API: { designerId, qcId }
    
    API->>DB: Validate designer & QC exist
    DB-->>API: Users valid
    
    API->>DB: Update case status to IN_DESIGN
    API->>DB: Create assignment record
    API->>DB: Log workflow transition
    DB-->>API: Success
    
    API->>N: Notify designer & QC
    API-->>A: Case assigned successfully
```

### Admin API Endpoints

**User Management:**
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create new user (designer/QC)

**Case Management:**
- `GET /api/cases` - View all cases (all clients)
- `GET /api/cases?status=PENDING_APPROVAL` - View pending cases
- `POST /api/cases/:id/approve-payment` - Approve payment & assign
- `POST /api/cases/:id/assign` - Assign/reassign case
- `POST /api/cases/:id/transition` - Force status transition

**Full Access:**
- All patient endpoints
- All case file endpoints
- All prescription endpoints
- All comment endpoints (including delete any)
- Dashboard for all clients

---

## Employee Workflow

### Designer Workflow

```mermaid
flowchart TD
    Start([Designer Login]) --> ViewCases[View Assigned Cases]
    ViewCases --> FilterView{Filter View}
    
    FilterView -->|As Designer| DesignerCases[Cases Where I'm Designer]
    FilterView -->|As QC| QCCases[Cases Where I'm QC]
    
    DesignerCases --> SelectCase[Select Case to Work On]
    SelectCase --> ReviewInfo[Review Patient Info & Files]
    ReviewInfo --> ReviewPrescription[Review Prescription Details]
    
    ReviewPrescription --> StartWork[Start Design Work]
    StartWork --> UpdateStatus1[Status: IN_DESIGN]
    
    UpdateStatus1 --> WorkProgress[Work on Design]
    WorkProgress --> AddComments1[Add Progress Comments]
    WorkProgress --> UploadDrafts[Upload Draft Files]
    
    UploadDrafts --> ReadyReview{Ready for QC?}
    ReadyReview -->|No| WorkProgress
    ReadyReview -->|Yes| SubmitQC[Submit for QC Review]
    
    SubmitQC --> UpdateStatus2[Status: PENDING_QC]
    UpdateStatus2 --> WaitQC[Wait for QC Review]
    
    WaitQC --> QCDecision{QC Decision}
    QCDecision -->|Rejected| ReviewFeedback[Review QC Feedback]
    ReviewFeedback --> WorkProgress
    
    QCDecision -->|Approved| ClientReview[Sent to Client]
    ClientReview --> ClientDecision{Client Decision}
    
    ClientDecision -->|Rejected| ReviewClientFeedback[Review Client Feedback]
    ReviewClientFeedback --> WorkProgress
    
    ClientDecision -->|Approved| Complete[Case Completed]
    
    style StartWork fill:#4CAF50,color:#fff
    style SubmitQC fill:#2196F3,color:#fff
    style Complete fill:#FF9800,color:#fff
```

### QC Workflow

```mermaid
flowchart TD
    Start([QC Login]) --> ViewCases[View Cases Pending QC Review]
    ViewCases --> FilterMyCases[Filter: Assigned to Me as QC]
    
    FilterMyCases --> SelectCase[Select Case to Review]
    SelectCase --> ViewDesign[View Design Work]
    
    ViewDesign --> ReviewFiles[Review Design Files]
    ViewDesign --> ReviewPrescription[Check Against Prescription]
    ViewDesign --> ViewComments[Read Designer Comments]
    
    ReviewFiles --> Evaluate{Design Quality OK?}
    ReviewPrescription --> Evaluate
    ViewComments --> Evaluate
    
    Evaluate -->|Issues Found| RejectDesign[Reject Design]
    RejectDesign --> AddDetailedFeedback[Add Detailed Feedback]
    AddDetailedFeedback --> AttachReferences[Attach Reference Files]
    AttachReferences --> UpdateStatus1[Status: QC_REJECTED]
    UpdateStatus1 --> NotifyDesigner[Notify Designer]
    
    Evaluate -->|Approved| ApproveDesign[Approve Design]
    ApproveDesign --> AddApprovalNote[Add Approval Note]
    AddApprovalNote --> UpdateStatus2[Status: PENDING_CLIENT_REVIEW]
    UpdateStatus2 --> NotifyClient[Notify Client]
    
    style RejectDesign fill:#f44336,color:#fff
    style ApproveDesign fill:#4CAF50,color:#fff
    style UpdateStatus2 fill:#2196F3,color:#fff
```

### Employee API Endpoints

**Case Viewing:**
- `GET /api/cases?viewAs=designer` - View cases where assigned as designer
- `GET /api/cases?viewAs=qc` - View cases where assigned as QC
- `GET /api/cases/:id` - Get case details (if assigned)

**Case Files:**
- `GET /api/cases/:id/files` - View case files

**Prescription:**
- `GET /api/cases/:id/prescription` - View prescription

**Workflow:**
- `POST /api/cases/:id/transition` - Transition case status
  - Designer: `IN_DESIGN` → `PENDING_QC`
  - QC: `PENDING_QC` → `PENDING_CLIENT_REVIEW` (approve)
  - QC: `PENDING_QC` → `QC_REJECTED` (reject)
- `GET /api/cases/:id/available-transitions` - Get allowed transitions

**Comments:**
- `POST /api/cases/:id/comments` - Add comment with attachments
- `GET /api/cases/:id/comments` - View case comments
- `DELETE /api/cases/:id/comments/:commentId` - Delete own comment

**Notes:**
- `PATCH /api/cases/:id/notes` - Update case notes

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Patient : creates
    User ||--o{ Case : creates
    User ||--o{ Case : "assigned as designer"
    User ||--o{ Case : "assigned as QC"
    User ||--o{ CaseComment : writes
    
    Patient ||--o{ Case : has
    
    Case ||--o{ CaseFile : contains
    Case ||--|| Prescription : has
    Case ||--o{ CaseComment : has
    Case ||--o{ Payment : has
    Case ||--o{ CaseWorkflowLog : has
    Case ||--o{ CaseAssignment : has
    
    CaseComment ||--o{ CommentAttachment : has
    
    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role
        enum employeeType
        string gender
        string region
        string phone
        string website
        string businessAddress
        string hearAboutUs
        datetime createdAt
        datetime updatedAt
    }
    
    Patient {
        string id PK
        string name
        enum gender
        datetime dateOfBirth
        string address
        string notes
        string createdById FK
        datetime createdAt
    }
    
    Case {
        string id PK
        string patientId FK
        string createdById FK
        enum status
        string designerId FK
        string qcId FK
        string notes
        int refinementCount
        string paymentProofUrl
        datetime submittedAt
        datetime createdAt
        datetime updatedAt
    }
    
    CaseFile {
        string id PK
        string caseId FK
        enum category
        string fileName
        string fileUrl
        int fileSize
        string mimeType
        datetime uploadedAt
    }
    
    Prescription {
        string id PK
        string caseId FK
        boolean durationRecommended
        int durationLimitSteps
        string chiefComplaint
        enum upperMidlinePosition
        float upperMidlineShiftMm
        enum lowerMidlinePosition
        float lowerMidlineShiftMm
        string canineRelationshipRight
        string canineRelationshipLeft
        string molarRelationshipRight
        string molarRelationshipLeft
        boolean treatUpperArch
        boolean treatLowerArch
        enum upperMidlineGoal
        enum lowerMidlineGoal
        enum overjetGoal
        enum overbiteGoal
        enum archFormGoal
        enum canineRelationshipGoal
        enum molarRelationshipGoal
        enum posteriorRelationshipGoal
        enum iprOption
        enum engagersOption
        enum proclineOption
        enum expandOption
        enum distalizeOption
        json avoidEngagersTeeth
        json extractTeeth
        json leaveSpacesTeeth
        json doNotMoveTeeth
        boolean includeRetainer
        string additionalInstructions
        datetime createdAt
        datetime updatedAt
    }
    
    CaseComment {
        string id PK
        string caseId FK
        string userId FK
        string comment
        datetime createdAt
        datetime updatedAt
    }
    
    CommentAttachment {
        string id PK
        string commentId FK
        string fileName
        string fileUrl
        int fileSize
        string mimeType
        datetime createdAt
    }
```

### Enums

```typescript
enum UserRole {
  CLIENT      // Doctor
  ADMIN       // Full system access
  EMPLOYEE    // Designer/QC
}

enum EmployeeType {
  DESIGNER    // Works on case design
  QC          // Quality control review
  BOTH        // Can perform both roles
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum CaseStatus {
  PENDING_PAYMENT           // Initial state, awaiting files & payment
  PENDING_APPROVAL         // Submitted, awaiting admin approval
  OPENED                   // Approved but not assigned (legacy)
  ASSIGNED                 // Assigned to designer/QC (legacy)
  IN_DESIGN               // Designer working
  PENDING_QC              // Awaiting QC review
  QC_REJECTED             // QC rejected, back to designer
  PENDING_CLIENT_REVIEW   // Awaiting client approval
  CLIENT_REJECTED         // Client rejected, back to designer
  APPROVED                // Completed successfully
  CANCELLED               // Cancelled
}

enum FileCategory {
  SCAN       // Dental scans
  PHOTO      // Photos
  XRAY       // X-rays
  OTHER      // Other files
}

enum AlignmentGoal {
  MAINTAIN   // Keep current state
  IMPROVE    // Improve condition
  IDEALIZE   // Perfect alignment
}

enum ProcedureOption {
  YES              // Always perform
  NO               // Never perform
  ONLY_IF_NEEDED   // Perform if necessary
}

enum MidlinePosition {
  CENTERED        // Centered
  SHIFTED_RIGHT   // Shifted right
  SHIFTED_LEFT    // Shifted left
}

enum PaymentStatus {
  PENDING     // Payment pending
  COMPLETED   // Payment completed
  FAILED      // Payment failed
}
```

---

## API Endpoints

### Complete API Reference

#### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |

#### Dashboard
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/dashboard` | Get client statistics | CLIENT |

#### Patients
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/patients` | Create patient | CLIENT, ADMIN |
| GET | `/api/patients` | List patients | CLIENT, ADMIN, EMPLOYEE |
| GET | `/api/patients/:id` | Get patient details | CLIENT, ADMIN, EMPLOYEE |
| PATCH | `/api/patients/:id` | Update patient | CLIENT, ADMIN |

#### Cases - Basic
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases` | Create case | CLIENT, ADMIN |
| GET | `/api/cases` | List cases | CLIENT, ADMIN, EMPLOYEE |
| GET | `/api/cases/:id` | Get case details | CLIENT, ADMIN, EMPLOYEE |
| PATCH | `/api/cases/:id/notes` | Update notes | CLIENT, ADMIN, EMPLOYEE |

#### Cases - Files (Step 1)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases/:id/files` | Upload files | CLIENT, ADMIN |
| GET | `/api/cases/:id/files` | List files | CLIENT, ADMIN, EMPLOYEE |
| DELETE | `/api/cases/:id/files/:fileId` | Delete file | CLIENT, ADMIN |

#### Cases - Prescription (Step 2)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases/:id/prescription` | Create/update prescription | CLIENT, ADMIN |
| GET | `/api/cases/:id/prescription` | Get prescription | CLIENT, ADMIN, EMPLOYEE |
| DELETE | `/api/cases/:id/prescription` | Delete prescription | CLIENT, ADMIN |

#### Cases - Submission (Step 3)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases/:id/payment-proof` | Upload payment proof | CLIENT, ADMIN |
| POST | `/api/cases/:id/submit` | Submit case | CLIENT, ADMIN |
| POST | `/api/cases/:id/approve-payment` | Approve & assign | ADMIN |

#### Cases - Workflow
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases/:id/assign` | Assign designer/QC | ADMIN |
| POST | `/api/cases/:id/transition` | Transition status | CLIENT, ADMIN, EMPLOYEE |
| GET | `/api/cases/:id/available-transitions` | Get allowed transitions | CLIENT, ADMIN, EMPLOYEE |

#### Cases - Comments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cases/:id/comments` | Add comment | CLIENT, ADMIN, EMPLOYEE |
| GET | `/api/cases/:id/comments` | List comments | CLIENT, ADMIN, EMPLOYEE |
| DELETE | `/api/cases/:id/comments/:commentId` | Delete comment | Owner, ADMIN |

#### Payments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payments` | Create payment | CLIENT, ADMIN |
| GET | `/api/payments` | List payments | CLIENT, ADMIN |
| GET | `/api/payments/:id` | Get payment | CLIENT, ADMIN |
| PATCH | `/api/payments/:id` | Update payment | ADMIN |

#### Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | List users | ADMIN |
| GET | `/api/users/:id` | Get user | ADMIN |
| POST | `/api/users` | Create user | ADMIN |
| PATCH | `/api/users/:id` | Update user | ADMIN |

---

## Features Summary

### ✅ Completed Features

#### 1. Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC)
- ✅ Email validation
- ✅ Password strength validation (8+ chars, uppercase, number, special char)
- ✅ Phone number validation

#### 2. User Management
- ✅ Multi-role support (CLIENT, ADMIN, EMPLOYEE)
- ✅ Client-specific fields (gender, region, phone, website, business address)
- ✅ Employee types (DESIGNER, QC, BOTH)

#### 3. Patient Management
- ✅ Create and manage patients
- ✅ Patient demographics (name, gender, date of birth, address)
- ✅ Link patients to cases
- ✅ Patient notes

#### 4. Case Management - Step 1: Files
- ✅ File upload to AWS S3
- ✅ File categorization (SCAN, PHOTO, XRAY, OTHER)
- ✅ Multiple file upload support
- ✅ File validation (type, size)
- ✅ Public URL generation
- ✅ Organized folder structure in S3

#### 5. Case Management - Step 2: Prescription
- ✅ Duration settings (recommended vs limited steps)
- ✅ Existing condition documentation
- ✅ Midline position tracking (upper/lower, with shift measurements)
- ✅ Canine & molar relationship classification
- ✅ Arch selection (upper/lower)
- ✅ Alignment goals (maintain/improve/idealize)
- ✅ Procedure options (IPR, engagers, procline, expand, distalize)
- ✅ Tooth-specific selections (avoid engagers, extract, leave spaces, do not move)
- ✅ Universal tooth numbering (1-32)
- ✅ Retainer inclusion option
- ✅ Additional instructions field
- ✅ Comprehensive validation

#### 6. Case Management - Step 3: Submission
- ✅ Payment proof upload to S3
- ✅ Case submission with validation
- ✅ Automatic status transition to PENDING_APPROVAL
- ✅ Submission timestamp tracking

#### 7. Admin Features
- ✅ Payment proof review
- ✅ Payment approval workflow
- ✅ Case assignment to designer & QC
- ✅ Status transition to IN_DESIGN after approval
- ✅ Full system access

#### 8. Workflow Management
- ✅ 11-status workflow
- ✅ Status transition validation
- ✅ Role-based transition permissions
- ✅ Workflow audit trail (CaseWorkflowLog)
- ✅ Refinement counting (QC/Client rejections)

#### 9. Comments System
- ✅ Case discussion threads
- ✅ File attachments support (up to 5 files per comment)
- ✅ S3 storage for attachments
- ✅ Role-based access control
- ✅ Comment deletion with cascade
- ✅ User attribution

#### 10. Dashboard & Analytics
- ✅ Client-specific statistics
- ✅ Patient count
- ✅ Case metrics (total, this month)
- ✅ Refinement tracking (total, this month)
- ✅ Cases by status breakdown

#### 11. API Documentation
- ✅ Swagger/OpenAPI 3.0
- ✅ Interactive API documentation
- ✅ Request/response examples
- ✅ Schema definitions
- ✅ Authentication integration
- ✅ "Try it out" functionality

#### 12. Data Validation
- ✅ Email format validation
- ✅ Phone number validation (international format)
- ✅ Password complexity requirements
- ✅ File type validation
- ✅ File size limits (50MB for case files, 10MB for comments/payment proof)
- ✅ Tooth number validation (1-32)
- ✅ Prescription required fields
- ✅ Chief complaint minimum length

#### 13. Database Features
- ✅ PostgreSQL with Prisma ORM
- ✅ Type-safe database queries
- ✅ Automatic migrations
- ✅ Cascade deletions
- ✅ Indexes for performance
- ✅ JSON fields for array data
- ✅ Audit timestamps (createdAt, updatedAt)

### 📊 System Statistics

- **Total Models**: 11 (User, Patient, Case, CaseFile, Prescription, CaseComment, CommentAttachment, Payment, CaseAssignment, CaseWorkflowLog)
- **Total Enums**: 8
- **Total API Endpoints**: 40+
- **User Roles**: 3
- **Case Statuses**: 11
- **File Categories**: 4
- **Workflow Transitions**: 15+

---

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/orthoalign?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
NODE_ENV="development"

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=orthoalign
```

---

## Getting Started

### Prerequisites
- Node.js (v14+)
- PostgreSQL
- AWS S3 bucket
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run dev
```

### Accessing the System

- **API Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api-docs

---

## File Storage Structure

### AWS S3 Organization

```
orthoalign/
├── cases/
│   ├── {caseId}/
│   │   ├── scan/
│   │   │   └── {timestamp}-{filename}.jpg
│   │   ├── photo/
│   │   │   └── {timestamp}-{filename}.jpg
│   │   ├── xray/
│   │   │   └── {timestamp}-{filename}.jpg
│   │   ├── other/
│   │   │   └── {timestamp}-{filename}.pdf
│   │   ├── payment-proof/
│   │   │   └── {timestamp}-{filename}.pdf
│   │   └── comments/
│   │       └── {commentId}/
│   │           └── {timestamp}-{filename}.jpg
```

---

## Security Features

### Authentication
- ✅ JWT tokens with expiration
- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ Protected routes with middleware

### Authorization
- ✅ Role-based access control
- ✅ Resource ownership validation
- ✅ Case assignment verification

### Data Validation
- ✅ Input sanitization
- ✅ Type checking with TypeScript
- ✅ Prisma schema validation
- ✅ File type restrictions

### File Security
- ✅ File size limits
- ✅ MIME type validation
- ✅ Sanitized filenames
- ✅ Organized S3 structure
- ✅ Public read access (configurable)

---

## Maintenance & Monitoring

### Database Migrations

```bash
# Create new migration
npm run prisma:migrate

# Reset database
npm run prisma:reset

# View migration status
npx prisma migrate status
```

### Logs
- Application logs in console
- Workflow transitions logged in `case_workflow_logs`
- Error tracking in try-catch blocks

---

## Future Enhancements (Not Implemented)

- [ ] Email notifications
- [ ] Real-time updates (WebSockets)
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Export functionality (PDF reports)
- [ ] File versioning
- [ ] 3D model viewer integration
- [ ] Payment gateway integration
- [ ] Mobile app
- [ ] Multi-language support

---

## Support & Documentation

- **API Documentation**: http://localhost:3000/api-docs
- **Prisma Studio**: `npx prisma studio`
- **TypeScript**: Full type safety with generated Prisma types

---

## License & Credits

Built with:
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- AWS S3
- Swagger/OpenAPI

---

*Last Updated: February 28, 2026*
*Version: 1.0.0*
