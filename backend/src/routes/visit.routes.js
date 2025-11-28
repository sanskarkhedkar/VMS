const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const visitController = require('../controllers/visit.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../config/roles.config');

// All routes require authentication
router.use(authenticate);

// Get all visits
router.get('/',
  visitController.getAllVisits
);

// Get today's visits (for Security Guard dashboard)
router.get('/today',
  visitController.getTodaysVisits
);

// Get upcoming visits
router.get('/upcoming',
  visitController.getUpcomingVisits
);

// Get my visits (Host Employee)
router.get('/my-visits',
  visitController.getMyVisits
);

// Create new visit invitation
router.post('/invite',
  [
    body('visitorEmail').isEmail().withMessage('Valid email required'),
    body('visitorFirstName').notEmpty().withMessage('First name required'),
    body('visitorLastName').notEmpty().withMessage('Last name required'),
    body('purpose').isIn(['MEETING', 'INTERVIEW', 'DELIVERY', 'MAINTENANCE', 'PERSONAL', 'OFFICIAL', 'OTHER'])
      .withMessage('Invalid purpose'),
    body('scheduledDate').isISO8601().withMessage('Valid date required'),
    body('scheduledTimeIn').isISO8601().withMessage('Valid time required'),
    body('scheduledTimeOut').isISO8601().withMessage('Valid time required')
  ],
  validate,
  visitController.createInvitation
);

// Re-invite existing visitor
router.post('/reinvite',
  [
    body('visitorId').notEmpty().withMessage('Visitor ID required'),
    body('purpose').isIn(['MEETING', 'INTERVIEW', 'DELIVERY', 'MAINTENANCE', 'PERSONAL', 'OFFICIAL', 'OTHER'])
      .withMessage('Invalid purpose'),
    body('scheduledDate').isISO8601().withMessage('Valid date required'),
    body('scheduledTimeIn').isISO8601().withMessage('Valid time required'),
    body('scheduledTimeOut').isISO8601().withMessage('Valid time required')
  ],
  validate,
  visitController.reinviteVisitor
);

// Create walk-in visitor (Security Guard)
router.post('/walkin',
  requireRole(ROLES.SECURITY_GUARD, ROLES.SECURITY_MANAGER),
  [
    body('visitorEmail').isEmail().withMessage('Valid email required'),
    body('visitorFirstName').notEmpty().withMessage('First name required'),
    body('visitorLastName').notEmpty().withMessage('Last name required'),
    body('hostEmployeeId').notEmpty().withMessage('Host employee required'),
    body('purpose').optional().isIn(['MEETING', 'INTERVIEW', 'DELIVERY', 'MAINTENANCE', 'PERSONAL', 'OFFICIAL', 'OTHER'])
  ],
  validate,
  visitController.createWalkIn
);

// Approve visit (Process Admin / Security Manager)
router.post('/:id/approve',
  requireRole(ROLES.PROCESS_ADMIN, ROLES.SECURITY_MANAGER, ROLES.ADMIN),
  visitController.approveVisit
);

// Reject visit
router.post('/:id/reject',
  requireRole(ROLES.PROCESS_ADMIN, ROLES.SECURITY_MANAGER, ROLES.ADMIN),
  [body('reason').optional().trim()],
  validate,
  visitController.rejectVisit
);

// Check-in visitor (Security Guard)
router.post('/:id/checkin',
  requireRole(ROLES.SECURITY_GUARD, ROLES.SECURITY_MANAGER),
  visitController.checkInVisitor
);

// Check-in by QR scan
router.post('/checkin-qr',
  requireRole(ROLES.SECURITY_GUARD, ROLES.SECURITY_MANAGER),
  [body('qrData').notEmpty().withMessage('QR data required')],
  validate,
  visitController.checkInByQR
);

// Check-out visitor
router.post('/:id/checkout',
  visitController.checkOutVisitor
);

// Extend visit
router.post('/:id/extend',
  [body('minutes').optional().isInt({ min: 15, max: 120 }).withMessage('Extension must be 15-120 minutes')],
  validate,
  visitController.extendVisit
);

// Cancel visit
router.post('/:id/cancel',
  visitController.cancelVisit
);

// Get pending approval visits
router.get('/pending-approval',
  requireRole(ROLES.PROCESS_ADMIN, ROLES.SECURITY_MANAGER, ROLES.ADMIN),
  visitController.getPendingApprovalVisits
);

// Get single visit
router.get('/:id',
  visitController.getVisit
);

// Respond to meeting end prompt
router.post('/:id/meeting-status',
  [body('isOver').isBoolean().withMessage('Meeting status required')],
  validate,
  visitController.updateMeetingStatus
);

module.exports = router;
