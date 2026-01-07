require('dotenv').config();

console.log('🚀 Starting Hotel Reservation System Backend...');
console.log('===========================================');

// Log environment (mask sensitive info)
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', process.env.PORT || 10000);
console.log('🌐 CORS Origin:', process.env.CORS_ORIGIN || 'Not set');

// Log database URLs (masked for security)
if (process.env.DATABASE_URL) {
  const maskedPgUrl = process.env.DATABASE_URL
    .replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log('📊 PostgreSQL URL:', maskedPgUrl);
}

if (process.env.MONGODB_URI) {
  const maskedMongoUrl = process.env.MONGODB_URI
    .replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log('📊 MongoDB URL:', maskedMongoUrl);
}

// Validate required environment variables for production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:', missingVars);
    console.error('💡 Please set these in your Render dashboard environment variables');
    process.exit(1);
  }
}

const app = require('./src/app');

const PORT = process.env.PORT || 10000;

// Retry connection function with exponential backoff
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

// Initialize databases asynchronously (won't block server startup)
async function initializeDatabases() {
  console.log('\n🔄 Initializing databases...');
  
  // PostgreSQL (Primary - Required)
  try {
    const { sequelizePostgres } = require('./src/config/postgresql');
    
    const connected = await retryConnection(
      async () => {
        await sequelizePostgres.authenticate();
      },
      'PostgreSQL',
      3,
      3000
    );
    
    if (connected) {
      console.log('🔄 Syncing PostgreSQL models...');
      
      // Safe sync for production
      if (process.env.NODE_ENV === 'development') {
        await sequelizePostgres.sync({ alter: false }); // Safer: don't alter existing tables
        console.log('✅ PostgreSQL models synced (development mode)');
      } else {
        // In production, only authenticate, don't auto-sync
        console.log('ℹ️  Production: PostgreSQL connected, skipping auto-sync');
        
        // Try to list tables
        try {
          const [results] = await sequelizePostgres.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
          `);
          console.log('📋 PostgreSQL tables:', results.map(r => r.table_name).join(', ') || 'No tables found');
        } catch (queryErr) {
          console.warn('⚠️  Could not list PostgreSQL tables:', queryErr.message);
        }
      }
    } else {
      console.warn('⚠️  PostgreSQL not connected - some features may not work');
    }
  } catch (postgresError) {
    console.error('❌ PostgreSQL initialization error:', postgresError.message);
    
    // Don't crash in production if PostgreSQL fails
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Continuing without PostgreSQL in production mode');
    }
  }
  
  // MongoDB (Optional - for logs)
  try {
    const connectMongoDB = require('./src/config/mongodb');
    
    const mongoConnected = await retryConnection(
      async () => {
        await connectMongoDB();
      },
      'MongoDB',
      2,
      2000
    );
    
    if (mongoConnected) {
      console.log('✅ MongoDB ready for logging');
    } else {
      console.warn('⚠️  MongoDB not connected - logs will not be stored');
    }
  } catch (mongoError) {
    console.warn('⚠️  MongoDB connection failed (optional, continuing):', mongoError.message);
  }
  
  console.log('✅ Database initialization complete\n');
}

// Health endpoint ping (self-check)
async function selfHealthCheck() {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/health`, {
      timeout: 5000
    }).catch(() => null);
    
    if (response && response.ok) {
      console.log('✅ Server self-health check passed');
    } else {
      console.log('ℹ️  Server is running but health endpoint not accessible yet');
    }
  } catch (error) {
    // Ignore - server might still be starting
  }
}

// Start server and initialize databases
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Express server...');
    
    // Start server immediately
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Express server running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🔍 Health endpoint: http://localhost:${PORT}/api/health`);
      console.log('===========================================\n');
      
      // Perform self-health check after server starts
      setTimeout(selfHealthCheck, 2000);
    });
    
    // Initialize databases in background
    setTimeout(initializeDatabases, 1000);
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 ${signal} received. Shutting down gracefully...`);
      
      // Close server
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        // Close database connections
        try {
          const dbConnections = require('./src/config/db-connections');
          const closeResults = await dbConnections.closeAllConnections();
          console.log('✅ Database connections closed:', closeResults);
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
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack || 'No stack trace');
  
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Exiting due to unhandled rejection in non-production mode');
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Graceful shutdown
  setTimeout(() => {
    console.error('⚠️  Forcing exit after uncaught exception');
    process.exit(1);
  }, 1000);
});

// Start the application
startServer();