const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { PERMISSIONS } = require('../config/roles.config');

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.VIEW_REPORTS));

// Get visitor report
router.get('/visitors', reportController.getVisitorReport);

// Export visitor report as CSV
router.get('/visitors/export/csv', reportController.exportVisitorCSV);

// Export visitor report as PDF
router.get('/visitors/export/pdf', reportController.exportVisitorPDF);

// Get activity logs
router.get('/activity-logs', reportController.getActivityLogs);

// Get summary report
router.get('/summary', reportController.getSummaryReport);

module.exports = router;
