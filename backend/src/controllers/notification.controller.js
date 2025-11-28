const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

// Get notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  
  const where = {
    userId: req.user.id
  };

  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.notification.count({ where })
  ]);

  res.json({
    success: true,
    data: notifications,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get unread count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { unreadCount: count }
  });
});

// Mark as read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id }
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  if (notification.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Mark all as read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user.id,
      isRead: false
    },
    data: { isRead: true }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id }
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  if (notification.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await prisma.notification.delete({ where: { id } });

  res.json({
    success: true,
    message: 'Notification deleted'
  });
});
