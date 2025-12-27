require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./utils/socket.util');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const visitorRoutes = require('./routes/visitor.routes');
const visitRoutes = require('./routes/visit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/logger.middleware');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'VMS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handler
app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;
const server = require('http').createServer(app);
initSocket(server, app);

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     Visitor Management System API             ║
  ║     Running on port ${PORT}                       ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}               ║
  ╚═══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
