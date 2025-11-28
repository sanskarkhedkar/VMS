const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { logActivity } = require('../middleware/logger.middleware');

// Get all visitors
exports.getAllVisitors = asyncHandler(async (req, res) => {
  const { search, isBlacklisted, page = 1, limit = 20 } = req.query;
  
  const where = {};
  
  if (isBlacklisted !== undefined) {
    where.isBlacklisted = isBlacklisted === 'true';
  }
  
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [visitors, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      include: {
        visits: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            purpose: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.visitor.count({ where })
  ]);

  res.json({
    success: true,
    data: visitors,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Search visitors for re-invite
exports.searchVisitors = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const visitors = await prisma.visitor.findMany({
    where: {
      isBlacklisted: false,
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true
    },
    take: 10
  });

  res.json({
    success: true,
    data: visitors
  });
});

// Get blacklisted visitors
exports.getBlacklistedVisitors = asyncHandler(async (req, res) => {
  const visitors = await prisma.visitor.findMany({
    where: { isBlacklisted: true },
    orderBy: { blacklistedAt: 'desc' }
  });

  res.json({
    success: true,
    data: visitors
  });
});

// Get single visitor
exports.getVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visitor = await prisma.visitor.findUnique({
    where: { id },
    include: {
      visits: {
        orderBy: { scheduledDate: 'desc' },
        include: {
          hostEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: true
            }
          }
        }
      }
    }
  });

  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  res.json({
    success: true,
    data: visitor
  });
});

// Update visitor
exports.updateVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, company, designation, idType, idNumber } = req.body;

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  
  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  const updatedVisitor = await prisma.visitor.update({
    where: { id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(company && { company }),
      ...(designation && { designation }),
      ...(idType && { idType }),
      ...(idNumber && { idNumber })
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'VISITOR_UPDATED',
    description: `Visitor updated: ${visitor.email}`,
    metadata: { visitorId: id },
    req
  });

  res.json({
    success: true,
    message: 'Visitor updated successfully',
    data: updatedVisitor
  });
});

// Get invitation details (public)
exports.getInvitationDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Token is the visit ID
  const visit = await prisma.visit.findUnique({
    where: { id: token },
    include: {
      visitor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          designation: true
        }
      },
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          email: true
        }
      }
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Invitation not found or expired'
    });
  }

  if (visit.status !== 'INVITED' && visit.status !== 'PENDING_DETAILS') {
    return res.status(400).json({
      success: false,
      message: 'This invitation has already been processed'
    });
  }

  res.json({
    success: true,
    data: {
      visit: {
        id: visit.id,
        purpose: visit.purpose,
        purposeDetails: visit.purposeDetails,
        scheduledDate: visit.scheduledDate,
        scheduledTimeIn: visit.scheduledTimeIn,
        scheduledTimeOut: visit.scheduledTimeOut
      },
      visitor: visit.visitor,
      host: visit.hostEmployee
    }
  });
});

// Complete invitation (public)
exports.completeInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { phone, company, designation, idType, idNumber } = req.body;

  const visit = await prisma.visit.findUnique({
    where: { id: token },
    include: { visitor: true }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Invitation not found'
    });
  }

  if (visit.status !== 'INVITED' && visit.status !== 'PENDING_DETAILS') {
    return res.status(400).json({
      success: false,
      message: 'This invitation has already been processed'
    });
  }

  // Update visitor details
  await prisma.visitor.update({
    where: { id: visit.visitorId },
    data: {
      ...(phone && { phone }),
      ...(company && { company }),
      ...(designation && { designation }),
      ...(idType && { idType }),
      ...(idNumber && { idNumber })
    }
  });

  // Update visit status to pending approval
  await prisma.visit.update({
    where: { id: token },
    data: { status: 'PENDING_APPROVAL' }
  });

  // Create notification for Process Admin and Security Manager
  const approvers = await prisma.user.findMany({
    where: {
      role: { in: ['PROCESS_ADMIN', 'SECURITY_MANAGER'] },
      status: 'ACTIVE'
    }
  });

  for (const approver of approvers) {
    await prisma.notification.create({
      data: {
        userId: approver.id,
        title: 'Visit Pending Approval',
        message: `${visit.visitor.firstName} ${visit.visitor.lastName} has completed their registration and is awaiting approval.`,
        type: 'VISIT_APPROVAL_REQUIRED',
        metadata: JSON.stringify({ visitId: visit.id })
      }
    });
  }

  res.json({
    success: true,
    message: 'Registration completed. Your visit is pending approval.'
  });
});

// Request visitor action (block/delete/blacklist)
exports.requestVisitorAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  
  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  const request = await prisma.visitorRequest.create({
    data: {
      visitorId: id,
      requestType: action,
      reason,
      requestedById: req.user.id
    }
  });

  // Notify admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' }
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: `Visitor ${action} Request`,
        message: `${req.user.firstName} ${req.user.lastName} has requested to ${action.toLowerCase()} visitor ${visitor.firstName} ${visitor.lastName}. Reason: ${reason}`,
        type: 'VISITOR_ACTION_REQUEST',
        metadata: JSON.stringify({ requestId: request.id, visitorId: id })
      }
    });
  }

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'VISITOR_ACTION_REQUESTED',
    description: `Requested ${action} for visitor: ${visitor.email}`,
    metadata: { visitorId: id, action, reason },
    req
  });

  res.json({
    success: true,
    message: `${action} request submitted for admin approval`,
    data: request
  });
});

// Get pending visitor requests
exports.getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await prisma.visitorRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      requestedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get visitor details for each request
  const requestsWithVisitors = await Promise.all(
    requests.map(async (request) => {
      const visitor = request.visitorId 
        ? await prisma.visitor.findUnique({ where: { id: request.visitorId } })
        : null;
      return { ...request, visitor };
    })
  );

  res.json({
    success: true,
    data: requestsWithVisitors
  });
});

// Process visitor action request
exports.processVisitorRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { approved } = req.body;

  const request = await prisma.visitorRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Request not found'
    });
  }

  if (request.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Request already processed'
    });
  }

  // Update request status
  await prisma.visitorRequest.update({
    where: { id: requestId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      processedById: req.user.id,
      processedAt: new Date()
    }
  });

  // If approved, perform the action
  if (approved && request.visitorId) {
    const visitor = await prisma.visitor.findUnique({ where: { id: request.visitorId } });
    
    switch (request.requestType) {
      case 'BLACKLIST':
        await prisma.visitor.update({
          where: { id: request.visitorId },
          data: {
            isBlacklisted: true,
            blacklistReason: request.reason,
            blacklistedAt: new Date(),
            blacklistedBy: req.user.id
          }
        });
        break;
      case 'DELETE':
        await prisma.visitor.delete({ where: { id: request.visitorId } });
        break;
      case 'BLOCK':
        // Cancel all future visits
        await prisma.visit.updateMany({
          where: {
            visitorId: request.visitorId,
            status: { in: ['INVITED', 'PENDING_DETAILS', 'PENDING_APPROVAL', 'APPROVED'] }
          },
          data: { status: 'CANCELLED' }
        });
        break;
    }

    // Log activity
    await logActivity({
      userId: req.user.id,
      action: `VISITOR_${request.requestType}`,
      description: `Visitor ${request.requestType.toLowerCase()}: ${visitor?.email}`,
      metadata: { visitorId: request.visitorId, reason: request.reason },
      req
    });
  }

  // Notify requester
  await prisma.notification.create({
    data: {
      userId: request.requestedById,
      title: `Visitor ${request.requestType} Request ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your request to ${request.requestType.toLowerCase()} the visitor has been ${approved ? 'approved' : 'rejected'}.`,
      type: 'REQUEST_PROCESSED'
    }
  });

  res.json({
    success: true,
    message: `Request ${approved ? 'approved' : 'rejected'} successfully`
  });
});

// Blacklist visitor (direct - Admin/Security Manager only)
exports.blacklistVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  
  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  await prisma.visitor.update({
    where: { id },
    data: {
      isBlacklisted: true,
      blacklistReason: reason,
      blacklistedAt: new Date(),
      blacklistedBy: req.user.id
    }
  });

  // Cancel any future visits
  await prisma.visit.updateMany({
    where: {
      visitorId: id,
      status: { in: ['INVITED', 'PENDING_DETAILS', 'PENDING_APPROVAL', 'APPROVED'] }
    },
    data: { status: 'CANCELLED' }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'VISITOR_BLACKLISTED',
    description: `Visitor blacklisted: ${visitor.email}`,
    metadata: { visitorId: id, reason },
    req
  });

  res.json({
    success: true,
    message: 'Visitor blacklisted successfully'
  });
});

// Remove from blacklist
exports.unblacklistVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  
  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  await prisma.visitor.update({
    where: { id },
    data: {
      isBlacklisted: false,
      blacklistReason: null,
      blacklistedAt: null,
      blacklistedBy: null
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    action: 'VISITOR_UNBLACKLISTED',
    description: `Visitor removed from blacklist: ${visitor.email}`,
    metadata: { visitorId: id },
    req
  });

  res.json({
    success: true,
    message: 'Visitor removed from blacklist'
  });
});
