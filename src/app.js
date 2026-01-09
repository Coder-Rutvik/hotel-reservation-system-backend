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

// DB connections (Postgres-only)
const dbConnections = require('./config/database');

const app = express();

app.set('trust proxy', 1);

// ✅ FIXED CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:3000',
  'https://hotel-reservation-system-avvn.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('🚫 CORS blocked for origin:', origin);
      return callback(new Error(`CORS policy does not allow access from ${origin}`), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - FIXED for Render
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/health';
  }
});

app.use(limiter);

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom logger middleware
app.use(loggerMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ADD ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏨 Hotel Reservation System API',
    version: '1.0.0',
    frontend: 'https://hotel-reservation-system-avvn.onrender.com',
    documentation: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      rooms: {
        all: 'GET /api/rooms',
        available: 'GET /api/rooms/available',
        byFloor: 'GET /api/rooms/floor/:floorNumber'
      },
      bookings: {
        create: 'POST /api/bookings',
        myBookings: 'GET /api/bookings/my-bookings'
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await dbConnections.checkConnection();

    res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hotel Reservation API - Unstop Assessment',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      frontend: 'https://hotel-reservation-system-avvn.onrender.com',
      databases: {
        postgresql: dbStatus.connected ? 'connected' : `disconnected (${dbStatus.error || 'Unknown error'})`
      },
      endpoints: {
        auth: '/api/auth',
        bookings: '/api/bookings',
        rooms: '/api/rooms',
        admin: '/api/admin',
        dbTest: '/api/db-test'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// DB diagnostic endpoint
app.get('/api/db-test', async (req, res) => {
  const { sequelizePostgres } = require('./config/database');
  try {
    const [result] = await sequelizePostgres.query('SELECT 1+1 AS result, version() as pg_version');
    res.status(200).json({ 
      success: true, 
      result: result[0].result,
      postgres_version: result[0].pg_version,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('DB test failed:', err && err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message, 
      code: err.code,
      timestamp: new Date().toISOString()
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
      'GET    /',
      'GET    /api/health',
      'GET    /api/db-test',
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