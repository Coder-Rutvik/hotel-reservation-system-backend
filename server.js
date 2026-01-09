require('dotenv').config();

console.log('🚀 Starting Hotel Reservation System Backend...');
console.log('===========================================');

// Log environment details
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', process.env.PORT || 5000);

// Log database connection (masked for security)
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:****@'
  );
  console.log('📊 PostgreSQL URL:', maskedUrl);
}

// Import the Express app
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Public URL: https://hotel-reservation-system-backend-6nf6.onrender.com`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏠 Home page: http://localhost:${PORT}/`);
  console.log('===========================================');
  console.log('🎉 Backend is ready and accepting requests!');
  console.log('===========================================');
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 ${signal} received. Starting graceful shutdown...`);
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    const dbConnections = require('./src/config/database');
    dbConnections.close()
      .then(result => {
        if (result.closed) {
          console.log('✅ Database connections closed');
        } else {
          console.log('⚠️ Database connections may not have closed properly');
        }
        console.log('👋 Shutdown complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Error closing databases:', error);
        process.exit(1);
      });
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  
  // Log the error but don't crash in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', reason?.stack || 'No stack trace');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  
  // Give time for logging before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use`);
    console.error('💡 Try changing the PORT in .env file');
  }
  
  process.exit(1);
});