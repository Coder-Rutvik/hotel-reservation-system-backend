require('dotenv').config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is required!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
}

const sequelize = require('./src/config/mysql');
const sequelizePostgres = require('./src/config/postgresql');
// Load MySQL models and associations early so controllers see associations
require('./src/models/mysql');
// Load PostgreSQL connection
require('./src/models/postgresql');
const connectMongoDB = require('./src/config/mongodb');
// Export all connections centrally
const dbConnections = require('./src/config/db-connections');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🚀 Starting Hotel Reservation System Backend...');
    console.log('===========================================');
    
    // Connect to MySQL
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');
    
    // Connect to PostgreSQL
    try {
      await sequelizePostgres.authenticate();
      console.log('✅ PostgreSQL connected successfully');
    } catch (postgresError) {
      console.warn('⚠️  PostgreSQL connection failed (continuing with MySQL/MongoDB):', postgresError.message);
    }
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Sync databases (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log('✅ MySQL database synced');
      
      // Sync PostgreSQL if connected
      try {
        const { sequelizePostgres } = require('./src/models/postgresql');
        await sequelizePostgres.sync();
        console.log('✅ PostgreSQL database synced');
      } catch (syncError) {
        console.warn('⚠️  PostgreSQL sync skipped:', syncError.message);
      }
    }
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 MySQL Database: ${process.env.MYSQL_DATABASE}`);
      console.log(`🐘 PostgreSQL Database: ${process.env.POSTGRES_DATABASE}`);
      console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI}`);
      console.log('===========================================');
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🏨 Get All Rooms: http://localhost:${PORT}/api/rooms`);
      console.log(`🔐 Register User: POST http://localhost:${PORT}/api/auth/register`);
      console.log('===========================================');
      console.log('🎉 Backend ready for Unstop Assessment!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();