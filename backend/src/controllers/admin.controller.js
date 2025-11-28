const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { logActivity } = require('../middleware/logger.middleware');
const { sendEmail } = require('../utils/email.util');

// Get system settings
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        notIn: ['password_reset_'] // Exclude sensitive settings
      }
    }
  });

  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  res.json({
    success: true,
    data: settingsMap
  });
});

// Update settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
  }

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'SETTINGS_UPDATED',
    description: 'System settings updated',
    metadata: { updatedKeys: Object.keys(settings) },
    req
  });

  res.json({
    success: true,
    message: 'Settings updated successfully'
  });
});

// Get email templates
exports.getEmailTemplates = asyncHandler(async (req, res) => {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { name: 'asc' }
  });

  res.json({
    success: true,
    data: templates
  });
});

// Update email template
exports.updateEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, body, isActive } = req.body;

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(subject && { subject }),
      ...(body && { body }),
      ...(isActive !== undefined && { isActive })
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'EMAIL_TEMPLATE_UPDATED',
    description: `Email template updated: ${template.name}`,
    req
  });

  res.json({
    success: true,
    message: 'Email template updated',
    data: template
  });
});

// Bulk approve users
exports.bulkApproveUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User IDs array is required'
    });
  }

  // Get users to approve
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      status: 'PENDING_APPROVAL'
    }
  });

  // Update all users
  await prisma.user.updateMany({
    where: {
      id: { in: userIds },
      status: 'PENDING_APPROVAL'
    },
    data: {
      status: 'ACTIVE',
      approvedBy: req.user.id,
      approvedAt: new Date()
    }
  });

  // Send approval emails
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  for (const user of users) {
    await sendEmail(user.email, 'userApproved', { ...user, loginUrl });
  }

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'BULK_USER_APPROVAL',
    description: `Bulk approved ${users.length} users`,
    metadata: { approvedUserIds: userIds },
    req
  });

  res.json({
    success: true,
    message: `${users.length} users approved successfully`
  });
});

// Get system statistics
exports.getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    totalVisitors,
    blacklistedVisitors,
    totalVisits,
    completedVisits,
    activityLogsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.visitor.count(),
    prisma.visitor.count({ where: { isBlacklisted: true } }),
    prisma.visit.count(),
    prisma.visit.count({ where: { status: 'CHECKED_OUT' } }),
    prisma.activityLog.count()
  ]);

  // Get users by role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true }
  });

  // Get visits by status (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentVisitsByStatus = await prisma.visit.groupBy({
    by: ['status'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: { status: true }
  });

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        byRole: usersByRole.map(r => ({ role: r.role, count: r._count.role }))
      },
      visitors: {
        total: totalVisitors,
        blacklisted: blacklistedVisitors
      },
      visits: {
        total: totalVisits,
        completed: completedVisits,
        recentByStatus: recentVisitsByStatus.map(s => ({ status: s.status, count: s._count.status }))
      },
      activityLogs: activityLogsCount
    }
  });
});

// Create first admin user (for initial setup)
exports.createAdminUser = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if any admin exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin) {
    return res.status(400).json({
      success: false,
      message: 'Admin user already exists'
    });
  }

  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'ADMIN',
      status: 'ACTIVE',
      approvedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true
    }
  });

  // Log activity
  await logActivity({
    userId: admin.id,
    action: 'ADMIN_CREATED',
    description: 'Initial admin user created',
    req
  });

  res.status(201).json({
    success: true,
    message: 'Admin user created successfully',
    data: admin
  });
});
