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
  const requiredVars = ['JWT_SECRET'];
  if (!process.env.DATABASE_URL) {
    requiredVars.push('POSTGRES_HOST', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD');
  }
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:', missingVars);
    console.error('💡 For Render: Set DATABASE_URL, JWT_SECRET, PG_SSL=true');
    process.exit(1);
  }
}

const app = require('./src/app');
const PORT = process.env.PORT || 5000;

// Function to create rooms automatically
const createRoomsAutomatically = async () => {
  try {
    const { sequelize } = require('./src/config/database');
    
    console.log('🔍 Checking if rooms exist...');
    
    // Check if rooms table exists
    try {
      await sequelize.query('SELECT 1 FROM rooms LIMIT 1');
    } catch (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('🏨 Rooms table not found. Creating...');
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
      }
    }
    
    // Check room count
    const [roomCount] = await sequelize.query('SELECT COUNT(*) FROM rooms');
    const count = parseInt(roomCount[0].count);
    
    if (count === 0) {
      console.log('🏨 No rooms found. Creating 97 rooms...');
      
      // CREATE 20 SAMPLE ROOMS ONLY - SIMPLE VERSION
      console.log('Creating 20 sample rooms...');
      
      // Simple query without parameters
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
      
      console.log('✅ Created 20 sample rooms');
    } else {
      console.log(`✅ Found ${count} rooms`);
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