require('dotenv').config();

console.log('🚀 Starting Hotel Reservation System Backend...');
console.log('===========================================');

console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', process.env.PORT || 5000);

const isRender = process.env.RENDER || process.env.DATABASE_URL?.includes('render.com');

if (isRender) {
  console.log('🌐 Hosting Platform: Render.com');
}

if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log('📊 PostgreSQL URL:', maskedUrl);
  console.log('🔒 SSL Enabled:', process.env.PG_SSL === 'true' || isRender ? 'Yes' : 'No');
}

if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['DATABASE_URL'];
  if (!process.env.DATABASE_URL) {
    requiredVars.push('POSTGRES_HOST', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD');
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:', missingVars);
    console.error('💡 For Render: Set DATABASE_URL, PG_SSL=true');
    process.exit(1);
  }
}

const app = require('./src/app');
const PORT = process.env.PORT || 5000;

// Function to create rooms automatically
// Function to create rooms automatically
const createRoomsAutomatically = async () => {
  try {
    // Import Room model directly
    const { Room } = require('./src/models');

    console.log('🔍 Checking if rooms exist using Model...');

    // 1. Check count using Model
    const count = await Room.count();

    // 2. If count is not 97, re-seed
    if (count !== 97) {
      console.log(`🏨 Found ${count} rooms. Enforcing 97 rooms standard (Assessment Compliant)...`);

      // Clear existing if any (safe reset)
      if (count > 0) {
        await Room.destroy({ where: {} });
        console.log(`🧹 Cleared ${count} non-compliant rooms.`);
      }

      const rooms = [];

      // Floors 1-9: 10 rooms each
      for (let floor = 1; floor <= 9; floor++) {
        for (let position = 1; position <= 10; position++) {
          rooms.push({
            roomNumber: (floor * 100) + position,
            floor: floor,
            position: position,
            roomType: floor >= 8 ? 'deluxe' : 'standard',
            status: 'not-booked',
            isAvailable: true,
            basePrice: floor >= 8 ? 150.00 : 100.00
          });
        }
      }

      // Floor 10: 7 rooms
      for (let position = 1; position <= 7; position++) {
        rooms.push({
          roomNumber: 1000 + position,
          floor: 10,
          position: position,
          roomType: 'suite',
          status: 'not-booked',
          isAvailable: true,
          basePrice: 200.00
        });
      }

      // Bulk create is much faster and cleaner
      await Room.bulkCreate(rooms);
      console.log('✅ Created 97 rooms successfully (1-97 structure)');
    } else {
      console.log('✅ Rooms are compliant (97 rooms found)');
    }
  } catch (error) {
    console.error('❌ Room creation failed:', error.message);
  }
};

// Retry connection function
async function retryConnection(fn, name, maxAttempts = 3, baseDelay = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 [${name}] Attempt ${attempt}/${maxAttempts}...`);
      await fn();
      console.log(`✅ [${name}] Connected successfully`);
      return true;
    } catch (error) {
      lastError = error;
      console.error(`❌ [${name}] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ [${name}] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ [${name}] All ${maxAttempts} attempts failed`);
  return false;
}

// Initialize database
async function initializeDatabase() {
  console.log('\n🔄 Initializing database...');

  try {
    const { sequelize } = require('./src/config/database');

    if (!sequelize || typeof sequelize.authenticate !== 'function') {
      throw new Error('PostgreSQL client is not available');
    }

    const connected = await retryConnection(
      async () => {
        await sequelize.authenticate();
      },
      'PostgreSQL',
      3,
      3000
    );

    if (connected) {
      console.log('🔄 Setting up database tables...');

      const { setupDatabaseTables } = require('./src/config/database');
      await setupDatabaseTables();

      console.log('✅ Database setup complete');

      // Create rooms after database setup
      await createRoomsAutomatically();
    } else {
      console.warn('⚠️ PostgreSQL not connected - running in limited mode');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);

    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Continuing without database in production mode');
    } else {
      throw error;
    }
  }

  console.log('✅ Database initialization complete\n');
}

// Start server
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Express server...');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Express server running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🔍 Health endpoint: http://localhost:${PORT}/api/health`);
      console.log('===========================================\n');

      // Initialize database in background
      setTimeout(initializeDatabase, 1000);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 ${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('✅ HTTP server closed');

        try {
          const { closeAllConnections } = require('./src/config/database');
          await closeAllConnections();
          console.log('✅ Database connections closed');
        } catch (dbError) {
          console.error('❌ Error closing databases:', dbError.message);
        }

        console.log('👋 Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

startServer();