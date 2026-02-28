/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users
 *     description: Get list of all users (ADMIN only)
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CLIENT, ADMIN, EMPLOYEE]
 *         description: Filter by user role
 *       - in: query
 *         name: employeeType
 *         schema:
 *           type: string
 *           enum: [DESIGNER, QC, BOTH]
 *         description: Filter by employee type
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 * 
 * /api/users/employees:
 *   get:
 *     tags: [Users]
 *     summary: List all employees
 *     description: Get list of all employee users (ADMIN only)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DESIGNER, QC, BOTH]
 *         description: Filter by employee type
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: clx111jkl
 *                       email:
 *                         type: string
 *                         example: designer@orthoalign.com
 *                       name:
 *                         type: string
 *                         example: Alex Designer
 *                       employeeType:
 *                         type: string
 *                         example: DESIGNER
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 * 
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user
 *     description: Get authenticated user's information
 *     responses:
 *       200:
 *         description: Current user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 * 
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Get user information by ID (ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: clx123abc
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 * 
 *   patch:
 *     tags: [Users]
 *     summary: Update user
 *     description: Update user information (ADMIN only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: clx123abc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Name
 *               role:
 *                 type: string
 *                 enum: [CLIENT, ADMIN, EMPLOYEE]
 *                 example: ADMIN
 *               employeeType:
 *                 type: string
 *                 enum: [DESIGNER, QC, BOTH]
 *                 nullable: true
 *                 example: BOTH
 *           examples:
 *             changeName:
 *               value:
 *                 name: Dr. John Smith
 *             promoteToAdmin:
 *               value:
 *                 role: ADMIN
 *             changeEmployeeType:
 *               value:
 *                 employeeType: BOTH
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role or employee type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 * 
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
 *     description: Delete a user account (ADMIN only). Cannot delete own account.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: clx123abc
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: User deleted successfully
 *       400:
 *         description: Cannot delete own account
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: User not found
 */

// This file contains Swagger documentation for users routes
