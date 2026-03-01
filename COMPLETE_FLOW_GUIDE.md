# OrthoAlign - Complete System Flow Documentation

## Table of Contents
1. [User Roles Overview](#user-roles-overview)
2. [Complete Case Lifecycle](#complete-case-lifecycle)
3. [Client Flow (Step-by-Step)](#client-flow-step-by-step)
4. [Admin Flow (Step-by-Step)](#admin-flow-step-by-step)
5. [Designer Flow (Step-by-Step)](#designer-flow-step-by-step)
6. [QC Flow (Step-by-Step)](#qc-flow-step-by-step)
7. [Status Transitions](#status-transitions)
8. [API Endpoints by Workflow](#api-endpoints-by-workflow)
9. [Data Flow Examples](#data-flow-examples)
10. [Edge Cases & Scenarios](#edge-cases--scenarios)

---

## User Roles Overview

### 1. CLIENT (Doctor/Dentist)
- **Access:** Self-registration, manages own patients and cases
- **Can:**
  - Register and login
  - Create and manage patients
  - Create cases for patients
  - Upload diagnostic files (scans, photos, x-rays)
  - Fill prescription forms
  - Upload payment proof
  - Submit cases for admin approval
  - Review completed work from designer
  - Approve or reject final designs
  - Add comments and view production files
  - View dashboard statistics
- **Cannot:**
  - Access other clients' data
  - See internal comments from QC/Designer
  - Assign designers or QC
  - Approve payments

### 2. ADMIN
- **Access:** Full system access
- **Can:**
  - Create employee accounts (Designer/QC)
  - View all users, patients, cases
  - Approve payment proofs
  - Assign Designer and QC to cases
  - Reassign cases when needed
  - View all comments (internal + external)
  - Override case statuses if needed
  - Manage payments
  - Full oversight of all workflows
- **Cannot:**
  - Self-register (must be created by another admin or database seeding)

### 3. EMPLOYEE - Designer
- **Access:** View and work on assigned cases only
- **Can:**
  - Login with credentials provided by admin
  - View assigned cases (read-only access to case details)
  - View diagnostic files and prescriptions
  - Upload production files (3D models, designs, up to 100MB)
  - Add production URLs (Google Drive, Dropbox, etc.)
  - Submit completed work to QC review
  - Add internal comments (for QC feedback)
  - Add external comments (visible to client)
  - See rejection feedback from QC
  - Make revisions and resubmit
- **Cannot:**
  - Edit case details or prescription
  - Approve own work
  - Access cases not assigned to them
  - Create cases or patients

### 4. EMPLOYEE - QC (Quality Control)
- **Access:** View and review assigned cases only
- **Can:**
  - Login with credentials provided by admin
  - View assigned cases (read-only access to case details)
  - View all files (diagnostic + production)
  - View production URLs from designer
  - Add internal comments (feedback for designer)
  - Add external comments (visible to client)
  - Approve cases for client review
  - Reject cases back to designer with notes
  - See refinement history
- **Cannot:**
  - Edit case details or prescription
  - Upload production files (designer's job)
  - Access cases not assigned to them
  - Approve payments

### 5. EMPLOYEE - BOTH (Designer + QC)
- **Access:** Can perform both Designer and QC roles
- **Useful for:** Small teams or solo practitioners
- **Note:** Should not QC their own work (business rule, not enforced by system)

---

## Complete Case Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORTHOALIGN CASE LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: CLIENT INITIATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   CLIENT     │ Registers & Logs in
└──────┬───────┘
       │
       ├─► Creates Patient Record
       │   (name, DOB, gender, address, notes)
       │
       ├─► Creates Case (selects patient)
       │   Status: PENDING_PAYMENT
       │
       ├─► STEP 1: Uploads Diagnostic Files
       │   • Scans (SCAN)
       │   • Photos (PHOTO)
       │   • X-rays (XRAY)
       │   • Other files (OTHER)
       │   → Stored in S3: cases/{caseId}/{category}/
       │
       ├─► STEP 2: Fills Prescription Form
       │   • Chief complaint
       │   • Treatment duration
       │   • Arch selection
       │   • Alignment goals
       │   • Midline positions
       │   • Overjet/overbite corrections
       │   • Tooth-specific instructions
       │   • Retainer option
       │   • Additional notes
       │
       ├─► STEP 3: Uploads Payment Proof
       │   • Receipt/invoice/screenshot
       │   → Stored in S3: cases/{caseId}/payment-proof/
       │
       └─► Submits Case
           Status: PENDING_PAYMENT → PENDING_APPROVAL


PHASE 2: ADMIN APPROVAL & ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│    ADMIN     │ Reviews submission
└──────┬───────┘
       │
       ├─► Reviews Payment Proof
       │   • Verifies payment amount
       │   • Checks payment method
       │
       ├─► Assigns Designer & QC
       │   • Selects from employee list
       │   • Can assign same person (type: BOTH)
       │   • Can assign different people
       │
       └─► Approves Payment & Starts Case
           Status: PENDING_APPROVAL → IN_DESIGN
           → Designer & QC notified (future: email)


PHASE 3: DESIGNER WORK
━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   DESIGNER   │ Logs in & views assigned cases
└──────┬───────┘
       │
       ├─► Opens Case (Status: IN_DESIGN)
       │   • Reads prescription
       │   • Reviews diagnostic files
       │   • Checks patient details
       │
       ├─► Works on Design
       │   • Creates 3D models
       │   • Plans treatment stages
       │   • Prepares aligners design
       │
       ├─► Uploads Production Files
       │   • 3D models (.stl files)
       │   • Design PDFs
       │   • Treatment plan documents
       │   → Stored in S3: cases/{caseId}/production/
       │   → Category: PRODUCTION
       │
       ├─► (Optional) Adds Production URLs
       │   • Google Drive links
       │   • Dropbox shares
       │   • Other cloud storage
       │
       ├─► (Optional) Adds Comments
       │   • Internal: for QC review
       │   • External: for client info
       │
       └─► Submits to QC
           POST /api/designer/cases/{id}/submit-to-qc
           Status: IN_DESIGN → PENDING_QC
           → QC notified (future: email)


PHASE 4: QC REVIEW (First Time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│     QC       │ Logs in & views assigned cases
└──────┬───────┘
       │
       ├─► Opens Case (Status: PENDING_QC)
       │   • Reviews prescription compliance
       │   • Checks production files
       │   • Verifies treatment plan
       │
       ├─► Reviews Production Files
       │   • Downloads 3D models
       │   • Opens design PDFs
       │   • Checks URLs
       │
       ├─── DECISION POINT ──────┐
       │                          │
       ▼                          ▼
   APPROVE                    REJECT
       │                          │
       ├─► Adds Comment           ├─► Adds Internal Comment
       │   "Looks good!"          │   "Tooth #12 alignment needs adjustment"
       │                          │
       └─► Approves               └─► Rejects with Notes
           POST /api/qc/          POST /api/qc/cases/{id}/reject
           cases/{id}/approve     
                                  Status: PENDING_QC → QC_REJECTED → IN_DESIGN
           Status: PENDING_QC     Refinement Count: +1
           → PENDING_CLIENT       → Designer sees case back in queue
           _REVIEW                → Designer sees rejection notes
                                  → Designer makes corrections
           → Client notified      → Designer resubmits to QC
           (future: email)        → LOOP back to PHASE 3


PHASE 5A: CLIENT APPROVAL (Happy Path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   CLIENT     │ Notified of completed design
└──────┬───────┘
       │
       ├─► Opens Case (Status: PENDING_CLIENT_REVIEW)
       │   • Sees all diagnostic files
       │   • Sees production files
       │   • Sees production URLs
       │   • Reads external comments
       │
       ├─► Reviews Design
       │   • Downloads 3D models
       │   • Reviews treatment plan
       │   • Checks against original prescription
       │
       ├─── DECISION POINT ──────┐
       │                          │
       ▼                          ▼
   APPROVE                    REJECT
       │                          │
       ├─► Adds Comment           ├─► Adds Comment with Issues
       │   "Perfect! Approved"    │   "Please adjust front teeth"
       │                          │
       └─► Approves Case          └─► Rejects Case
           POST /api/cases/       POST /api/cases/
           {id}/transition        {id}/transition
           {status: APPROVED}     {status: CLIENT_REJECTED}
           
           Status: PENDING_       Status: PENDING_CLIENT_REVIEW
           CLIENT_REVIEW          → CLIENT_REJECTED → IN_DESIGN
           → APPROVED ✓           Refinement Count: +1
                                  → Designer sees case back
           🎉 CASE COMPLETE       → Designer makes changes
           Case archived          → LOOP back to PHASE 3


PHASE 5B: QC REJECTION - REFINEMENT LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   DESIGNER   │ Sees rejected case back in queue
└──────┬───────┘
       │
       ├─► Opens Case (Status: IN_DESIGN)
       │   • Reads QC rejection notes
       │   • Checks internal comments
       │   • Reviews feedback
       │
       ├─► Makes Corrections
       │   • Adjusts 3D model
       │   • Updates treatment plan
       │   • Fixes identified issues
       │
       ├─► Uploads Updated Files
       │   • New production files
       │   • Updated documents
       │
       ├─► Adds Internal Comment
       │   "Fixed tooth #12 alignment as requested"
       │
       └─► Resubmits to QC
           Status: IN_DESIGN → PENDING_QC
           → QC reviews again (back to PHASE 4)
           → Refinement count already incremented


PHASE 5C: CLIENT REJECTION - REFINEMENT LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   DESIGNER   │ Sees client-rejected case
└──────┬───────┘
       │
       ├─► Opens Case (Status: IN_DESIGN)
       │   • Reads client comments
       │   • Understands client concerns
       │   • Checks external comments
       │
       ├─► Makes Major Changes
       │   • Redesigns treatment plan
       │   • Adjusts models per client request
       │
       ├─► Uploads New Production Files
       │
       ├─► Adds External Comment
       │   "Updated design based on your feedback"
       │
       └─► Resubmits to QC
           Status: IN_DESIGN → PENDING_QC
           → QC reviews (back to PHASE 4)
           → Client reviews again after QC approval


REFINEMENT TRACKING
━━━━━━━━━━━━━━━━━━━
Refinement count increments when:
• QC rejects: refinementCount++
• Client rejects: refinementCount++

Displayed on:
• Client dashboard ("refinements total", "refinements this month")
• Case details (for all users)
• Admin analytics (future)

Use case:
• Track case complexity
• Identify problematic cases
• Performance metrics for designers
• Quality metrics for QC
```

---

## Client Flow (Step-by-Step)

### 1. Registration
```http
POST /api/auth/register
{
  "email": "doctor@clinic.com",
  "password": "SecurePass123!",
  "name": "Dr. John Smith",
  "gender": "MALE",
  "region": "North America",
  "phone": "+1-234-567-8900",
  "website": "https://smithdental.com",
  "businessAddress": "123 Main St, City, State 12345",
  "hearAboutUs": "Google Search"
}
```

### 2. Login
```http
POST /api/auth/login
{
  "email": "doctor@clinic.com",
  "password": "SecurePass123!"
}
Response: { "token": "jwt_token_here", "user": {...} }
```

### 3. Create Patient
```http
POST /api/patients
Authorization: Bearer {token}
{
  "name": "Jane Doe",
  "gender": "FEMALE",
  "dateOfBirth": "1990-05-15",
  "address": "456 Patient Ave, City",
  "notes": "Requires aligner for upper teeth"
}
Response: { "patient": { "id": "patient123", ... } }
```

### 4. Create Case
```http
POST /api/cases
Authorization: Bearer {token}
{
  "patientId": "patient123",
  "notes": "Initial consultation - crowding issues"
}
Response: { 
  "case": { 
    "id": "case123", 
    "status": "PENDING_PAYMENT",
    ...
  } 
}
```

### 5. Upload Diagnostic Files (Step 1)
```http
POST /api/cases/case123/files
Authorization: Bearer {token}
Content-Type: multipart/form-data

files: [scan1.jpg, photo1.jpg, xray1.jpg]
category: SCAN (or PHOTO, XRAY, OTHER)

Response: { 
  "files": [
    {
      "id": "file123",
      "fileUrl": "https://bucket.s3.region.amazonaws.com/cases/case123/scan/...",
      "category": "SCAN",
      ...
    }
  ] 
}
```

### 6. Fill Prescription (Step 2)
```http
POST /api/cases/case123/prescription
Authorization: Bearer {token}
{
  "chiefComplaint": "Patient has crowding in upper arch",
  "durationRecommended": true,
  "upperMidlinePosition": "CENTERED",
  "lowerMidlinePosition": "CENTERED",
  "treatArches": "BOTH",
  "upperArchAlignment": "IMPROVE",
  "lowerArchAlignment": "IMPROVE",
  // ... many more fields
  "includeRetainer": true,
  "additionalInstructions": "Patient prefers faster treatment"
}
```

### 7. Upload Payment Proof (Step 3)
```http
POST /api/cases/case123/payment-proof
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: payment_receipt.pdf

Response: { "paymentProofUrl": "https://..." }
```

### 8. Submit Case
```http
POST /api/cases/case123/submit
Authorization: Bearer {token}

Response: { 
  "case": { 
    "id": "case123",
    "status": "PENDING_APPROVAL",
    "submittedAt": "2026-02-28T12:00:00Z",
    ...
  } 
}
```

### 9. View Dashboard
```http
GET /api/dashboard
Authorization: Bearer {token}

Response: {
  "registeredPatients": 15,
  "totalCases": 25,
  "casesThisMonth": 3,
  "totalRefinements": 8,
  "refinementsThisMonth": 2,
  "casesByStatus": {
    "PENDING_PAYMENT": 2,
    "PENDING_APPROVAL": 1,
    "IN_DESIGN": 3,
    "PENDING_QC": 2,
    "PENDING_CLIENT_REVIEW": 1,
    "APPROVED": 13,
    "CANCELLED": 0
  }
}
```

### 10. Review Completed Work
```http
GET /api/cases/case123
Authorization: Bearer {token}

Response: {
  "case": {
    "id": "case123",
    "status": "PENDING_CLIENT_REVIEW",
    "patient": {...},
    "files": [...diagnostic files...],
    "prescription": {...},
    "productionUrls": [
      {
        "id": "url123",
        "url": "https://drive.google.com/file/d/abc123",
        "description": "Final 3D models",
        "addedBy": { "name": "Designer John" }
      }
    ],
    "comments": [...external comments only...]
  }
}
```

### 11. Approve/Reject Design
```http
# Approve
POST /api/cases/case123/transition
Authorization: Bearer {token}
{
  "newStatus": "APPROVED"
}

# Or Reject
POST /api/cases/case123/transition
Authorization: Bearer {token}
{
  "newStatus": "CLIENT_REJECTED",
  "note": "Please adjust front teeth alignment"
}
```

---

## Admin Flow (Step-by-Step)

### 1. Create Designer Account
```http
POST /api/users/employees
Authorization: Bearer {admin_token}
{
  "email": "designer@orthoalign.com",
  "password": "Designer123!",
  "name": "John Designer",
  "employeeType": "DESIGNER"
}
Response: {
  "user": { "id": "emp123", ... },
  "temporaryPassword": "Designer123!"
}
```

### 2. Create QC Account
```http
POST /api/users/employees
Authorization: Bearer {admin_token}
{
  "email": "qc@orthoalign.com",
  "password": "Qc123!@#",
  "name": "Jane QC",
  "employeeType": "QC"
}
```

### 3. View Pending Cases
```http
GET /api/cases?status=PENDING_APPROVAL
Authorization: Bearer {admin_token}

Response: {
  "cases": [
    {
      "id": "case123",
      "status": "PENDING_APPROVAL",
      "paymentProofUrl": "https://...",
      "submittedAt": "...",
      "patient": {...},
      "createdBy": {...}
    }
  ]
}
```

### 4. Review Payment Proof
```http
GET /api/cases/case123
Authorization: Bearer {admin_token}

# Admin manually checks paymentProofUrl
# Opens URL in browser to verify payment
```

### 5. Approve Payment & Assign Team
```http
POST /api/cases/case123/approve-payment
Authorization: Bearer {admin_token}
{
  "designerId": "emp123",
  "qcId": "emp456"
}

Response: {
  "case": {
    "id": "case123",
    "status": "IN_DESIGN",
    "designerId": "emp123",
    "qcId": "emp456",
    "designer": { "name": "John Designer" },
    "qc": { "name": "Jane QC" }
  }
}
```

### 6. List All Employees
```http
GET /api/users/employees
Authorization: Bearer {admin_token}

Response: {
  "users": [
    {
      "id": "emp123",
      "name": "John Designer",
      "email": "designer@orthoalign.com",
      "employeeType": "DESIGNER"
    },
    {
      "id": "emp456",
      "name": "Jane QC",
      "employeeType": "QC"
    }
  ]
}
```

### 7. Reassign Case (if needed)
```http
POST /api/cases/case123/assign
Authorization: Bearer {admin_token}
{
  "designerId": "emp789",
  "qcId": "emp456"
}
```

### 8. View All Cases
```http
GET /api/cases
Authorization: Bearer {admin_token}

# Can filter by status, patient, designer, qc, etc.
```

---

## Designer Flow (Step-by-Step)

### 1. Login
```http
POST /api/auth/login
{
  "email": "designer@orthoalign.com",
  "password": "Designer123!"
}
```

### 2. View Assigned Cases
```http
GET /api/employee/cases
Authorization: Bearer {designer_token}

Response: {
  "cases": [
    {
      "id": "case123",
      "status": "IN_DESIGN",
      "patient": {...},
      "prescription": {...},
      "files": [...diagnostic files...],
      "productionUrls": []
    }
  ]
}
```

### 3. View Case Details
```http
GET /api/employee/cases/case123
Authorization: Bearer {designer_token}

# Full case details including prescription
```

### 4. Upload Production Files
```http
POST /api/cases/case123/production/files
Authorization: Bearer {designer_token}
Content-Type: multipart/form-data

files: [3d_model.stl, treatment_plan.pdf]

Response: {
  "files": [
    {
      "id": "file789",
      "category": "PRODUCTION",
      "fileUrl": "https://bucket.s3.../cases/case123/production/...",
      "fileName": "3d_model.stl",
      "fileSize": 52428800
    }
  ]
}
```

### 5. Add Production URL
```http
POST /api/cases/case123/production/urls
Authorization: Bearer {designer_token}
{
  "url": "https://drive.google.com/file/d/abc123/view",
  "description": "Complete 3D models and renders"
}

Response: {
  "productionUrl": {
    "id": "url123",
    "url": "https://drive.google.com/...",
    "description": "Complete 3D models and renders",
    "addedBy": { "name": "John Designer" }
  }
}
```

### 6. Add Internal Comment (for QC)
```http
POST /api/cases/case123/comments
Authorization: Bearer {designer_token}
{
  "comment": "Ready for QC review. Made adjustments per last feedback.",
  "isInternal": true
}
```

### 7. Submit to QC
```http
POST /api/designer/cases/case123/submit-to-qc
Authorization: Bearer {designer_token}
{
  "notes": "Completed design according to prescription. Ready for QC review."
}

Response: {
  "message": "Case submitted to QC for review",
  "case": {
    "id": "case123",
    "status": "PENDING_QC",
    ...
  }
}
```

### 8. Handle Rejection (if QC rejects)
```http
# Designer sees case back in IN_DESIGN status
GET /api/employee/cases/case123

# Reads QC rejection notes in comments
GET /api/cases/case123/comments

# Makes corrections, uploads new files
POST /api/cases/case123/production/files

# Resubmits
POST /api/designer/cases/case123/submit-to-qc
```

---

## QC Flow (Step-by-Step)

### 1. Login
```http
POST /api/auth/login
{
  "email": "qc@orthoalign.com",
  "password": "Qc123!@#"
}
```

### 2. View Assigned Cases Pending QC
```http
GET /api/employee/cases?status=PENDING_QC
Authorization: Bearer {qc_token}

Response: {
  "cases": [
    {
      "id": "case123",
      "status": "PENDING_QC",
      "patient": {...},
      "prescription": {...},
      "files": [...diagnostic + production files...],
      "productionUrls": [...]
    }
  ]
}
```

### 3. Review Case Details
```http
GET /api/employee/cases/case123
Authorization: Bearer {qc_token}

# Full access to:
# - Prescription
# - Diagnostic files
# - Production files
# - Production URLs
# - All comments (internal + external)
```

### 4. Download Production Files
```
# QC manually downloads files from URLs
# - Opens production file URLs in browser
# - Downloads 3D models
# - Reviews treatment plans
# - Checks against prescription
```

### 5A: Approve Case (Happy Path)
```http
POST /api/qc/cases/case123/approve
Authorization: Bearer {qc_token}

Response: {
  "message": "Case approved and sent for client review",
  "case": {
    "id": "case123",
    "status": "PENDING_CLIENT_REVIEW",
    ...
  }
}
```

### 5B: Reject Case (Issues Found)
```http
POST /api/qc/cases/case123/reject
Authorization: Bearer {qc_token}
{
  "notes": "Tooth #12 alignment needs adjustment. Upper midline is slightly off center. Please revise."
}

Response: {
  "message": "Case rejected and sent back to designer",
  "case": {
    "id": "case123",
    "status": "IN_DESIGN",
    "refinementCount": 1
  }
}
```

### 6. Add Internal Comment (for Designer)
```http
POST /api/cases/case123/comments
Authorization: Bearer {qc_token}
{
  "comment": "Overall design looks good. Just minor adjustment needed on tooth #12.",
  "isInternal": true
}
```

### 7. Add External Comment (for Client)
```http
POST /api/cases/case123/comments
Authorization: Bearer {qc_token}
{
  "comment": "Treatment plan follows your prescription. Design approved for your review.",
  "isInternal": false
}
```

---

## Status Transitions

### Valid Status Flow

```
PENDING_PAYMENT (initial)
    ↓ (client submits)
PENDING_APPROVAL
    ↓ (admin approves & assigns)
IN_DESIGN
    ↓ (designer submits to QC)
PENDING_QC
    ↓
    ├─ (QC approves) → PENDING_CLIENT_REVIEW
    │                      ↓
    │                      ├─ (client approves) → APPROVED ✓
    │                      └─ (client rejects) → CLIENT_REJECTED → IN_DESIGN
    │
    └─ (QC rejects) → QC_REJECTED → IN_DESIGN

CANCELLED (admin can cancel at any time)
```

### Status Transition Matrix

| From Status | To Status | Who Can Transition | Endpoint |
|------------|-----------|-------------------|----------|
| PENDING_PAYMENT | PENDING_APPROVAL | Client | POST /api/cases/{id}/submit |
| PENDING_APPROVAL | IN_DESIGN | Admin | POST /api/cases/{id}/approve-payment |
| IN_DESIGN | PENDING_QC | Designer | POST /api/designer/cases/{id}/submit-to-qc |
| PENDING_QC | PENDING_CLIENT_REVIEW | QC | POST /api/qc/cases/{id}/approve |
| PENDING_QC | QC_REJECTED | QC | POST /api/qc/cases/{id}/reject |
| QC_REJECTED | IN_DESIGN | System (auto) | (automatic after reject) |
| PENDING_CLIENT_REVIEW | APPROVED | Client | POST /api/cases/{id}/transition |
| PENDING_CLIENT_REVIEW | CLIENT_REJECTED | Client | POST /api/cases/{id}/transition |
| CLIENT_REJECTED | IN_DESIGN | System (auto) | (automatic after reject) |
| Any | CANCELLED | Admin | POST /api/cases/{id}/transition |

---

## API Endpoints by Workflow

### Authentication
- `POST /api/auth/register` - Client self-registration
- `POST /api/auth/login` - All users login

### Client Endpoints
- `GET /api/dashboard` - Dashboard statistics
- `POST /api/patients` - Create patient
- `GET /api/patients` - List own patients
- `GET /api/patients/{id}` - Get patient details
- `PATCH /api/patients/{id}` - Update patient
- `POST /api/cases` - Create case
- `GET /api/cases` - List own cases
- `GET /api/cases/{id}` - Get case details
- `POST /api/cases/{id}/files` - Upload diagnostic files
- `GET /api/cases/{id}/files` - List files
- `DELETE /api/cases/{id}/files/{fileId}` - Delete file
- `POST /api/cases/{id}/prescription` - Create/update prescription
- `GET /api/cases/{id}/prescription` - Get prescription
- `POST /api/cases/{id}/payment-proof` - Upload payment proof
- `POST /api/cases/{id}/submit` - Submit case
- `GET /api/cases/{id}/production/urls` - View production URLs
- `POST /api/cases/{id}/comments` - Add comment
- `GET /api/cases/{id}/comments` - Get comments (external only)
- `POST /api/cases/{id}/transition` - Approve/reject design

### Admin Endpoints
- `POST /api/users/employees` - Create employee account
- `GET /api/users` - List all users
- `GET /api/users/employees` - List employees
- `GET /api/users/{id}` - Get user details
- `PATCH /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/cases` - List all cases
- `GET /api/cases/{id}` - Get any case
- `POST /api/cases/{id}/approve-payment` - Approve & assign
- `POST /api/cases/{id}/assign` - Reassign designer/QC
- `POST /api/cases/{id}/transition` - Force status change
- `GET /api/patients` - List all patients
- `POST /api/payments` - Create payment
- `GET /api/payments/case/{caseId}` - Get payments

### Designer Endpoints
- `GET /api/employee/cases` - List assigned cases
- `GET /api/employee/cases/{id}` - Get case details
- `POST /api/cases/{id}/production/files` - Upload production files
- `POST /api/cases/{id}/production/urls` - Add production URL
- `GET /api/cases/{id}/production/urls` - List production URLs
- `DELETE /api/cases/{id}/production/urls/{urlId}` - Delete URL
- `POST /api/designer/cases/{id}/submit-to-qc` - Submit to QC
- `POST /api/cases/{id}/comments` - Add comment (internal/external)
- `GET /api/cases/{id}/comments` - Get all comments

### QC Endpoints
- `GET /api/employee/cases` - List assigned cases
- `GET /api/employee/cases/{id}` - Get case details
- `GET /api/cases/{id}/production/urls` - View production URLs
- `POST /api/qc/cases/{id}/approve` - Approve for client review
- `POST /api/qc/cases/{id}/reject` - Reject back to designer
- `POST /api/cases/{id}/comments` - Add comment (internal/external)
- `GET /api/cases/{id}/comments` - Get all comments

---

## Data Flow Examples

### Example 1: Simple Case (No Rejections)

```
Day 1:
- Client creates case, uploads files, fills prescription
- Client uploads payment proof and submits
- Status: PENDING_APPROVAL

Day 2:
- Admin reviews payment
- Admin assigns Designer (John) and QC (Jane)
- Status: IN_DESIGN

Day 3-5:
- Designer John works on 3D model
- Designer uploads production files
- Designer adds production URL (Google Drive)
- Designer submits to QC
- Status: PENDING_QC

Day 6:
- QC Jane reviews design
- QC approves
- Status: PENDING_CLIENT_REVIEW

Day 7:
- Client reviews production files
- Client approves
- Status: APPROVED ✓
- refinementCount: 0
```

### Example 2: Case with QC Rejection

```
Day 1-5: Same as Example 1 until PENDING_QC

Day 6:
- QC Jane reviews design
- QC finds issue with tooth #12
- QC adds internal comment: "Tooth #12 needs adjustment"
- QC rejects case
- Status: PENDING_QC → QC_REJECTED → IN_DESIGN
- refinementCount: 1

Day 7-8:
- Designer John sees case back in queue
- Designer reads QC comments
- Designer fixes tooth #12 alignment
- Designer uploads updated production files
- Designer resubmits to QC
- Status: IN_DESIGN → PENDING_QC

Day 9:
- QC Jane reviews again
- QC approves
- Status: PENDING_CLIENT_REVIEW

Day 10:
- Client reviews and approves
- Status: APPROVED ✓
- refinementCount: 1 (stayed at 1)
```

### Example 3: Case with Client Rejection

```
Day 1-7: Designer completes, QC approves
- Status: PENDING_CLIENT_REVIEW

Day 8:
- Client reviews design
- Client not satisfied with front teeth
- Client adds comment: "Front teeth need more spacing"
- Client rejects
- Status: PENDING_CLIENT_REVIEW → CLIENT_REJECTED → IN_DESIGN
- refinementCount: 1

Day 9-11:
- Designer redesigns front section
- Designer uploads new production files
- Designer submits to QC
- Status: IN_DESIGN → PENDING_QC

Day 12:
- QC reviews updated design
- QC approves
- Status: PENDING_CLIENT_REVIEW

Day 13:
- Client reviews again
- Client approves
- Status: APPROVED ✓
- refinementCount: 1
```

### Example 4: Case with Multiple Rejections

```
Timeline:
1. Designer submits → QC rejects (refinementCount: 1)
2. Designer fixes → QC rejects again (refinementCount: 2)
3. Designer fixes → QC approves → Client rejects (refinementCount: 3)
4. Designer redesigns → QC approves → Client approves ✓

Final refinementCount: 3
```

---

## Edge Cases & Scenarios

### Scenario 1: Client Submits Without Payment Proof
**Issue:** Client tries to submit case without uploading payment proof

**System Behavior:**
- `POST /api/cases/{id}/submit` checks for `paymentProofUrl`
- If missing, returns 400 error: "Payment proof is required"
- Client must upload payment proof first

### Scenario 2: Designer Assigned to Multiple Cases
**Issue:** Designer has 10 cases assigned simultaneously

**System Behavior:**
- Designer sees all 10 cases in `GET /api/employee/cases`
- Can filter by status: `?status=IN_DESIGN`
- Works on them one by one
- No limit on assigned cases per designer (admin decides)

### Scenario 3: Same Person is Designer and QC (BOTH type)
**Issue:** Employee with type BOTH does design and QC

**System Behavior:**
- Works on case as designer
- Submits to QC
- Can then review own work as QC
- ⚠️ **Business Rule:** Should not QC own work (not enforced by system)
- **Recommendation:** Admin should assign different people when possible

### Scenario 4: Admin Needs to Reassign Case Mid-Process
**Issue:** Designer unavailable, case needs to be reassigned

**System Behavior:**
- Admin uses `POST /api/cases/{id}/assign`
- Assigns new designer
- Case stays in current status
- New designer sees case in their queue
- Old designer no longer sees it

### Scenario 5: Case Stuck in IN_DESIGN for Days
**Issue:** Designer hasn't submitted case to QC

**System Behavior:**
- Case remains in IN_DESIGN status
- No automatic timeout
- Admin can:
  - View case status
  - Reassign to different designer
  - Contact designer outside system
- **Future Enhancement:** Add notifications/reminders

### Scenario 6: Client Wants to Cancel Submitted Case
**Issue:** Client changes mind after submission

**System Behavior:**
- Client cannot cancel directly
- Client must contact admin
- Admin can use `POST /api/cases/{id}/transition` with `status: CANCELLED`
- Case moved to CANCELLED status
- No refund logic in system (handled externally)

### Scenario 7: Multiple Diagnostic File Types
**Issue:** Client uploads mix of scans, photos, x-rays

**System Behavior:**
- Each file upload specifies category
- Files organized by category in S3
- `GET /api/cases/{id}/files?category=SCAN` filters by type
- All files visible to designer/QC regardless of category

### Scenario 8: Production File Too Large
**Issue:** Designer tries to upload 150MB 3D model

**System Behavior:**
- System validates file size (max 100MB for production)
- Returns 400 error: "File too large"
- Designer options:
  - Compress file
  - Split into multiple files
  - Use production URL (Google Drive, etc.) instead

### Scenario 9: QC Approves, Then Finds Issue
**Issue:** QC approved case but later notices problem

**System Behavior:**
- Case already in PENDING_CLIENT_REVIEW
- QC cannot "unapprove"
- QC options:
  - Add external comment for client
  - Contact admin to revert status manually
  - Let client reject if they notice issue
- **Future Enhancement:** Add "recall" feature

### Scenario 10: Internal vs External Comments Confusion
**Issue:** Designer accidentally posts internal comment as external

**System Behavior:**
- Once posted, comment visibility is fixed
- Client would see the comment
- Designer can delete comment and repost
- `DELETE /api/cases/{id}/comments/{commentId}`
- Then re-add with correct `isInternal` flag

---

## Questions for You

Now that you've seen the complete flow, let me know:

1. **Does the workflow match your business process?**
   - Are the steps in the right order?
   - Any missing steps?

2. **Status transitions clear?**
   - Do the status names make sense?
   - Any status we should add/remove?

3. **Roles and permissions correct?**
   - Should Designer be able to do anything else?
   - Should QC have any other capabilities?
   - Should Client have more/less access?

4. **Refinement tracking sufficient?**
   - Is counting QC + Client rejections correct?
   - Need any other metrics?

5. **Comment system working as expected?**
   - Internal vs External clear enough?
   - Need any other comment features?

6. **File management adequate?**
   - File size limits appropriate?
   - Need any other file categories?
   - Should we add file versioning?

7. **Missing features?**
   - Notifications/emails?
   - Reporting/analytics?
   - Bulk operations?
   - Case templates?
   - Anything else?

Let me know your thoughts! 🚀
