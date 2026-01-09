// ✅ FIXED: backend/src/app.js
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

// DB connections
const dbConnections = require('./config/database');

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// ✅ FIXED CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:3000',
  'https://hotel-reservation-system-avvn.onrender.com',
  'https://hotel-reservation-system-backend-6nf6.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Rate limiting - FIXED for Render
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/api/db-test';
  }
});

app.use('/api/', limiter);

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

// ✅ ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏨 Hotel Reservation System API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: 'GET /api/health',
      dbTest: 'GET /api/db-test',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      rooms: {
        all: 'GET /api/rooms',
        available: 'GET /api/rooms/available',
        byFloor: 'GET /api/rooms/floor/:floorNumber',
        createSample: 'POST /api/rooms/create-sample',
        seedRooms: 'POST /api/rooms/seed-rooms (PRIVATE)',
        resetAll: 'POST /api/rooms/reset-all (PRIVATE)'
      },
      bookings: {
        create: 'POST /api/bookings',
        myBookings: 'GET /api/bookings/my-bookings',
        cancel: 'PUT /api/bookings/:id/cancel'
      },
      admin: {
        stats: 'GET /api/admin/stats (ADMIN)',
        users: 'GET /api/admin/users (ADMIN)',
        bookings: 'GET /api/admin/bookings (ADMIN)'
      }
    },
    emergencyFixes: {
      autoCreateRooms: 'GET/POST /api/auto-fix-rooms',
      forceCreateRooms: 'GET/POST /api/force-create-rooms',
      quickCreateRooms: 'GET/POST /api/create-rooms'
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await dbConnections.checkAllConnections();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hotel Reservation API - Unstop Assessment',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      databases: {
        postgresql: dbStatus.postgresql.connected ? 'connected' : `disconnected (${dbStatus.postgresql.error})`
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
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

// DB diagnostic endpoint
app.get('/api/db-test', async (req, res) => {
  const { sequelize } = require('./config/database');
  try {
    await sequelize.authenticate();
    const [result] = await sequelize.query('SELECT NOW() as current_time, version() as pg_version');
    
    // Check rooms count
    const [roomCount] = await sequelize.query('SELECT COUNT(*) as count FROM rooms');
    const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    const [bookingCount] = await sequelize.query('SELECT COUNT(*) as count FROM bookings');
    
    res.status(200).json({ 
      success: true, 
      message: 'Database connected successfully',
      database: {
        connected: true,
        currentTime: result[0].current_time,
        version: result[0].pg_version.split(' ')[1],
        tables: {
          rooms: parseInt(roomCount[0].count),
          users: parseInt(userCount[0].count),
          bookings: parseInt(bookingCount[0].count)
        }
      }
    });
  } catch (err) {
    console.error('DB test failed:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message, 
      code: err.code,
      hint: 'Run POST /api/auto-fix-rooms to create tables'
    });
  }
});

// ✅ EMERGENCY FIX HANDLERS
const handleAutoFixRooms = async (req, res) => {
  try {
    const { sequelize } = require('./config/database');
    
    console.log('🔄 AUTO-FIX: Checking and creating rooms...');
    
    // 1. Check if rooms table exists
    let tableExists = false;
    try {
      await sequelize.query('SELECT 1 FROM rooms LIMIT 1');
      tableExists = true;
      console.log('✅ Rooms table exists');
    } catch (err) {
      if (err.message.includes('does not exist') || err.code === '42P01') {
        console.log('📝 Creating rooms table...');
        await sequelize.query(`
          CREATE TABLE rooms (
            room_id SERIAL PRIMARY KEY,
            room_number INTEGER UNIQUE NOT NULL,
            floor INTEGER NOT NULL,
            position INTEGER NOT NULL,
            room_type VARCHAR(20) DEFAULT 'standard',
            is_available BOOLEAN DEFAULT true,
            base_price DECIMAL(10,2) DEFAULT 100.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Rooms table created');
        tableExists = true;
      }
    }
    
    // 2. Check room count
    const [roomCount] = await sequelize.query('SELECT COUNT(*) as count FROM rooms');
    const count = parseInt(roomCount[0].count);
    
    let message = '';
    
    if (count === 0) {
      console.log('🏨 Adding 20 sample rooms...');
      
      // Add 20 sample rooms
      await sequelize.query(`
        INSERT INTO rooms (room_number, floor, position, room_type, base_price, is_available) VALUES
        (101, 1, 1, 'standard', 100.00, true),
        (102, 1, 2, 'standard', 100.00, true),
        (103, 1, 3, 'standard', 100.00, true),
        (104, 1, 4, 'standard', 100.00, true),
        (105, 1, 5, 'standard', 100.00, true),
        (106, 1, 6, 'standard', 100.00, true),
        (107, 1, 7, 'standard', 100.00, true),
        (108, 1, 8, 'deluxe', 150.00, true),
        (109, 1, 9, 'deluxe', 150.00, true),
        (110, 1, 10, 'deluxe', 150.00, true),
        (201, 2, 1, 'standard', 100.00, true),
        (202, 2, 2, 'standard', 100.00, true),
        (203, 2, 3, 'standard', 100.00, true),
        (204, 2, 4, 'standard', 100.00, true),
        (205, 2, 5, 'standard', 100.00, true),
        (206, 2, 6, 'standard', 100.00, true),
        (207, 2, 7, 'standard', 100.00, true),
        (208, 2, 8, 'standard', 100.00, true),
        (209, 2, 9, 'standard', 100.00, true),
        (210, 2, 10, 'standard', 100.00, true)
        ON CONFLICT (room_number) DO NOTHING
      `);
      
      message = 'Created rooms table and added 20 sample rooms';
    } else {
      message = `Rooms already exist (${count} rooms found)`;
    }
    
    // 3. Final count
    const [finalCount] = await sequelize.query('SELECT COUNT(*) FROM rooms');
    const [availableCount] = await sequelize.query('SELECT COUNT(*) FROM rooms WHERE is_available = true');
    
    res.json({
      success: true,
      message: message,
      rooms: {
        total: parseInt(finalCount[0].count),
        available: parseInt(availableCount[0].count),
        occupied: parseInt(finalCount[0].count) - parseInt(availableCount[0].count)
      },
      nextStep: 'Now try: GET /api/rooms or POST /api/bookings'
    });
    
  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      hint: 'Check database connection and permissions'
    });
  }
};

// ✅ EMERGENCY FIX ROUTES
app.get('/api/auto-fix-rooms', handleAutoFixRooms);
app.post('/api/auto-fix-rooms', handleAutoFixRooms);
app.get('/api/create-rooms', handleAutoFixRooms);
app.post('/api/create-rooms', handleAutoFixRooms);
app.get('/api/force-create-rooms', handleAutoFixRooms);
app.post('/api/force-create-rooms', handleAutoFixRooms);

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
    suggestion: 'Visit GET / to see all available endpoints'
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;