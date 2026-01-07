require('dotenv').config();

// Validate required environment variables for production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:', missingVars);
    console.error('Please set these in your Render dashboard under Environment');
    process.exit(1);
  }
}

// Log DATABASE_URL format (without password) for debugging
if (process.env.DATABASE_URL) {
  const urlWithoutPassword = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log('📊 DATABASE_URL format:', urlWithoutPassword);
}

const sequelizePostgres = require('./src/config/postgresql');
const connectMongoDB = require('./src/config/mongodb');
const app = require('./src/app');
const dbConnections = require('./src/config/db-connections');

const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    console.log('🚀 Starting Hotel Reservation System Backend on Render...');
    console.log('===========================================');
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Port: ${PORT}`);

    // Connect to PostgreSQL (Primary database for Render)
    let postgresConnected = false;
    try {
      console.log('🔄 Attempting PostgreSQL connection...');
      await sequelizePostgres.authenticate();
      console.log('✅ PostgreSQL connected successfully');
      postgresConnected = true;

      // Sync tables - Create/update schema
      console.log('🔄 Syncing PostgreSQL tables...');
      const { sequelizePostgres: seqPg } = require('./src/models/postgresql');
      
      // In production, use alter: true to update schema safely
      // In development, you can use force: true to recreate tables
      const syncOptions = process.env.NODE_ENV === 'production' 
        ? { alter: true } 
        : { alter: true };
      
      await seqPg.sync(syncOptions);
      console.log('✅ PostgreSQL tables synced successfully');
      
      // Verify tables exist
      try {
        const [results] = await seqPg.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        if (results.length > 0) {
          console.log('📋 Available tables:', results.map(r => r.table_name).join(', '));
        } else {
          console.log('⚠️  No tables found - they will be created on first use');
        }
      } catch (queryError) {
        console.log('ℹ️  Could not verify tables:', queryError.message);
      }
      
    } catch (postgresError) {
      console.error('❌ PostgreSQL connection error:', postgresError.message);
      
      // Log more details for debugging
      if (postgresError.original) {
        console.error('Original error:', postgresError.original.message);
      }
      
      // In production, PostgreSQL is critical, so exit
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 Cannot start without PostgreSQL in production');
        console.error('Check your DATABASE_URL in Render environment variables');
        process.exit(1);
      } else {
        console.log('⚠️  Continuing without PostgreSQL (development mode)...');
      }
    }

    // Connect to MongoDB (Optional)
    try {
      console.log('🔄 Attempting MongoDB connection...');
      await connectMongoDB();
      console.log('✅ MongoDB connected successfully');
    } catch (mongoError) {
      console.warn('⚠️  MongoDB connection failed (optional):', mongoError.message);
      console.warn('Application will run without MongoDB features');
    }

    // Start the Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('===========================================');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🐘 PostgreSQL: ${postgresConnected ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
      console.log('===========================================');
      console.log('🎉 Backend ready on Render!');
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📚 API Base: http://localhost:${PORT}/api`);
      console.log('===========================================');
    });

    // Set server timeout (important for Render free tier)
    server.timeout = 60000; // 60 seconds
    server.keepAliveTimeout = 65000; // Slightly longer than timeout
    server.headersTimeout = 66000; // Slightly longer than keepAlive

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Stack:', err.stack);
  // In production, log but don't exit immediately
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Graceful shutdown on SIGTERM (Render sends this when redeploying)
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  try {
    const results = await dbConnections.closeAllConnections();
    console.log('✅ Database connections closed:', results);
  } catch (error) {
    console.error('❌ Error closing connections:', error);
  }
  process.exit(0);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  try {
    const results = await dbConnections.closeAllConnections();
    console.log('✅ Database connections closed:', results);
  } catch (error) {
    console.error('❌ Error closing connections:', error);
  }
  process.exit(0);
});

// Start the server
startServer();