const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const userController = require('../controllers/user.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireRole, requirePermission } = require('../middleware/auth.middleware');
const { ROLES, PERMISSIONS } = require('../config/roles.config');

// All routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get('/', 
  requireRole(ROLES.ADMIN, ROLES.SECURITY_MANAGER),
  userController.getAllUsers
);

// Get pending approval users (Admin only)
router.get('/pending',
  requireRole(ROLES.ADMIN),
  userController.getPendingUsers
);

// Get host employees (for visitor invitation)
router.get('/hosts',
  userController.getHostEmployees
);

// Approve user (Admin only)
router.post('/:id/approve',
  requireRole(ROLES.ADMIN),
  userController.approveUser
);

// Reject user (Admin only)
router.post('/:id/reject',
  requireRole(ROLES.ADMIN),
  [body('reason').optional().trim()],
  validate,
  userController.rejectUser
);

// Suspend user (Admin only)
router.post('/:id/suspend',
  requireRole(ROLES.ADMIN),
  userController.suspendUser
);

// Update user
router.put('/:id',
  requireRole(ROLES.ADMIN),
  userController.updateUser
);

// Delete user (Admin only)
router.delete('/:id',
  requireRole(ROLES.ADMIN),
  userController.deleteUser
);

// Get single user
router.get('/:id',
  userController.getUser
);

module.exports = router;
