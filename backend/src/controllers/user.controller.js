const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { logActivity } = require('../middleware/logger.middleware');
const { sendEmail } = require('../utils/email.util');

// Get all users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  
  const where = {};
  
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        department: true,
        designation: true,
        employeeId: true,
        role: true,
        status: true,
        createdAt: true,
        approvedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get pending users
exports.getPendingUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'PENDING_APPROVAL' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      department: true,
      designation: true,
      employeeId: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// Get host employees (for dropdown)
exports.getHostEmployees = asyncHandler(async (req, res) => {
  const { search } = req.query;
  
  const where = {
    role: 'HOST_EMPLOYEE',
    status: 'ACTIVE'
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const hosts = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      department: true,
      employeeId: true
    },
    orderBy: { firstName: 'asc' }
  });

  res.json({
    success: true,
    data: hosts
  });
});

// Get single user
exports.getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      department: true,
      designation: true,
      employeeId: true,
      role: true,
      status: true,
      profileImage: true,
      createdAt: true,
      approvedAt: true,
      approvedBy: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
});

// Approve user
exports.approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.status !== 'PENDING_APPROVAL') {
    return res.status(400).json({
      success: false,
      message: 'User is not pending approval'
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      approvedBy: req.user.id,
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

  // Send approval email
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  await sendEmail(user.email, 'userApproved', { user, loginUrl });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_APPROVED',
    description: `User approved: ${user.email}`,
    metadata: { approvedUserId: id },
    req
  });

  res.json({
    success: true,
    message: 'User approved successfully',
    data: updatedUser
  });
});

// Reject user
exports.rejectUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      approvedBy: req.user.id,
      approvedAt: new Date()
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_REJECTED',
    description: `User rejected: ${user.email}. Reason: ${reason || 'Not specified'}`,
    metadata: { rejectedUserId: id, reason },
    req
  });

  res.json({
    success: true,
    message: 'User rejected',
    data: { id: updatedUser.id, status: updatedUser.status }
  });
});

// Suspend user
exports.suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role === 'ADMIN') {
    return res.status(400).json({
      success: false,
      message: 'Cannot suspend admin users'
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_SUSPENDED',
    description: `User suspended: ${user.email}`,
    metadata: { suspendedUserId: id },
    req
  });

  res.json({
    success: true,
    message: 'User suspended',
    data: { id: updatedUser.id, status: updatedUser.status }
  });
});

// Unsuspend user
exports.unsuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.status !== 'SUSPENDED') {
    return res.status(400).json({
      success: false,
      message: 'User is not suspended'
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_UNSUSPENDED',
    description: `User unsuspended: ${user.email}`,
    metadata: { unsuspendedUserId: id },
    req
  });

  res.json({
    success: true,
    message: 'User unsuspended',
    data: { id: updatedUser.id, status: updatedUser.status }
  });
});

// Update user
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, department, designation, role, status } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(department && { department }),
      ...(designation && { designation }),
      ...(role && { role }),
      ...(status && { status })
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      department: true,
      designation: true,
      role: true,
      status: true
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_UPDATED',
    description: `User updated: ${user.email}`,
    metadata: { updatedUserId: id },
    req
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  });
});

// Delete user
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role === 'ADMIN') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete admin users'
    });
  }

  await prisma.user.delete({ where: { id } });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'USER_DELETED',
    description: `User deleted: ${user.email}`,
    metadata: { deletedUserId: id },
    req
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});
