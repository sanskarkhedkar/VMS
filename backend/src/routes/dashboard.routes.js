const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../config/roles.config');

router.use(authenticate);

// Main dashboard stats
router.get('/stats', dashboardController.getStats);

// Admin dashboard
router.get('/admin', 
  requireRole(ROLES.ADMIN),
  dashboardController.getAdminDashboard
);

// Host Employee dashboard
router.get('/host',
  dashboardController.getHostDashboard
);

// Security Guard dashboard
router.get('/security',
  requireRole(ROLES.SECURITY_GUARD, ROLES.SECURITY_MANAGER),
  dashboardController.getSecurityDashboard
);

// Security Manager dashboard
router.get('/security-manager',
  requireRole(ROLES.SECURITY_MANAGER),
  dashboardController.getSecurityManagerDashboard
);

// Process Admin dashboard
router.get('/process-admin',
  requireRole(ROLES.PROCESS_ADMIN),
  dashboardController.getProcessAdminDashboard
);

// Get recent activity
router.get('/activity',
  dashboardController.getRecentActivity
);

// Get visit trends (for charts)
router.get('/trends',
  dashboardController.getVisitTrends
);

module.exports = router;
