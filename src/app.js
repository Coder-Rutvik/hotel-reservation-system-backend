const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import routes
// const authRoutes = require('./routes/authRoutes'); // REMOVED
const bookingRoutes = require('./routes/bookingRoutes');
const roomRoutes = require('./routes/roomRoutes');
// const adminRoutes = require('./routes/adminRoutes'); // REMOVED

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/logger');

// DB connections (Postgres-only)
const dbConnections = require('./config/database');

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins (dynamically reflects request origin)
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
    return req.path === '/api/health';
  }
});

app.use('/api/', limiter);

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom logger middleware (Postgres-only setup)
app.use(loggerMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏨 Hotel Reservation System API (No Auth)',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      rooms: {
        all: 'GET /api/rooms',
        available: 'GET /api/rooms/available',
        resetAll: 'POST /api/rooms/reset-all'
      },
      bookings: {
        create: 'POST /api/bookings',
        list: 'GET /api/bookings'
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await dbConnections.checkAllConnections();
    res.status(200).json({
      status: 'ok',
      service: 'Hotel Reservation API',
      database: dbStatus.postgresql.connected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// DB diagnostic endpoint
app.get('/api/db-test', async (req, res) => {
  const { sequelize } = require('./config/database');
  try {
    const [result] = await sequelize.query('SELECT 1+1 AS result');
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ EMERGENCY FIX HANDLER FUNCTIONS
// ✅ EMERGENCY FIX HANDLER FUNCTIONS
const handleAutoFixRooms = async (req, res) => {
  try {
    const { sequelize } = require('./config/database');

    console.log('🔄 AUTO-FIX: Checking and creating rooms (97 Room Standard)...');

    // 1. Check if rooms table exists
    const [tables] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms'
      ) as table_exists
    `);

    let message = '';

    if (!tables[0].table_exists) {
      console.log('📝 Creating rooms table...');
      await sequelize.query(`
          CREATE TABLE rooms (
            room_id SERIAL PRIMARY KEY,
            room_number INTEGER UNIQUE NOT NULL,
            floor INTEGER NOT NULL,
            position INTEGER NOT NULL,
            room_type VARCHAR(20) DEFAULT 'standard',
            status VARCHAR(20) DEFAULT 'not-booked',
            is_available BOOLEAN DEFAULT true,
            base_price DECIMAL(10,2) DEFAULT 100.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      message += 'Created rooms table. ';
    }

    // 2. Check room count
    const [roomCount] = await sequelize.query('SELECT COUNT(*) FROM rooms');
    const count = parseInt(roomCount[0].count);

    // Optimization: If count is not 97, we re-seed to ensure compliance
    if (count !== 97) {
      console.log(`🏨 Found ${count} rooms. Enforcing 97 rooms standard...`);

      // Clear existing if any (safe reset)
      if (count > 0) {
        await sequelize.query('DELETE FROM rooms');
        message += `Cleared ${count} non-compliant rooms. `;
      }

      const rooms = [];

      // Floors 1-9: 10 rooms each
      for (let floor = 1; floor <= 9; floor++) {
        for (let position = 1; position <= 10; position++) {
          rooms.push({
            room_number: (floor * 100) + position,
            floor: floor,
            position: position,
            room_type: floor >= 8 ? 'deluxe' : 'standard',
            is_available: true,
            base_price: floor >= 8 ? 150.00 : 100.00
          });
        }
      }

      // Floor 10: 7 rooms
      for (let position = 1; position <= 7; position++) {
        rooms.push({
          room_number: 1000 + position,
          floor: 10,
          position: position,
          room_type: 'suite',
          is_available: true,
          base_price: 200.00
        });
      }

      for (const room of rooms) {
        await sequelize.query(`
          INSERT INTO rooms (room_number, floor, position, room_type, status, is_available, base_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (room_number) DO NOTHING
        `, [room.room_number, room.floor, room.position, room.room_type, 'not-booked', room.is_available, room.base_price]);
      }

      message += 'Created 97 standard rooms. ';
    }

    // 3. Final count
    const [finalCount] = await sequelize.query('SELECT COUNT(*) FROM rooms');
    const [availableCount] = await sequelize.query('SELECT COUNT(*) FROM rooms WHERE is_available = true');

    res.json({
      success: true,
      message: message || 'Rooms are already compliant (97 rooms)',
      rooms: {
        total: parseInt(finalCount[0].count),
        available: parseInt(availableCount[0].count)
      },
      nextStep: 'Now try: GET /api/rooms or POST /api/bookings'
    });

  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      sql: error.sql
    });
  }
};

const handleForceCreateRooms = async (req, res) => {
  try {
    const { sequelize } = require('./config/database');

    console.log('💥 FORCE CREATING 97 ROOMS...');

    // 1. Drop and recreate table
    await sequelize.query('DROP TABLE IF EXISTS rooms CASCADE');

    await sequelize.query(`
      CREATE TABLE rooms (
        room_id SERIAL PRIMARY KEY,
        room_number INTEGER UNIQUE NOT NULL,
        floor INTEGER NOT NULL,
        position INTEGER NOT NULL,
        room_type VARCHAR(20) DEFAULT 'standard',
        status VARCHAR(20) DEFAULT 'not-booked',
        is_available BOOLEAN DEFAULT true,
        base_price DECIMAL(10,2) DEFAULT 100.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Add 97 rooms
    const rooms = [];

    // Floors 1-9: 10 rooms each
    for (let floor = 1; floor <= 9; floor++) {
      for (let position = 1; position <= 10; position++) {
        rooms.push({
          room_number: (floor * 100) + position,
          floor: floor,
          position: position,
          room_type: floor >= 8 ? 'deluxe' : 'standard',
          is_available: true,
          base_price: floor >= 8 ? 150.00 : 100.00
        });
      }
    }

    // Floor 10: 7 rooms
    for (let position = 1; position <= 7; position++) {
      rooms.push({
        room_number: 1000 + position,
        floor: 10,
        position: position,
        room_type: 'suite',
        is_available: true,
        base_price: 200.00
      });
    }

    // 3. Insert all rooms
    for (const room of rooms) {
      await sequelize.query(`
        INSERT INTO rooms (room_number, floor, position, room_type, status, is_available, base_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [room.room_number, room.floor, room.position, room.room_type, 'not-booked', room.is_available, room.base_price]);
    }

    const [count] = await sequelize.query('SELECT COUNT(*) FROM rooms');

    res.json({
      success: true,
      message: `FORCE CREATED ${count[0].count} ROOMS SUCCESSFULLY`,
      rooms: {
        total: parseInt(count[0].count),
        floors: '1-10',
        specification: 'Floors 1-9: 10 rooms, Floor 10: 7 rooms'
      },
      action: 'APPLICATION IS NOW 100% READY FOR BOOKINGS!'
    });

  } catch (error) {
    console.error('Force create error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ NEW: Quick Room Creation Endpoint (Legacy support updated)
const handleQuickCreateRooms = async (req, res) => {
  // Alias to handleAutoFixRooms for consistency
  return handleAutoFixRooms(req, res);
};

// ✅ EMERGENCY FIX ROUTES
app.get('/api/auto-fix-rooms', handleAutoFixRooms);
app.post('/api/auto-fix-rooms', handleAutoFixRooms);

app.get('/api/force-create-rooms', handleForceCreateRooms);
app.post('/api/force-create-rooms', handleForceCreateRooms);

// ✅ NEW: Quick room creation endpoint
app.get('/api/create-rooms', handleQuickCreateRooms);
app.post('/api/create-rooms', handleQuickCreateRooms);

// API Routes
// app.use('/api/auth', authRoutes); // REMOVED
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
// app.use('/api/admin', adminRoutes); // REMOVED

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET    /',
      'GET    /api/health',
      'GET    /api/db-test',
      'GET/POST /api/auto-fix-rooms (EMERGENCY)',
      'GET/POST /api/force-create-rooms (EMERGENCY)',
      'GET/POST /api/create-rooms (QUICK FIX)',
      'GET    /api/rooms',
      'GET    /api/rooms/available',
      'POST   /api/bookings',
      'GET    /api/bookings'
    ]
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;