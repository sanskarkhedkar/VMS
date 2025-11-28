const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../config/roles.config');

router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

// System settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Email templates
router.get('/email-templates', adminController.getEmailTemplates);
router.put('/email-templates/:id', adminController.updateEmailTemplate);

// Bulk user operations
router.post('/users/bulk-approve', adminController.bulkApproveUsers);

// System statistics
router.get('/system-stats', adminController.getSystemStats);

// Create admin user (first-time setup)
router.post('/create-admin',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required')
  ],
  validate,
  adminController.createAdminUser
);

module.exports = router;
