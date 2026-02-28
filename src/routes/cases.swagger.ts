/**
 * @swagger
 * /api/cases:
 *   post:
 *     tags: [Cases]
 *     summary: Create a new case
 *     description: Create a new case for a patient (CLIENT and ADMIN only). Case starts in PENDING_PAYMENT status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *             properties:
 *               patientId:
 *                 type: string
 *                 example: clx456def
 *               notes:
 *                 type: string
 *                 example: Upper arch alignment needed
 *           examples:
 *             basic:
 *               value:
 *                 patientId: clx456def
 *                 notes: Upper arch alignment needed
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Missing patient ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Patient not found
 *   get:
 *     tags: [Cases]
 *     summary: List cases
 *     description: Get list of cases (role-based filtering applied automatically)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_PAYMENT, OPENED, ASSIGNED, IN_DESIGN, PENDING_QC, QC_REJECTED, PENDING_CLIENT_REVIEW, CLIENT_REJECTED, APPROVED]
 *         description: Filter by case status
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: viewAs
 *         schema:
 *           type: string
 *           enum: [designer, qc]
 *         description: For employees - view as designer or QC (default designer)
 *     responses:
 *       200:
 *         description: List of cases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Case'
 *       401:
 *         description: Unauthorized
 * 
 * /api/cases/{id}:
 *   get:
 *     tags: [Cases]
 *     summary: Get case by ID
 *     description: Get detailed case information including workflow logs, payments, and assigned users
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
 *         description: Case details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Case'
 *                     - type: object
 *                       properties:
 *                         workflowLogs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CaseWorkflowLog'
 *                         payments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot view this case
 *       404:
 *         description: Case not found
 * 
 * /api/cases/{id}/notes:
 *   patch:
 *     tags: [Cases]
 *     summary: Update case notes
 *     description: Update notes for a case (Owner, assigned employees, or admin)
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *                 example: Updated case notes with new requirements
 *     responses:
 *       200:
 *         description: Case notes updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 * 
 * /api/cases/{id}/assign:
 *   post:
 *     tags: [Cases]
 *     summary: Assign case to designer and QC
 *     description: Assign a case to a designer and QC employee (ADMIN only). Case must be in OPENED status. Changes status to ASSIGNED.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - designerId
 *               - qcId
 *             properties:
 *               designerId:
 *                 type: string
 *                 example: clx111jkl
 *                 description: User ID of designer
 *               qcId:
 *                 type: string
 *                 example: clx222mno
 *                 description: User ID of QC (can be same as designer if employee type is BOTH)
 *           examples:
 *             differentUsers:
 *               value:
 *                 designerId: clx111jkl
 *                 qcId: clx222mno
 *             sameUser:
 *               value:
 *                 designerId: clx333pqr
 *                 qcId: clx333pqr
 *     responses:
 *       200:
 *         description: Case assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Missing required fields or case not in correct status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Case, designer, or QC not found
 * 
 * /api/cases/{id}/transition:
 *   post:
 *     tags: [Cases]
 *     summary: Transition case status
 *     description: Change case status according to workflow rules. Transitions are validated based on user role and current status.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING_PAYMENT, OPENED, ASSIGNED, IN_DESIGN, PENDING_QC, QC_REJECTED, PENDING_CLIENT_REVIEW, CLIENT_REJECTED, APPROVED]
 *                 example: IN_DESIGN
 *               note:
 *                 type: string
 *                 example: Started working on upper arch design
 *           examples:
 *             designerStart:
 *               summary: Designer starts work
 *               value:
 *                 status: IN_DESIGN
 *                 note: Started working on case
 *             designerSubmit:
 *               summary: Designer submits for QC
 *               value:
 *                 status: PENDING_QC
 *                 note: Design completed, ready for QC review
 *             qcApprove:
 *               summary: QC approves
 *               value:
 *                 status: PENDING_CLIENT_REVIEW
 *                 note: QC passed, looks excellent
 *             qcReject:
 *               summary: QC rejects
 *               value:
 *                 status: QC_REJECTED
 *                 note: Please fix alignment on tooth #5
 *             clientApprove:
 *               summary: Client approves final work
 *               value:
 *                 status: APPROVED
 *                 note: Approved, excellent work!
 *             clientReject:
 *               summary: Client requests changes
 *               value:
 *                 status: CLIENT_REJECTED
 *                 note: Need adjustment on posterior teeth
 *     responses:
 *       200:
 *         description: Status transitioned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 case:
 *                   $ref: '#/components/schemas/Case'
 *       400:
 *         description: Invalid status transition for current role/status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 * 
 * /api/cases/{id}/available-transitions:
 *   get:
 *     tags: [Cases]
 *     summary: Get available status transitions
 *     description: Get list of status transitions available for current user based on case status and user role
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
 *         description: Available transitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availableTransitions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [IN_DESIGN, PENDING_QC]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 */

// This file contains Swagger documentation for cases routes
// Documentation is referenced in cases.routes.ts
