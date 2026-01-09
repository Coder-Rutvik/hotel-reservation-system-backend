require('dotenv').config();

console.log('🚀 Starting Hotel Reservation System Backend...');
console.log('===========================================');

// Log environment
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', process.env.PORT || 5000);

// Check if running on Render
const isRender = process.env.RENDER || process.env.DATABASE_URL?.includes('render.com');

if (isRender) {
  console.log('🌐 Hosting Platform: Render.com');
}

// Log database info (masked)
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log('📊 PostgreSQL URL:', maskedUrl);
  console.log('🔒 SSL Enabled:', process.env.PG_SSL === 'true' || isRender ? 'Yes' : 'No');
}

// Validate required environment variables
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
      
      // Use setupDatabaseTables function from database.js
      const { setupDatabaseTables } = require('./src/config/database');
      await setupDatabaseTables();
      
      console.log('✅ Database setup complete');
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

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
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

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Global error handlers
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