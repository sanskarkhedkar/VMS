const prisma = require('../config/database');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${log.method} ${log.url} ${log.status} ${log.duration}`);
    }
  });

  next();
};

// Activity logger for important actions
const logActivity = async (options) => {
  try {
    const { userId, visitId, action, description, metadata, req } = options;
    
    await prisma.activityLog.create({
      data: {
        userId,
        visitId,
        action,
        description,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get?.('user-agent'),
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

module.exports = {
  requestLogger,
  logActivity
};
