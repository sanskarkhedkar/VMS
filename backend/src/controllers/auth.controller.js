const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const jwtConfig = require('../config/jwt.config');
const { sendEmail } = require('../utils/email.util');
const { asyncHandler } = require('../middleware/error.middleware');
const { logActivity } = require('../middleware/logger.middleware');
const { sendNotification } = require('../utils/socket.util');

const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const buildFrontendUrl = (path = '') => `${frontendBaseUrl}${path}`;

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

// Signup
exports.signup = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, phone, department, designation, employeeId } = req.body;

  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Check if employeeId exists (if provided)
  if (employeeId) {
    const existingEmployeeId = await prisma.user.findUnique({ where: { employeeId } });
    if (existingEmployeeId) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already registered'
      });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user with pending status
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phone,
      department,
      designation,
      employeeId,
      status: 'PENDING_APPROVAL'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      department: true,
      createdAt: true
    }
  });

  // Send pending approval email
await sendEmail(email, 'signupPendingApproval', { user });


  // Log activity
  await logActivity({
    userId: user.id,
    action: 'USER_SIGNUP',
    description: `New user signup: ${email} (${role})`,
    req
  });

  // Create notification for admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' }
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'New User Registration',
        message: `${firstName} ${lastName} (${role.replace('_', ' ')}) has registered and is pending approval.`,
        type: 'USER_APPROVAL_REQUIRED'
      }
    });

    sendNotification(admin.id, {
      title: 'New User Registration',
      body: `${firstName} ${lastName} (${role.replace('_', ' ')}) needs approval.`,
      url: buildFrontendUrl('/admin/users'),
      type: 'USER_APPROVAL_REQUIRED'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Your account is pending admin approval.',
    data: user
  });
});

// Login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check account status
  if (user.status === 'PENDING_APPROVAL') {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending approval. Please wait for admin approval.'
    });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      message: 'Your account has been suspended. Please contact administrator.'
    });
  }

  if (user.status === 'REJECTED') {
    return res.status(403).json({
      success: false,
      message: 'Your account registration was rejected.',
      reason: user.rejectionReason
    });
  }

  // Generate token
  const token = generateToken(user.id);

  // Log activity
  await logActivity({
    userId: user.id,
    action: 'USER_LOGIN',
    description: `User logged in: ${email}`,
    req
  });

  const sanitizedUser = {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId
  };

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: sanitizedUser,
    data: {
      token,
      user: sanitizedUser
    }
  });
});

// Verify current token/user (used by desktop agent)
exports.verify = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        ...req.user,
        name: `${req.user.firstName} ${req.user.lastName}`.trim()
      }
    }
  });
});

// Get current user
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
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
      createdAt: true
    }
  });

  res.json({
    success: true,
    data: user
  });
});

// Forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  
  // Always return success for security (don't reveal if email exists)
  if (!user) {
    return res.json({
      success: true,
      message: 'If your email exists in our system, you will receive a password reset link.'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  // Store token (in production, store hashed version)
  await prisma.systemSetting.upsert({
    where: { key: `password_reset_${user.id}` },
    update: { value: JSON.stringify({ token: resetToken, expiry: resetTokenExpiry }) },
    create: {
      key: `password_reset_${user.id}`,
      value: JSON.stringify({ token: resetToken, expiry: resetTokenExpiry })
    }
  });

  // Send reset email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
  await sendEmail(user.email, 'passwordReset', {
  user,
  resetUrl
});

  res.json({
    success: true,
    message: 'If your email exists in our system, you will receive a password reset link.'
  });
});

// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password, email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  // Get stored token
  const storedData = await prisma.systemSetting.findUnique({
    where: { key: `password_reset_${user.id}` }
  });

  if (!storedData) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  const { token: storedToken, expiry } = JSON.parse(storedData.value);

  if (token !== storedToken || new Date(expiry) < new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  // Delete reset token
  await prisma.systemSetting.delete({
    where: { key: `password_reset_${user.id}` }
  });

  // Log activity
  await logActivity({
    userId: user.id,
    action: 'PASSWORD_RESET',
    description: `Password reset for: ${email}`,
    req
  });

  res.json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  });
});

// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  // Log activity
  await logActivity({
    userId,
    action: 'PASSWORD_CHANGED',
    description: 'User changed their password',
    req
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});
