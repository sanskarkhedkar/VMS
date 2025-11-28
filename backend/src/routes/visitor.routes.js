const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const visitorController = require('../controllers/visitor.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth.middleware');
const { ROLES } = require('../config/roles.config');

// Public route - visitor completing their registration form
router.get('/invitation/:token', visitorController.getInvitationDetails);
router.post('/invitation/:token/complete', 
  [
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('designation').optional().trim(),
    body('idType').optional().trim(),
    body('idNumber').optional().trim()
  ],
  validate,
  visitorController.completeInvitation
);

// Protected routes
router.use(authenticate);

// Get all visitors
router.get('/',
  visitorController.getAllVisitors
);

// Search visitors (for re-invite)
router.get('/search',
  visitorController.searchVisitors
);

// Get blacklisted visitors
router.get('/blacklisted',
  requireRole(ROLES.ADMIN, ROLES.SECURITY_MANAGER),
  visitorController.getBlacklistedVisitors
);

// Get single visitor
router.get('/:id',
  visitorController.getVisitor
);

// Update visitor
router.put('/:id',
  visitorController.updateVisitor
);

// Request visitor action (block/delete/blacklist)
router.post('/:id/request-action',
  [
    body('action').isIn(['BLOCK', 'DELETE', 'BLACKLIST']).withMessage('Invalid action'),
    body('reason').notEmpty().withMessage('Reason is required')
  ],
  validate,
  visitorController.requestVisitorAction
);

// Process visitor action request (Admin only)
router.post('/requests/:requestId/process',
  requireRole(ROLES.ADMIN),
  [
    body('approved').isBoolean().withMessage('Approved status required')
  ],
  validate,
  visitorController.processVisitorRequest
);

// Get pending visitor requests (Admin)
router.get('/requests/pending',
  requireRole(ROLES.ADMIN),
  visitorController.getPendingRequests
);

// Blacklist visitor (Admin/Security Manager)
router.post('/:id/blacklist',
  requireRole(ROLES.ADMIN, ROLES.SECURITY_MANAGER),
  [body('reason').notEmpty().withMessage('Reason is required')],
  validate,
  visitorController.blacklistVisitor
);

// Remove from blacklist (Admin only)
router.post('/:id/unblacklist',
  requireRole(ROLES.ADMIN),
  visitorController.unblacklistVisitor
);

module.exports = router;
