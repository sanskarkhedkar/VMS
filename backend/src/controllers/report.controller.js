const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { 
  generateCSV, 
  generatePDFReport, 
  formatVisitForExport,
  visitReportColumns,
  visitCSVFields 
} = require('../utils/report.util');

// Get visitor report with filters
exports.getVisitorReport = asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    hostId, 
    status, 
    purpose,
    visitorName,
    page = 1, 
    limit = 50 
  } = req.query;
  
  const where = {};
  
  // Date filter
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.scheduledDate.lte = end;
    }
  }
  
  // Host filter
  if (hostId) where.hostEmployeeId = hostId;
  
  // Status filter
  if (status) where.status = status;
  
  // Purpose filter
  if (purpose) where.purpose = purpose;
  
  // Visitor name search
  if (visitorName) {
    where.visitor = {
      OR: [
        { firstName: { contains: visitorName, mode: 'insensitive' } },
        { lastName: { contains: visitorName, mode: 'insensitive' } }
      ]
    };
  }

  // If not admin/security manager, only show their own visits
  if (!['ADMIN', 'SECURITY_MANAGER', 'PROCESS_ADMIN'].includes(req.user.role)) {
    where.hostEmployeeId = req.user.id;
  }

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      include: {
        visitor: true,
        hostEmployee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.visit.count({ where })
  ]);

  // Calculate summary stats
  const summary = {
    total,
    byStatus: {},
    byPurpose: {}
  };

  visits.forEach(visit => {
    summary.byStatus[visit.status] = (summary.byStatus[visit.status] || 0) + 1;
    summary.byPurpose[visit.purpose] = (summary.byPurpose[visit.purpose] || 0) + 1;
  });

  res.json({
    success: true,
    data: visits,
    summary,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Export visitor report as CSV
exports.exportVisitorCSV = asyncHandler(async (req, res) => {
  const { startDate, endDate, hostId, status, purpose } = req.query;
  
  const where = {};
  
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.scheduledDate.lte = end;
    }
  }
  
  if (hostId) where.hostEmployeeId = hostId;
  if (status) where.status = status;
  if (purpose) where.purpose = purpose;

  if (!['ADMIN', 'SECURITY_MANAGER', 'PROCESS_ADMIN'].includes(req.user.role)) {
    where.hostEmployeeId = req.user.id;
  }

  const visits = await prisma.visit.findMany({
    where,
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true
        }
      }
    },
    orderBy: { scheduledDate: 'desc' }
  });

  const formattedData = visits.map(formatVisitForExport);
  const { success, csv, error } = generateCSV(formattedData, visitCSVFields);

  if (!success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CSV',
      error
    });
  }

  const filename = `visitor-report-${new Date().toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// Export visitor report as PDF
exports.exportVisitorPDF = asyncHandler(async (req, res) => {
  const { startDate, endDate, hostId, status, purpose } = req.query;
  
  const where = {};
  
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.scheduledDate.lte = end;
    }
  }
  
  if (hostId) where.hostEmployeeId = hostId;
  if (status) where.status = status;
  if (purpose) where.purpose = purpose;

  if (!['ADMIN', 'SECURITY_MANAGER', 'PROCESS_ADMIN'].includes(req.user.role)) {
    where.hostEmployeeId = req.user.id;
  }

  const visits = await prisma.visit.findMany({
    where,
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true
        }
      }
    },
    orderBy: { scheduledDate: 'desc' },
    take: 500 // Limit for PDF
  });

  const formattedData = visits.map(formatVisitForExport);
  
  let title = 'Visitor Report';
  if (startDate && endDate) {
    title += ` (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})`;
  }

  const result = await generatePDFReport(title, formattedData, visitReportColumns);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: result.error
    });
  }

  const filename = `visitor-report-${new Date().toISOString().split('T')[0]}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(result.buffer);
});

// Get activity logs
exports.getActivityLogs = asyncHandler(async (req, res) => {
  const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
  
  // Only admin can view all logs
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const where = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.activityLog.count({ where })
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get summary report
exports.getSummaryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const where = {};
  
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.scheduledDate.lte = end;
    }
  }

  const [
    totalVisits,
    statusBreakdown,
    purposeBreakdown,
    topHosts,
    topVisitors,
    walkInCount,
    avgDuration
  ] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    }),
    prisma.visit.groupBy({
      by: ['purpose'],
      where,
      _count: { purpose: true }
    }),
    prisma.visit.groupBy({
      by: ['hostEmployeeId'],
      where,
      _count: { hostEmployeeId: true },
      orderBy: { _count: { hostEmployeeId: 'desc' } },
      take: 5
    }),
    prisma.visit.groupBy({
      by: ['visitorId'],
      where,
      _count: { visitorId: true },
      orderBy: { _count: { visitorId: 'desc' } },
      take: 5
    }),
    prisma.visit.count({
      where: { ...where, isWalkIn: true }
    }),
    prisma.visit.findMany({
      where: {
        ...where,
        actualTimeIn: { not: null },
        actualTimeOut: { not: null }
      },
      select: {
        actualTimeIn: true,
        actualTimeOut: true
      }
    })
  ]);

  // Get host names
  const hostIds = topHosts.map(h => h.hostEmployeeId);
  const hosts = await prisma.user.findMany({
    where: { id: { in: hostIds } },
    select: { id: true, firstName: true, lastName: true, department: true }
  });
  const hostMap = hosts.reduce((acc, h) => ({ ...acc, [h.id]: h }), {});

  // Get visitor names
  const visitorIds = topVisitors.map(v => v.visitorId);
  const visitors = await prisma.visitor.findMany({
    where: { id: { in: visitorIds } },
    select: { id: true, firstName: true, lastName: true, company: true }
  });
  const visitorMap = visitors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {});

  // Calculate average duration
  let totalDuration = 0;
  avgDuration.forEach(v => {
    totalDuration += v.actualTimeOut.getTime() - v.actualTimeIn.getTime();
  });
  const averageDurationMinutes = avgDuration.length > 0 
    ? Math.round(totalDuration / avgDuration.length / 60000) 
    : 0;

  res.json({
    success: true,
    data: {
      totalVisits,
      walkInCount,
      averageDurationMinutes,
      statusBreakdown: statusBreakdown.map(s => ({
        status: s.status,
        count: s._count.status
      })),
      purposeBreakdown: purposeBreakdown.map(p => ({
        purpose: p.purpose,
        count: p._count.purpose
      })),
      topHosts: topHosts.map(h => ({
        ...hostMap[h.hostEmployeeId],
        visitCount: h._count.hostEmployeeId
      })),
      topVisitors: topVisitors.map(v => ({
        ...visitorMap[v.visitorId],
        visitCount: v._count.visitorId
      }))
    }
  });
});
