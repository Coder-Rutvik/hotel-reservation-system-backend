const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roomRoutes = require('./routes/roomRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/logger');

const app = express();

// Trust proxy - MUST be before rate limiter
// Use number instead of boolean for Render's load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Rate limiting - FIXED for Render with proper trust proxy handling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator that handles proxy correctly
  keyGenerator: (req) => {
    // Get the real IP from X-Forwarded-For header (Render's proxy)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});

app.use('/api/', limiter);

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom logger middleware (Only if MongoDB is connected)
const mongoose = require('mongoose');
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    loggerMiddleware(req, res, next);
  } else {
    next();
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint - Should respond quickly
app.get('/api/health', async (req, res) => {
  const dbConnections = require('./config/db-connections');

  try {
    const dbStatus = await dbConnections.checkAllConnections();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hotel Reservation API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      databases: {
        mysql: dbStatus.mysql.connected ? 'connected' : `disconnected (${dbStatus.mysql.error})`,
        postgresql: dbStatus.postgresql.connected ? 'connected' : `disconnected (${dbStatus.postgresql.error})`,
        mongodb: dbStatus.mongodb.connected ? 'connected' : `disconnected (${dbStatus.mongodb.error})`
      },
      endpoints: {
        auth: '/api/auth',
        bookings: '/api/bookings',
        rooms: '/api/rooms',
        admin: '/api/admin'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET    /api/health',
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'GET    /api/auth/me',
      'GET    /api/rooms',
      'GET    /api/rooms/available',
      'POST   /api/bookings',
      'GET    /api/bookings/my-bookings',
      'GET    /api/admin/stats (admin only)'
    ]
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;