const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  // User signup pending approval
  signupPendingApproval: (user) => ({
    subject: 'Account Registration Pending Approval',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; }
          .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 Visitor Management System</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${user.firstName}!</h2>
            <p>Thank you for registering with our Visitor Management System.</p>
            <div class="highlight">
              <p><strong>Your registration is pending approval.</strong></p>
              <p>You will receive another email once an administrator has reviewed and approved your account.</p>
            </div>
            <p>Registration Details:</p>
            <ul>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Role:</strong> ${user.role.replace('_', ' ')}</li>
              <li><strong>Department:</strong> ${user.department || 'N/A'}</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // User approved
  userApproved: (user, loginUrl) => ({
    subject: '✅ Account Approved - You Can Now Login',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .success-box { background: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Account Approved!</h1>
          </div>
          <div class="content">
            <h2>Great news, ${user.firstName}!</h2>
            <div class="success-box">
              <p>Your account has been approved. You can now log in to the Visitor Management System.</p>
            </div>
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Login Now →</a>
            </p>
            <p>Your Account Details:</p>
            <ul>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Role:</strong> ${user.role.replace('_', ' ')}</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Visitor invitation
  visitorInvitation: (visitor, visit, formUrl) => ({
    subject: `🎫 You're Invited - ${visit.hostEmployee.firstName} ${visit.hostEmployee.lastName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .info-card { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .date-time { font-size: 18px; color: #7c3aed; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Hello ${visitor.firstName}!</h2>
            <p>You have been invited for a visit by <strong>${visit.hostEmployee.firstName} ${visit.hostEmployee.lastName}</strong>.</p>
            
            <div class="info-card">
              <p class="date-time">📅 ${new Date(visit.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p class="date-time">⏰ ${new Date(visit.scheduledTimeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(visit.scheduledTimeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Purpose:</strong> ${visit.purpose.replace('_', ' ')}</p>
              ${visit.purposeDetails ? `<p><strong>Details:</strong> ${visit.purposeDetails}</p>` : ''}
            </div>
            
            <p>Please complete your registration by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${formUrl}" class="button">Complete Registration →</a>
            </p>
            
            <p style="color: #64748b; font-size: 14px;">This link will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Visit approved with QR
  visitApproved: (visitor, visit, qrCodeDataUrl) => ({
    subject: '✅ Visit Approved - Your Entry Pass',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .qr-box { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
          .info-card { background: #ecfdf5; border: 1px solid #6ee7b7; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .pass-number { font-size: 24px; font-weight: bold; color: #059669; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Your Entry Pass</h1>
          </div>
          <div class="content">
            <h2>Hello ${visitor.firstName}!</h2>
            <p>Your visit has been <strong style="color: #059669;">approved</strong>. Please present the QR code below at the security desk upon arrival.</p>
            
            <div class="qr-box">
              <img src="${qrCodeDataUrl}" alt="Entry QR Code" style="width: 200px; height: 200px;" />
              <p class="pass-number">${visit.passNumber}</p>
            </div>
            
            <div class="info-card">
              <h3>Visit Details:</h3>
              <p><strong>📅 Date:</strong> ${new Date(visit.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>⏰ Time:</strong> ${new Date(visit.scheduledTimeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(visit.scheduledTimeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>👤 Host:</strong> ${visit.hostEmployee.firstName} ${visit.hostEmployee.lastName}</p>
              <p><strong>📍 Purpose:</strong> ${visit.purpose.replace('_', ' ')}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              <strong>Important:</strong> Please arrive 10 minutes before your scheduled time. Bring a valid photo ID for verification.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Host notification - visitor arrived
  visitorArrived: (host, visitor, visit) => ({
    subject: `🔔 ${visitor.firstName} ${visitor.lastName} Has Arrived`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .alert-box { background: #e0f2fe; border: 1px solid #7dd3fc; padding: 20px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Visitor Arrived</h1>
          </div>
          <div class="content">
            <h2>Hello ${host.firstName}!</h2>
            <div class="alert-box">
              <p><strong>${visitor.firstName} ${visitor.lastName}</strong> has checked in and is waiting for you.</p>
            </div>
            <p><strong>Check-in Time:</strong> ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Purpose:</strong> ${visit.purpose.replace('_', ' ')}</p>
            <p>Please proceed to the reception to meet your visitor.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Password reset
  passwordReset: (user, resetUrl) => ({
    subject: '🔐 Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .warning-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password →</a>
            </p>
            
            <div class="warning-box">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to, templateName, data) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName](data);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"VMS System" <noreply@vms.com>',
      to,
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send custom email
const sendCustomEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"VMS System" <noreply@vms.com>',
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendCustomEmail,
  emailTemplates
};
