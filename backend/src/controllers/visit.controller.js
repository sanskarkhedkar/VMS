const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');
const { logActivity } = require('../middleware/logger.middleware');
const { sendEmail } = require('../utils/email.util');
const { generateQRCode, generatePassNumber, verifyQRCode } = require('../utils/qr.util');
const { generateEntryPassPDF } = require('../utils/pass.util');
const { sendNotification, visitorEvents } = require('../utils/socket.util');

const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const buildFrontendUrl = (path = '') => `${frontendBaseUrl}${path}`;

const normalizeGuestData = (numberOfGuests, guests) => {
  const guestCount = Number.isInteger(numberOfGuests) && numberOfGuests >= 0 ? numberOfGuests : 0;

  if (!Array.isArray(guests) || guestCount === 0) {
    return { guestCount, guestDetails: [] };
  }

  const guestDetails = guests
    .filter((guest) => guest && (guest.name || guest.contact))
    .map((guest) => ({
      name: guest.name?.trim() || '',
      contact: guest.contact?.trim() || '',
    }))
    .slice(0, guestCount);

  return { guestCount, guestDetails };
};

// Get all visits with filters
exports.getAllVisits = asyncHandler(async (req, res) => {
  const { 
    status, 
    hostId, 
    startDate, 
    endDate, 
    search,
    page = 1, 
    limit = 20 
  } = req.query;
  
  const where = {};
  
  if (status) where.status = status;
  if (hostId) where.hostEmployeeId = hostId;
  
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) where.scheduledDate.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { visitor: { firstName: { contains: search, mode: 'insensitive' } } },
      { visitor: { lastName: { contains: search, mode: 'insensitive' } } },
      { visitor: { email: { contains: search, mode: 'insensitive' } } },
      { passNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      include: {
        visitor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            company: true
          }
        },
        hostEmployee: {
          select: {
            id: true,
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

  res.json({
    success: true,
    data: visits,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get today's visits (Security Guard)
exports.getTodaysVisits = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const visits = await prisma.visit.findMany({
    where: {
      scheduledDate: {
        gte: today,
        lt: tomorrow
      },
      status: { in: ['APPROVED', 'CHECKED_IN'] }
    },
    include: {
      visitor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          profileImage: true
        }
      },
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true
        }
      }
    },
    orderBy: { scheduledTimeIn: 'asc' }
  });

  // Separate by status
  const scheduled = visits.filter(v => v.status === 'APPROVED');
  const checkedIn = visits.filter(v => v.status === 'CHECKED_IN');

  res.json({
    success: true,
    data: {
      scheduled,
      checkedIn,
      totalToday: visits.length
    }
  });
});

// Get upcoming visits
exports.getUpcomingVisits = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days));

  const visits = await prisma.visit.findMany({
    where: {
      scheduledDate: {
        gte: startDate,
        lte: endDate
      },
      status: { in: ['APPROVED', 'PENDING_APPROVAL'] }
    },
    include: {
      visitor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          company: true
        }
      },
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true
        }
      }
    },
    orderBy: { scheduledDate: 'asc' }
  });

  res.json({
    success: true,
    data: visits
  });
});

// Get my visits (Host Employee)
exports.getMyVisits = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
  
  const where = {
    hostEmployeeId: req.user.id
  };
  
  if (status) where.status = status;
  
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) where.scheduledDate.gte = new Date(startDate);
    if (endDate) where.scheduledDate.lte = new Date(endDate);
  }

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      include: {
        visitor: true
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    }),
    prisma.visit.count({ where })
  ]);

  res.json({
    success: true,
    data: visits,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get visits ending soon for host (within next 5 minutes)
exports.getEndingSoonVisits = asyncHandler(async (req, res) => {
  const now = new Date();
  const threshold = new Date(now.getTime() + 5 * 60 * 1000);

  const visits = await prisma.visit.findMany({
    where: {
      hostEmployeeId: req.user.id,
      status: 'CHECKED_IN',
      actualTimeOut: null,
      scheduledTimeOut: {
        gte: now,
        lte: threshold
      }
    },
    select: {
      id: true,
      visitor: {
        select: {
          firstName: true,
          lastName: true,
          company: true
        }
      },
      scheduledTimeOut: true,
      scheduledTimeIn: true,
      status: true
    },
    orderBy: { scheduledTimeOut: 'asc' }
  });

  const data = visits.map((visit) => {
    const remainingMs = visit.scheduledTimeOut.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.round(remainingMs / 60000));
    return { ...visit, remainingMinutes };
  });

  res.json({
    success: true,
    data
  });
});

// Create invitation
exports.createInvitation = asyncHandler(async (req, res) => {
  const {
    visitorEmail,
    visitorFirstName,
    visitorLastName,
    visitorPhone,
    visitorCompany,
    purpose,
    purposeDetails,
    scheduledDate,
    scheduledTimeIn,
    scheduledTimeOut,
    vehicleNumber,
    numberOfGuests,
    guests,
    specialInstructions
  } = req.body;

  const { guestCount, guestDetails } = normalizeGuestData(numberOfGuests, guests);

  // Check for blacklist
  const existingVisitor = await prisma.visitor.findFirst({
    where: { email: visitorEmail }
  });

  if (existingVisitor?.isBlacklisted) {
    return res.status(400).json({
      success: false,
      message: 'This visitor is blacklisted and cannot be invited'
    });
  }

  // Create or get visitor
  let visitor;
  if (existingVisitor) {
    visitor = existingVisitor;
  } else {
    visitor = await prisma.visitor.create({
      data: {
        email: visitorEmail,
        firstName: visitorFirstName,
        lastName: visitorLastName,
        phone: visitorPhone,
        company: visitorCompany
      }
    });
  }

  // Create visit
  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId: req.user.id,
      purpose,
      purposeDetails,
      scheduledDate: new Date(scheduledDate),
      scheduledTimeIn: new Date(scheduledTimeIn),
      scheduledTimeOut: new Date(scheduledTimeOut),
      vehicleNumber,
      numberOfGuests: guestCount,
      guestDetails,
      specialInstructions,
      status: 'INVITED'
    },
    include: {
      visitor: true,
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

  // Send invitation email
  const formUrl = `${process.env.FRONTEND_URL}/visitor/complete/${visit.id}`;
  await sendEmail(visitor.email, 'visitorInvitation', {
  visitor,
  visit,
  formUrl
});


  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: visit.id,
    action: 'VISIT_INVITATION_SENT',
    description: `Invitation sent to ${visitorEmail}`,
    req
  });

  res.status(201).json({
    success: true,
    message: 'Invitation sent successfully',
    data: visit
  });
});

// Re-invite existing visitor
exports.reinviteVisitor = asyncHandler(async (req, res) => {
  const {
    visitorId,
    purpose,
    purposeDetails,
    scheduledDate,
    scheduledTimeIn,
    scheduledTimeOut,
    vehicleNumber,
    numberOfGuests,
    guests,
    specialInstructions
  } = req.body;

  const { guestCount, guestDetails } = normalizeGuestData(numberOfGuests, guests);

  const visitor = await prisma.visitor.findUnique({ where: { id: visitorId } });
  
  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: 'Visitor not found'
    });
  }

  if (visitor.isBlacklisted) {
    return res.status(400).json({
      success: false,
      message: 'This visitor is blacklisted'
    });
  }

  // Create new visit for existing visitor
  const visit = await prisma.visit.create({
    data: {
      visitorId,
      hostEmployeeId: req.user.id,
      purpose,
      purposeDetails,
      scheduledDate: new Date(scheduledDate),
      scheduledTimeIn: new Date(scheduledTimeIn),
      scheduledTimeOut: new Date(scheduledTimeOut),
      vehicleNumber,
      numberOfGuests: guestCount,
      guestDetails,
      specialInstructions,
      status: 'PENDING_APPROVAL' // Skip invitation step for existing visitors
    },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true
        }
      }
    }
  });

  // Notify approvers
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
        message: `${visitor.firstName} ${visitor.lastName} has been re-invited by ${req.user.firstName} ${req.user.lastName}.`,
        type: 'VISIT_APPROVAL_REQUIRED',
        metadata: JSON.stringify({ visitId: visit.id })
      }
    });

    sendNotification(approver.id, {
      title: 'Visit Pending Approval',
      body: `${visitor.firstName} ${visitor.lastName} has been re-invited by ${req.user.firstName} ${req.user.lastName}.`,
      url: buildFrontendUrl(`/visits/${visit.id}`),
      type: 'VISIT_APPROVAL_REQUIRED'
    });
  }

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: visit.id,
    action: 'VISITOR_REINVITED',
    description: `Re-invited visitor ${visitor.email}`,
    req
  });

  res.status(201).json({
    success: true,
    message: 'Visitor re-invited successfully',
    data: visit
  });
});

// Create walk-in visitor
exports.createWalkIn = asyncHandler(async (req, res) => {
  const {
    visitorEmail,
    visitorFirstName,
    visitorLastName,
    visitorPhone,
    visitorCompany,
    hostEmployeeId,
    purpose,
    purposeDetails,
    idType,
    idNumber,
    numberOfGuests,
    guests
  } = req.body;

  const { guestCount, guestDetails } = normalizeGuestData(numberOfGuests, guests);

  // Check blacklist
  const existingVisitor = await prisma.visitor.findFirst({
    where: { email: visitorEmail }
  });

  if (existingVisitor?.isBlacklisted) {
    return res.status(400).json({
      success: false,
      message: 'This visitor is blacklisted'
    });
  }

  // Verify host exists
  const host = await prisma.user.findUnique({ where: { id: hostEmployeeId } });
  if (!host) {
    return res.status(404).json({
      success: false,
      message: 'Host employee not found'
    });
  }

  // Create or get visitor
  let visitor;
  if (existingVisitor) {
    visitor = await prisma.visitor.update({
      where: { id: existingVisitor.id },
      data: {
        phone: visitorPhone || existingVisitor.phone,
        company: visitorCompany || existingVisitor.company,
        idType: idType || existingVisitor.idType,
        idNumber: idNumber || existingVisitor.idNumber
      }
    });
  } else {
    visitor = await prisma.visitor.create({
      data: {
        email: visitorEmail,
        firstName: visitorFirstName,
        lastName: visitorLastName,
        phone: visitorPhone,
        company: visitorCompany,
        idType,
        idNumber
      }
    });
  }

  const now = new Date();
  const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours default

  // Create walk-in visit with pending status (needs host approval)
  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId,
      purpose: purpose || 'OTHER',
      purposeDetails,
      scheduledDate: now,
      scheduledTimeIn: now,
      scheduledTimeOut: endTime,
      isWalkIn: true,
      walkInCreatedBy: req.user.id,
      numberOfGuests: guestCount,
      guestDetails,
      status: 'PENDING_APPROVAL'
    },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          email: true
        }
      }
    }
  });

  // Notify host employee for approval
  await prisma.notification.create({
    data: {
      userId: hostEmployeeId,
      title: 'Walk-in Visitor Waiting',
      message: `${visitor.firstName} ${visitor.lastName} is at the reception and wants to meet you. Please approve or reject.`,
      type: 'WALKIN_APPROVAL_REQUIRED',
      metadata: JSON.stringify({ visitId: visit.id })
    }
  });

  sendNotification(hostEmployeeId, {
    title: 'Walk-in Visitor Waiting',
    body: `${visitor.firstName} ${visitor.lastName} is at the reception and wants to meet you. Please approve or reject.`,
    url: buildFrontendUrl(`/visits/${visit.id}`),
    type: 'WALKIN_APPROVAL_REQUIRED'
  });

  visitorEvents.approvalRequired(hostEmployeeId, {
    id: visit.id,
    name: `${visitor.firstName} ${visitor.lastName}`,
    purpose
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: visit.id,
    action: 'WALKIN_CREATED',
    description: `Walk-in visitor created: ${visitor.email} for host ${host.email}`,
    req
  });

  res.status(201).json({
    success: true,
    message: 'Walk-in visitor registered. Awaiting host approval.',
    data: visit
  });
});

// Approve visit
exports.approveVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.status !== 'PENDING_APPROVAL') {
    return res.status(400).json({
      success: false,
      message: 'Visit is not pending approval'
    });
  }

  // Generate pass number and QR code
  const passNumber = generatePassNumber();
  const { qrCodeDataUrl, qrData } = await generateQRCode(visit.id, passNumber);

  // Update visit
  const updatedVisit = await prisma.visit.update({
    where: { id },
    data: {
      status: 'APPROVED',
      passNumber,
      qrCode: qrData,
      approvedById: req.user.id,
      approvedAt: new Date()
    },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  // Send approval email to visitor with QR (use updated data with pass number/QR)
  await sendEmail(updatedVisit.visitor.email, 'visitApproved', {
    visitor: updatedVisit.visitor,
    visit: updatedVisit,
    qrCodeDataUrl
  });

  // Notify host
  await prisma.notification.create({
    data: {
      userId: updatedVisit.hostEmployee.id,
      title: 'Visit Approved',
      message: `Visit for ${visit.visitor.firstName} ${visit.visitor.lastName} has been approved.`,
      type: 'VISIT_APPROVED',
      metadata: JSON.stringify({ visitId: id })
    }
  });

  sendNotification(updatedVisit.hostEmployee.id, {
    title: 'Visit Approved',
    body: `Visit for ${visit.visitor.firstName} ${visit.visitor.lastName} has been approved.`,
    url: buildFrontendUrl(`/visits/${id}`),
    type: 'VISIT_APPROVED'
  });

  visitorEvents.approved(updatedVisit.hostEmployee.id, {
    id,
    name: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
    approvedBy: `${req.user.firstName} ${req.user.lastName}`
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISIT_APPROVED',
    description: `Visit approved for ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visit approved successfully',
    data: updatedVisit
  });
});

// Reject visit
exports.rejectVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { visitor: true, hostEmployee: true }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  await prisma.visit.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      approvedById: req.user.id,
      approvedAt: new Date()
    }
  });

  // Notify host
  await prisma.notification.create({
    data: {
      userId: visit.hostEmployee.id,
      title: 'Visit Rejected',
      message: `Visit for ${visit.visitor.firstName} ${visit.visitor.lastName} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'VISIT_REJECTED',
      metadata: JSON.stringify({ visitId: id })
    }
  });

  sendNotification(visit.hostEmployee.id, {
    title: 'Visit Rejected',
    body: `Visit for ${visit.visitor.firstName} ${visit.visitor.lastName} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
    url: buildFrontendUrl(`/visits/${id}`),
    type: 'VISIT_REJECTED'
  });

  visitorEvents.rejected(visit.hostEmployee.id, {
    id,
    name: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
    reason: reason || 'Not specified'
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISIT_REJECTED',
    description: `Visit rejected for ${visit.visitor.email}. Reason: ${reason || 'Not specified'}`,
    req
  });

  res.json({
    success: true,
    message: 'Visit rejected'
  });
});

// Check-in visitor
exports.checkInVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: `Cannot check-in. Visit status: ${visit.status}`
    });
  }

  // Check if visitor is blacklisted
  if (visit.visitor.isBlacklisted) {
    return res.status(400).json({
      success: false,
      message: 'Visitor is blacklisted'
    });
  }

  const updatedVisit = await prisma.visit.update({
    where: { id },
    data: {
      status: 'CHECKED_IN',
      actualTimeIn: new Date()
    },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  // Notify host employee
  await sendEmail(updatedVisit.hostEmployee.email, 'visitorArrived', {
    host: updatedVisit.hostEmployee,
    visitor: updatedVisit.visitor,
    visit: updatedVisit
  });

  await prisma.notification.create({
    data: {
      userId: updatedVisit.hostEmployee.id,
      title: 'Visitor Arrived',
      message: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName} has checked in and is waiting for you.`,
      type: 'VISITOR_ARRIVED',
      metadata: JSON.stringify({ visitId: id })
    }
  });

  sendNotification(updatedVisit.hostEmployee.id, {
    title: 'Visitor Arrived',
    body: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName} has checked in and is waiting for you.`,
    url: buildFrontendUrl(`/visits/${id}`),
    type: 'VISITOR_ARRIVED'
  });

  visitorEvents.arrived(updatedVisit.hostEmployee.id, {
    id,
    name: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
    location: 'Reception'
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISITOR_CHECKED_IN',
    description: `Visitor checked in: ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visitor checked in successfully',
    data: {
      visit: updatedVisit,
      visitId: updatedVisit.id,
      visitorName: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
      hostName: `${updatedVisit.hostEmployee.firstName} ${updatedVisit.hostEmployee.lastName}`,
      checkInTime: updatedVisit.actualTimeIn
    }
  });
});

// Check-in by QR
exports.checkInByQR = asyncHandler(async (req, res) => {
  const { qrData } = req.body;

  const verification = verifyQRCode(qrData);
  
  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      message: verification.error
    });
  }

  const visit = await prisma.visit.findUnique({
    where: { id: verification.visitId },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.passNumber !== verification.passNumber) {
    return res.status(400).json({
      success: false,
      message: 'Invalid QR code'
    });
  }

  if (visit.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: `Cannot check-in. Visit status: ${visit.status}`
    });
  }

  // Same check-in logic
  const updatedVisit = await prisma.visit.update({
    where: { id: visit.id },
    data: {
      status: 'CHECKED_IN',
      actualTimeIn: new Date()
    },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  // Notify host
  await sendEmail(updatedVisit.hostEmployee.email, 'visitorArrived', {
    host: updatedVisit.hostEmployee,
    visitor: updatedVisit.visitor,
    visit: updatedVisit
  });

  await prisma.notification.create({
    data: {
      userId: updatedVisit.hostEmployee.id,
      title: 'Visitor Arrived',
      message: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName} has checked in.`,
      type: 'VISITOR_ARRIVED',
      metadata: JSON.stringify({ visitId: updatedVisit.id })
    }
  });

  sendNotification(updatedVisit.hostEmployee.id, {
    title: 'Visitor Arrived',
    body: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName} has checked in.`,
    url: buildFrontendUrl(`/visits/${updatedVisit.id}`),
    type: 'VISITOR_ARRIVED'
  });

  visitorEvents.arrived(updatedVisit.hostEmployee.id, {
    id: updatedVisit.id,
    name: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
    location: 'Reception'
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: visit.id,
    action: 'VISITOR_CHECKED_IN_QR',
    description: `Visitor checked in via QR: ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visitor checked in successfully',
    data: {
      visit: updatedVisit,
      visitId: updatedVisit.id,
      visitorName: `${updatedVisit.visitor.firstName} ${updatedVisit.visitor.lastName}`,
      hostName: `${updatedVisit.hostEmployee.firstName} ${updatedVisit.hostEmployee.lastName}`,
      checkInTime: updatedVisit.actualTimeIn
    }
  });
});

// Download entry pass PDF (post check-in)
exports.downloadEntryPass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      visitor: true,
      hostEmployee: true
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (!visit.passNumber) {
    return res.status(400).json({
      success: false,
      message: 'Entry pass is not available yet for this visit'
    });
  }

  if (!visit.actualTimeIn) {
    return res.status(400).json({
      success: false,
      message: 'Visitor must be checked in before printing the entry pass'
    });
  }

  const pdfBuffer = await generateEntryPassPDF(visit);

  await logActivity({
    userId: req.user.id,
    visitId: visit.id,
    action: 'ENTRY_PASS_GENERATED',
    description: 'Entry pass PDF generated after check-in',
    req
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=entry-pass-${visit.passNumber}.pdf`);
  res.send(pdfBuffer);
});

// Host checkout (mark meeting over)
exports.checkOutHost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { visitor: true, hostEmployee: true }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  const isHost = req.user.role === 'HOST_EMPLOYEE';
  const isProcessAdmin = req.user.role === 'PROCESS_ADMIN';
  if ((isHost && visit.hostEmployeeId !== req.user.id) || (!isHost && !isProcessAdmin)) {
    return res.status(403).json({
      success: false,
      message: 'Only the host or a process admin can mark the meeting as over'
    });
  }

  if (visit.status !== 'CHECKED_IN') {
    return res.status(400).json({
      success: false,
      message: 'Meeting can only be ended after the visitor is checked in'
    });
  }

  const endTime = new Date();
  await prisma.visit.update({
    where: { id },
    data: {
      status: 'CHECKED_OUT',
      actualTimeOut: endTime
    }
  });

  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISITOR_MEETING_OVER',
    description: `Host marked meeting over for ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visitor checked out by host/process admin.'
  });
});

// Security checkout (gate checkout)
exports.checkOutSecurity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.status === 'CHECKED_OUT') {
    return res.json({
      success: true,
      message: 'Visitor already checked out'
    });
  }

  if (visit.status !== 'CHECKED_IN') {
    return res.status(400).json({
      success: false,
      message: 'Visitor must be checked in before gate checkout'
    });
  }

  const gateTime = new Date();

  const checkoutVisit = await prisma.visit.update({
    where: { id },
    data: {
      status: 'CHECKED_OUT',
      actualTimeOut: gateTime
    },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (checkoutVisit.hostEmployee) {
    sendNotification(checkoutVisit.hostEmployee.id, {
      title: 'Visitor Checked Out',
      body: `${checkoutVisit.visitor.firstName} ${checkoutVisit.visitor.lastName} has left.`,
      url: buildFrontendUrl(`/visits/${id}`),
      type: 'VISITOR_CHECKED_OUT'
    });

    visitorEvents.checkout(checkoutVisit.hostEmployee.id, {
      id,
      name: `${checkoutVisit.visitor.firstName} ${checkoutVisit.visitor.lastName}`
    });
  }

  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISITOR_CHECKED_OUT_GATE',
    description: `Visitor checked out at gate: ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visitor checked out at gate'
  });
});

// Extend visit
exports.extendVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { minutes = 15 } = req.body;

  const visit = await prisma.visit.findUnique({ where: { id } });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.status !== 'CHECKED_IN') {
    return res.status(400).json({
      success: false,
      message: 'Can only extend checked-in visits'
    });
  }

  const baseTime = new Date(visit.scheduledTimeOut.getTime());
  const newEndTime = new Date(baseTime.getTime() + minutes * 60 * 1000);

  await prisma.visit.update({
    where: { id },
    data: {
      scheduledTimeOut: newEndTime,
      extensionCount: { increment: 1 },
      lastExtendedAt: new Date()
    }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISIT_EXTENDED',
    description: `Visit extended by ${minutes} minutes`,
    req
  });

  res.json({
    success: true,
    message: `Visit extended by ${minutes} minutes`,
    data: { newEndTime }
  });
});

// Cancel visit
exports.cancelVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: { visitor: true }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  // Only host or admin can cancel
  if (visit.hostEmployeeId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this visit'
    });
  }

  if (['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(visit.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel visit with status: ${visit.status}`
    });
  }

  await prisma.visit.update({
    where: { id },
    data: { status: 'CANCELLED' }
  });

  // Log activity
  await logActivity({
    userId: req.user.id,
    visitId: id,
    action: 'VISIT_CANCELLED',
    description: `Visit cancelled for ${visit.visitor.email}`,
    req
  });

  res.json({
    success: true,
    message: 'Visit cancelled'
  });
});

// Get pending approval visits
exports.getPendingApprovalVisits = asyncHandler(async (req, res) => {
  const visits = await prisma.visit.findMany({
    where: { status: 'PENDING_APPROVAL' },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: visits,
    count: visits.length
  });
});

// Get single visit
exports.getVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      visitor: true,
      hostEmployee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          email: true,
          phone: true
        }
      },
      approvedBy: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      activityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  res.json({
    success: true,
    data: visit
  });
});

// Update meeting status (for end of meeting prompt)
exports.updateMeetingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isOver } = req.body;

  const visit = await prisma.visit.findUnique({ where: { id } });

  if (!visit) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found'
    });
  }

  if (visit.hostEmployeeId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only host can update meeting status'
    });
  }

  if (isOver) {
    // Check out visitor
    await prisma.visit.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        actualTimeOut: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Visitor checked out'
    });
  } else {
    // Extend by 15 minutes
    const newEndTime = new Date(visit.scheduledTimeOut.getTime() + 15 * 60 * 1000);
    
    await prisma.visit.update({
      where: { id },
      data: {
        scheduledTimeOut: newEndTime,
        extensionCount: { increment: 1 },
        lastExtendedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Meeting extended by 15 minutes',
      data: { newEndTime }
    });
  }
});
