const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');

let io = null;
const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const buildFrontendUrl = (path = '') => `${frontendBaseUrl}${path}`;

const getCorsOrigin = () => {
  const fromEnv = (process.env.SOCKET_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!fromEnv.length) {
    return '*';
  }

  if (!fromEnv.includes('file://')) {
    fromEnv.push('file://');
  }

  return fromEnv;
};

/**
 * Initialize Socket.IO server and attach it to the HTTP server.
 */
function initSocket(server, app) {
  io = new Server(server, {
    cors: {
      origin: getCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Store io instance on app for access in routes/controllers
  app.set('io', io);

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      socket.userId = decoded.id || decoded.userId;
      socket.user = decoded;
      return next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on('register', (userId) => {
      const roomId = `user-${userId}`;
      socket.join(roomId);
      console.log(`User ${userId} joined room: ${roomId}`);

      if (socket.user?.role) {
        socket.join(`role-${socket.user.role}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userId}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  console.log('Socket.IO server initialized');
  return io;
}

function sendNotification(userId, payload) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return false;
  }

  io.to(`user-${userId}`).emit('notification', {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    type: payload.type || 'general',
    timestamp: new Date().toISOString()
  });

  return true;
}

function sendToRole(role, payload) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return false;
  }

  io.to(`role-${role}`).emit('notification', {
    ...payload,
    timestamp: new Date().toISOString()
  });

  return true;
}

function broadcast(payload) {
  if (!io) {
    console.error('Socket.IO not initialized');
    return false;
  }

  io.emit('notification', {
    ...payload,
    timestamp: new Date().toISOString()
  });

  return true;
}

const visitorEvents = {
  arrived: (userId, visitor) => {
    if (!io) return;
    io.to(`user-${userId}`).emit('visitor:arrived', {
      visitorName: visitor.name,
      location: visitor.location || 'Reception',
      url: buildFrontendUrl(`/visits/${visitor.id}`),
      timestamp: new Date().toISOString()
    });
  },

  approved: (userId, visitor) => {
    if (!io) return;
    io.to(`user-${userId}`).emit('visitor:approved', {
      visitorName: visitor.name,
      approvedBy: visitor.approvedBy,
      url: buildFrontendUrl(`/visits/${visitor.id}`),
      timestamp: new Date().toISOString()
    });
  },

  rejected: (userId, visitor) => {
    if (!io) return;
    io.to(`user-${userId}`).emit('visitor:rejected', {
      visitorName: visitor.name,
      reason: visitor.reason,
      url: buildFrontendUrl(`/visits/${visitor.id}`),
      timestamp: new Date().toISOString()
    });
  },

  checkout: (userId, visitor) => {
    if (!io) return;
    io.to(`user-${userId}`).emit('visitor:checkout', {
      visitorName: visitor.name,
      checkoutTime: new Date().toISOString(),
      url: buildFrontendUrl(`/visits/${visitor.id}`),
      timestamp: new Date().toISOString()
    });
  },

  approvalRequired: (userId, visitor) => {
    if (!io) return;
    io.to(`user-${userId}`).emit('approval:required', {
      visitorName: visitor.name,
      purpose: visitor.purpose,
      url: buildFrontendUrl(`/visits/${visitor.id}/approve`),
      timestamp: new Date().toISOString()
    });
  }
};

const getIO = () => io;

module.exports = {
  initSocket,
  sendNotification,
  sendToRole,
  broadcast,
  visitorEvents,
  getIO
};
