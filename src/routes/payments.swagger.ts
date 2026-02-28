/**
 * @swagger
 * /api/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment
 *     description: Create a payment for a case (CLIENT and ADMIN only). Case must be in PENDING_PAYMENT status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - amount
 *             properties:
 *               caseId:
 *                 type: string
 *                 example: clx789ghi
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 example: 1500.00
 *               externalId:
 *                 type: string
 *                 example: stripe_pi_1234567890
 *                 description: Payment gateway transaction ID
 *           examples:
 *             withGateway:
 *               value:
 *                 caseId: clx789ghi
 *                 amount: 1500.00
 *                 externalId: stripe_pi_1234567890
 *             withoutGateway:
 *               value:
 *                 caseId: clx789ghi
 *                 amount: 1500.00
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Missing required fields or invalid amount
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 * 
 * /api/payments/case/{caseId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payments for a case
 *     description: Get all payments associated with a specific case
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *         example: clx789ghi
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 * 
 * /api/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by ID
 *     description: Get detailed payment information including related case
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: clx111jkl
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 * 
 * /api/payments/{id}/complete:
 *   post:
 *     tags: [Payments]
 *     summary: Mark payment as completed
 *     description: Mark a payment as completed (ADMIN only). Automatically transitions case from PENDING_PAYMENT to OPENED.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: clx111jkl
 *     responses:
 *       200:
 *         description: Payment marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Payment not found
 * 
 * /api/payments/{id}/fail:
 *   post:
 *     tags: [Payments]
 *     summary: Mark payment as failed
 *     description: Mark a payment as failed (ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: clx111jkl
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Card declined
 *     responses:
 *       200:
 *         description: Payment marked as failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Payment not found
 * 
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Payment gateway webhook
 *     description: Webhook endpoint for payment gateway callbacks (No authentication required)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               paymentId:
 *                 type: string
 *                 example: clx111jkl
 *                 description: Internal payment ID
 *               externalId:
 *                 type: string
 *                 example: stripe_pi_1234567890
 *                 description: Payment gateway transaction ID
 *               status:
 *                 type: string
 *                 enum: [completed, success, failed]
 *                 example: completed
 *               signature:
 *                 type: string
 *                 example: webhook_signature_hash
 *                 description: Webhook signature for verification
 *           examples:
 *             success:
 *               value:
 *                 paymentId: clx111jkl
 *                 externalId: stripe_pi_1234567890
 *                 status: completed
 *                 signature: abc123def456
 *             failed:
 *               value:
 *                 paymentId: clx111jkl
 *                 status: failed
 *                 signature: abc123def456
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment marked as completed
 *       400:
 *         description: Invalid request or status
 *       404:
 *         description: Payment not found
 */

// This file contains Swagger documentation for payments routes
