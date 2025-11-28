const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

// Get general stats
exports.getStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalVisitors,
    todayVisits,
    pendingApprovals,
    checkedInNow
  ] = await Promise.all([
    prisma.visitor.count(),
    prisma.visit.count({
      where: {
        scheduledDate: { gte: today, lt: tomorrow }
      }
    }),
    prisma.visit.count({
      where: { status: 'PENDING_APPROVAL' }
    }),
    prisma.visit.count({
      where: { status: 'CHECKED_IN' }
    })
  ]);

  res.json({
    success: true,
    data: {
      totalVisitors,
      todayVisits,
      pendingApprovals,
      checkedInNow
    }
  });
});

// Admin Dashboard
exports.getAdminDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalUsers,
    pendingUserApprovals,
    totalVisitors,
    blacklistedVisitors,
    todayVisits,
    weeklyVisits,
    monthlyVisits,
    pendingVisitApprovals,
    checkedInNow,
    recentUsers,
    recentVisits,
    visitorRequests
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    prisma.user.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.visitor.count(),
    prisma.visitor.count({ where: { isBlacklisted: true } }),
    prisma.visit.count({
      where: {
        scheduledDate: { gte: today }
      }
    }),
    prisma.visit.count({
      where: {
        scheduledDate: { gte: thisWeekStart }
      }
    }),
    prisma.visit.count({
      where: {
        scheduledDate: { gte: thisMonthStart }
      }
    }),
    prisma.visit.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN' } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.visit.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        visitor: { select: { firstName: true, lastName: true } },
        hostEmployee: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.visitorRequest.count({ where: { status: 'PENDING' } })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        pendingUserApprovals,
        totalVisitors,
        blacklistedVisitors,
        todayVisits,
        weeklyVisits,
        monthlyVisits,
        pendingVisitApprovals,
        checkedInNow,
        visitorRequests
      },
      recentUsers,
      recentVisits
    }
  });
});

// Host Employee Dashboard
exports.getHostDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalMyVisitors,
    todayScheduled,
    pendingApproval,
    checkedInNow,
    upcomingVisits,
    recentVisits,
    visitsByStatus
  ] = await Promise.all([
    prisma.visit.count({
      where: { hostEmployeeId: userId }
    }),
    prisma.visit.count({
      where: {
        hostEmployeeId: userId,
        scheduledDate: { gte: today, lt: tomorrow }
      }
    }),
    prisma.visit.count({
      where: {
        hostEmployeeId: userId,
        status: 'PENDING_APPROVAL'
      }
    }),
    prisma.visit.count({
      where: {
        hostEmployeeId: userId,
        status: 'CHECKED_IN'
      }
    }),
    prisma.visit.findMany({
      where: {
        hostEmployeeId: userId,
        scheduledDate: { gte: today },
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] }
      },
      include: {
        visitor: { select: { firstName: true, lastName: true, company: true } }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    }),
    prisma.visit.findMany({
      where: { hostEmployeeId: userId },
      include: {
        visitor: { select: { firstName: true, lastName: true, company: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.visit.groupBy({
      by: ['status'],
      where: { hostEmployeeId: userId },
      _count: { status: true }
    })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalMyVisitors,
        todayScheduled,
        pendingApproval,
        checkedInNow
      },
      upcomingVisits,
      recentVisits,
      visitsByStatus
    }
  });
});

// Security Guard Dashboard
exports.getSecurityDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const now = new Date();

  const [
    expectedToday,
    checkedInNow,
    checkedOutToday,
    walkInsToday,
    upcomingSlots,
    currentCheckedIn
  ] = await Promise.all([
    prisma.visit.count({
      where: {
        scheduledDate: { gte: today, lt: tomorrow },
        status: { in: ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'] }
      }
    }),
    prisma.visit.count({
      where: { status: 'CHECKED_IN' }
    }),
    prisma.visit.count({
      where: {
        status: 'CHECKED_OUT',
        actualTimeOut: { gte: today, lt: tomorrow }
      }
    }),
    prisma.visit.count({
      where: {
        isWalkIn: true,
        createdAt: { gte: today, lt: tomorrow }
      }
    }),
    prisma.visit.findMany({
      where: {
        scheduledDate: { gte: today, lt: tomorrow },
        status: 'APPROVED',
        scheduledTimeIn: { gte: now }
      },
      include: {
        visitor: { select: { firstName: true, lastName: true, company: true, profileImage: true } },
        hostEmployee: { select: { firstName: true, lastName: true, department: true } }
      },
      orderBy: { scheduledTimeIn: 'asc' },
      take: 10
    }),
    prisma.visit.findMany({
      where: { status: 'CHECKED_IN' },
      include: {
        visitor: { select: { firstName: true, lastName: true, company: true, profileImage: true } },
        hostEmployee: { select: { firstName: true, lastName: true, department: true } }
      },
      orderBy: { actualTimeIn: 'desc' }
    })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        expectedToday,
        checkedInNow,
        checkedOutToday,
        walkInsToday
      },
      upcomingSlots,
      currentCheckedIn
    }
  });
});

// Security Manager Dashboard
exports.getSecurityManagerDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const [
    pendingApprovals,
    todayVisits,
    weeklyVisits,
    blacklistedCount,
    checkedInNow,
    recentApprovals,
    pendingVisits
  ] = await Promise.all([
    prisma.visit.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.visit.count({
      where: { scheduledDate: { gte: today } }
    }),
    prisma.visit.count({
      where: { scheduledDate: { gte: thisWeekStart } }
    }),
    prisma.visitor.count({ where: { isBlacklisted: true } }),
    prisma.visit.count({ where: { status: 'CHECKED_IN' } }),
    prisma.visit.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      include: {
        visitor: { select: { firstName: true, lastName: true } },
        hostEmployee: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { approvedAt: 'desc' },
      take: 5
    }),
    prisma.visit.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        visitor: { select: { firstName: true, lastName: true, company: true } },
        hostEmployee: { select: { firstName: true, lastName: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        pendingApprovals,
        todayVisits,
        weeklyVisits,
        blacklistedCount,
        checkedInNow
      },
      recentApprovals,
      pendingVisits
    }
  });
});

// Process Admin Dashboard
exports.getProcessAdminDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    pendingApprovals,
    approvedToday,
    rejectedToday,
    pendingVisits
  ] = await Promise.all([
    prisma.visit.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.visit.count({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: today }
      }
    }),
    prisma.visit.count({
      where: {
        status: 'REJECTED',
        approvedAt: { gte: today }
      }
    }),
    prisma.visit.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        visitor: true,
        hostEmployee: { select: { firstName: true, lastName: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        pendingApprovals,
        approvedToday,
        rejectedToday
      },
      pendingVisits
    }
  });
});

// Recent Activity
exports.getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const activities = await prisma.activityLog.findMany({
    include: {
      user: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: activities
  });
});

// Visit Trends (for charts)
exports.getVisitTrends = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  // Get daily visit counts
  const visits = await prisma.visit.findMany({
    where: {
      scheduledDate: { gte: startDate }
    },
    select: {
      scheduledDate: true,
      status: true
    }
  });

  // Group by date
  const dailyStats = {};
  visits.forEach(visit => {
    const dateKey = visit.scheduledDate.toISOString().split('T')[0];
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { total: 0, completed: 0, cancelled: 0 };
    }
    dailyStats[dateKey].total++;
    if (visit.status === 'CHECKED_OUT') dailyStats[dateKey].completed++;
    if (visit.status === 'CANCELLED') dailyStats[dateKey].cancelled++;
  });

  // Convert to array
  const trendData = Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    ...stats
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Purpose distribution
  const purposeDistribution = await prisma.visit.groupBy({
    by: ['purpose'],
    where: { scheduledDate: { gte: startDate } },
    _count: { purpose: true }
  });

  res.json({
    success: true,
    data: {
      dailyTrend: trendData,
      purposeDistribution
    }
  });
});
