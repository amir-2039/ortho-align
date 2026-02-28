# Designer and QC Workflow Implementation

## Overview
This document outlines the implementation of Designer and QC-specific workflows, including production file management, internal comments, and case review capabilities.

---

## Database Schema Changes

### 1. FileCategory Enum - Added PRODUCTION
```prisma
enum FileCategory {
  SCAN
  PHOTO
  XRAY
  PRODUCTION  // NEW: For designer production files
  OTHER
}
```

### 2. CaseComment Model - Added Internal Comments
```prisma
model CaseComment {
  // ...existing fields
  isInternal Boolean @default(false)  // NEW: Internal comments visible only to employees
}
```

### 3. CaseProductionUrl Model - NEW
```prisma
model CaseProductionUrl {
  id          String   @id @default(cuid())
  caseId      String
  url         String
  description String?
  addedById   String
  createdAt   DateTime @default(now())

  case      Case @relation(fields: [caseId], references: [id])
  addedBy   User @relation(fields: [addedById], references: [id])
}
```

---

## Designer Capabilities

### 1. View Assigned Cases
**Endpoint:** `GET /api/employee/cases`
- Designers can view all cases assigned to them
- Optional status filter
- Returns case details with patient info, files, prescription, and production URLs

**Example Response:**
```json
{
  "cases": [
    {
      "id": "clx789ghi",
      "status": "IN_DESIGN",
      "patient": { ... },
      "files": [ ... ],
      "prescription": { ... },
      "productionUrls": [ ... ]
    }
  ]
}
```

### 2. View Single Case Details
**Endpoint:** `GET /api/employee/cases/{id}`
- Full read-only access to assigned case
- Includes all files, prescription, and production URLs
- Cannot edit case data

### 3. Upload Production Files
**Endpoint:** `POST /api/cases/{id}/production/files`
- **Access:** Designer (or BOTH) only
- **Requirement:** Must be assigned as designer
- Upload up to 10 files, max 100MB each
- Files categorized as PRODUCTION
- Automatically uploaded to S3

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/cases/{id}/production/files \
  -H "Authorization: Bearer {token}" \
  -F "files=@solution_model.stl" \
  -F "files=@final_design.pdf"
```

### 4. Add Production URLs
**Endpoint:** `POST /api/cases/{id}/production/urls`
- **Access:** Designer (or BOTH) only
- Add external URLs (e.g., Google Drive, Dropbox links)
- Optional description field

**Example Request:**
```json
{
  "url": "https://drive.google.com/file/d/abc123/view",
  "description": "Final 3D model files"
}
```

### 5. View Production URLs
**Endpoint:** `GET /api/cases/{id}/production/urls`
- All production URLs for a case
- Visible to Designer, QC, Client, and Admin

### 6. Delete Production URL
**Endpoint:** `DELETE /api/cases/{id}/production/urls/{urlId}`
- Designer can delete their own URLs

### 7. Submit Case to QC Review ⭐ NEW
**Endpoint:** `POST /api/designer/cases/{id}/submit-to-qc`
- **Access:** Designer (or BOTH) only
- **Requirement:** Case must be in `IN_DESIGN` status
- **Result:** Case moves to `PENDING_QC` status
- Optional notes field for submission message

**Example Request:**
```json
{
  "notes": "Completed all alignments as requested. Ready for QC review."
}
```

**Example Response:**
```json
{
  "message": "Case submitted to QC for review",
  "case": {
    "id": "clx789ghi",
    "status": "PENDING_QC",
    ...
  }
}
```

---

## QC Capabilities

### 1. View Assigned Cases
**Endpoint:** `GET /api/employee/cases`
- Same as Designer, but filtered to cases where user is assigned as QC
- Can see production files and URLs added by designer

### 2. View Case Details
**Endpoint:** `GET /api/employee/cases/{id}`
- Full read-only access
- Can view all production files/URLs from designer

### 3. Add Internal Comments
**Endpoint:** `POST /api/cases/{id}/comments`
- QC can add comments with `isInternal: true`
- Internal comments are NOT visible to clients
- Useful for feedback to designers

**Example Request:**
```json
{
  "comment": "Please adjust alignment on tooth #12",
  "isInternal": true,
  "files": [...]
}
```

### 4. Approve Case for Client Review
**Endpoint:** `POST /api/qc/cases/{id}/approve`
- **Requirement:** Case must be in `PENDING_QC` status
- **Result:** Case moves to `PENDING_CLIENT_REVIEW`
- Client can now review and approve/reject

### 5. Reject Case Back to Designer
**Endpoint:** `POST /api/qc/cases/{id}/reject`
- **Requirement:** Case must be in `PENDING_QC` status
- **Optional:** Add rejection notes
- **Result:** 
  1. Case status → `QC_REJECTED` (refinement count incremented)
  2. Case status → `IN_DESIGN` (back to designer)

**Example Request:**
```json
{
  "notes": "Please adjust tooth #12 alignment and resubmit"
}
```

---

## Comment Visibility Rules

### External Comments (isInternal: false)
- Visible to: Client, Designer, QC, Admin
- Use for: Client-facing communication

### Internal Comments (isInternal: true)
- Visible to: Designer, QC, Admin ONLY
- Hidden from: Clients
- Use for: Internal feedback between QC and Designer

**Implementation:**
```typescript
// When fetching comments, filter based on role
if (userRole === UserRole.CLIENT) {
  whereClause.isInternal = false;  // Clients only see external
}
// Employees and Admins see all comments
```

---

## Case Status Flow

```
PENDING_APPROVAL (Admin assigns Designer & QC)
    ↓
IN_DESIGN (Designer works, uploads production files/URLs)
    ↓
    [Designer submits to QC] ⭐ POST /api/designer/cases/{id}/submit-to-qc
    ↓
PENDING_QC (QC reviews)
    ↓
    [QC Reviews]
    ↓
    ├─ QC Approves ⭐ POST /api/qc/cases/{id}/approve → PENDING_CLIENT_REVIEW
    │                     ↓
    │                [Client reviews]
    │                     ↓
    │                     ├─ Client Approves → APPROVED ✓
    │                     └─ Client Rejects → CLIENT_REJECTED → IN_DESIGN
    │
    └─ QC Rejects ⭐ POST /api/qc/cases/{id}/reject → QC_REJECTED → IN_DESIGN (refinement++)
```

### Key Status Transitions

1. **IN_DESIGN → PENDING_QC**
   - **Who:** Designer only
   - **Endpoint:** `POST /api/designer/cases/{id}/submit-to-qc`
   - **When:** Designer completes work and is ready for QC review

2. **PENDING_QC → PENDING_CLIENT_REVIEW**
   - **Who:** QC only
   - **Endpoint:** `POST /api/qc/cases/{id}/approve`
   - **When:** QC approves the design work

3. **PENDING_QC → QC_REJECTED → IN_DESIGN**
   - **Who:** QC only
   - **Endpoint:** `POST /api/qc/cases/{id}/reject`
   - **When:** QC finds issues and sends back to designer
   - **Note:** Refinement count is incremented

4. **CLIENT_REJECTED → IN_DESIGN**
   - **Who:** System (after client rejects)
   - **When:** Client is not satisfied with the design
   - **Note:** Refinement count is incremented

---

## API Endpoints Summary

### Employee (Designer & QC)
- `GET /api/employee/cases` - List assigned cases
- `GET /api/employee/cases/{id}` - View case details

### Designer Actions
- `POST /api/designer/cases/{id}/submit-to-qc` - Submit case for QC review ⭐ NEW

### Production (Designer Only)
- `POST /api/cases/{id}/production/files` - Upload production files
- `POST /api/cases/{id}/production/urls` - Add production URL
- `GET /api/cases/{id}/production/urls` - List production URLs
- `DELETE /api/cases/{id}/production/urls/{urlId}` - Delete URL

### QC Review (QC Only)
- `POST /api/qc/cases/{id}/approve` - Approve for client review
- `POST /api/qc/cases/{id}/reject` - Reject back to designer

### Comments (All)
- `POST /api/cases/{id}/comments` - Add comment (with isInternal flag)
- `GET /api/cases/{id}/comments` - Get comments (filtered by role)
- `DELETE /api/cases/{id}/comments/{commentId}` - Delete comment

---

## Security & Access Control

### Designer Access Rules
- Can only upload production files/URLs to cases where they are assigned as designer
- Can view all files (diagnostic + production) for assigned cases
- Can add both internal and external comments
- Read-only access to case data

### QC Access Rules
- Can view all files (diagnostic + production) for assigned cases
- Can add internal comments (for designer feedback)
- Can approve or reject cases in PENDING_QC status
- Cannot upload production files
- Read-only access to case data

### Permission Checks
All endpoints verify:
1. User is authenticated
2. User has correct role (EMPLOYEE)
3. User has correct employee type (DESIGNER, QC, or BOTH)
4. User is assigned to the specific case
5. Case is in valid status for the operation

---

## Testing the Workflow

### 1. Admin Creates Employee Accounts
```bash
# Create Designer
POST /api/users/employees
{
  "email": "designer@example.com",
  "password": "Designer123!",
  "name": "John Designer",
  "employeeType": "DESIGNER"
}

# Create QC
POST /api/users/employees
{
  "email": "qc@example.com",
  "password": "Qc123!@#",
  "name": "Jane QC",
  "employeeType": "QC"
}
```

### 2. Designer Login
```bash
POST /api/auth/login
{
  "email": "designer@example.com",
  "password": "Designer123!"
}
```

### 3. Designer Views Assigned Cases
```bash
GET /api/employee/cases
Authorization: Bearer {designer_token}
```

### 4. Designer Uploads Production Files
```bash
POST /api/cases/{caseId}/production/files
Authorization: Bearer {designer_token}
Content-Type: multipart/form-data

files: [file1.stl, file2.pdf]
```

### 5. Designer Adds Production URL
```bash
POST /api/cases/{caseId}/production/urls
Authorization: Bearer {designer_token}

{
  "url": "https://drive.google.com/file/d/abc/view",
  "description": "Final designs"
}
```

### 6. Designer Submits to QC ⭐ NEW
```bash
POST /api/designer/cases/{caseId}/submit-to-qc
Authorization: Bearer {designer_token}

{
  "notes": "Completed all alignments. Ready for review."
}
```

### 7. QC Reviews Case
```bash
# QC views case
GET /api/employee/cases/{caseId}
Authorization: Bearer {qc_token}

# QC adds internal comment
POST /api/cases/{caseId}/comments
Authorization: Bearer {qc_token}

{
  "comment": "Great work! Ready for client.",
  "isInternal": true
}

# QC approves ⭐
POST /api/qc/cases/{caseId}/approve
Authorization: Bearer {qc_token}
```

### 8. QC Rejects Case ⭐
```bash
POST /api/qc/cases/{caseId}/reject
Authorization: Bearer {qc_token}

{
  "notes": "Please adjust tooth #8 alignment"
}
```

---

## Complete Workflow Example

### Step-by-Step: Designer → QC → Client Flow

1. **Admin assigns case** to Designer (John) and QC (Jane)
2. **Designer (John) works on case:**
   - Views case: `GET /api/employee/cases/{caseId}`
   - Uploads production files: `POST /api/cases/{caseId}/production/files`
   - Adds drive link: `POST /api/cases/{caseId}/production/urls`
   - **Submits to QC:** `POST /api/designer/cases/{caseId}/submit-to-qc` ⭐
   - Case status: `IN_DESIGN` → `PENDING_QC`

3. **QC (Jane) reviews:**
   - Views case: `GET /api/employee/cases/{caseId}`
   - Reviews production files/URLs
   - Option A: **Approves:** `POST /api/qc/cases/{id}/approve` → `PENDING_CLIENT_REVIEW`
   - Option B: **Rejects:** `POST /api/qc/cases/{id}/reject` → `IN_DESIGN` (back to John)

4. **If approved, Client reviews:**
   - Views case with production files
   - Option A: Approves → `APPROVED` ✓
   - Option B: Rejects → `IN_DESIGN` (back to John)

5. **If rejected by QC or Client:**
   - Designer sees case back in `IN_DESIGN` status
   - Refinement count incremented
   - Designer makes changes and resubmits to QC

---

## Files Created/Modified

### New Files
- `src/services/production.service.ts` - Production URL management
- `src/routes/production.routes.ts` - Production file/URL endpoints
- `src/routes/employee.routes.ts` - Employee case viewing
- `src/routes/designer.routes.ts` - Designer workflow actions (submit to QC) ⭐ NEW
- `src/routes/qc.routes.ts` - QC approval/rejection
- `DESIGNER_QC_IMPLEMENTATION.md` - This document

### Modified Files
- `prisma/schema.prisma` - Added PRODUCTION category, isInternal field, CaseProductionUrl model
- `src/services/comment.service.ts` - Added isInternal parameter and filtering
- `src/routes/comments.routes.ts` - Support for internal comments
- `src/app.ts` - Registered new routes
- `src/config/swagger.ts` - Updated schemas and tags

---

## Next Steps

1. **Frontend Integration:** Build UI for designers to upload files/URLs and for QC to review
2. **Notifications:** Add email/push notifications when cases move between statuses
3. **File Preview:** Implement file preview/viewer for 3D models
4. **Activity Log:** Enhanced case activity log showing all actions by all parties
5. **Bulk Operations:** Allow QC to approve/reject multiple cases at once

---

## Support

For questions or issues, refer to:
- API Documentation: http://localhost:3000/api-docs
- System Documentation: SYSTEM_DOCUMENTATION.md
- Case Workflow: See "Case Status Flow" section above
