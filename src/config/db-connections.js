// Centralized database connections export
// Use this to access all database connections from anywhere in the project

const postgresql = require('./postgresql');
const connectMongoDB = require('./mongodb');
const mongoose = require('mongoose');

// MySQL is optional - only load if configured
let mysql = null;
try {
  if (process.env.MYSQL_HOST || process.env.MYSQL_DATABASE_URL) {
    mysql = require('./mysql');
  }
} catch (error) {
  console.log('ℹ️  MySQL not configured (optional)');
}

module.exports = {
  mysql,
  postgresql,
  mongodb: mongoose.connection,
  connectMongoDB,

  // Helper function to check all connections
  async checkAllConnections() {
    const status = {
      mysql: { connected: false, error: null },
      postgresql: { connected: false, error: null },
      mongodb: { connected: false, error: null }
    };

    // Check MySQL (if configured)
    if (mysql) {
      try {
        await mysql.authenticate();
        status.mysql.connected = true;
      } catch (error) {
        console.error('MySQL connection check failed:', error.message);
        status.mysql.error = error.message;
      }
    } else {
      status.mysql.error = 'Not configured';
    }

    // Check PostgreSQL (primary database for Render)
    try {
      await postgresql.authenticate();
      status.postgresql.connected = true;
    } catch (error) {
      console.error('PostgreSQL connection check failed:', error.message);
      status.postgresql.error = error.message;
    }

    // Check MongoDB (optional)
    try {
      status.mongodb.connected = mongoose.connection.readyState === 1;
      if (!status.mongodb.connected) {
        status.mongodb.error = `State: ${mongoose.connection.readyState}`;
      }
    } catch (error) {
      console.error('MongoDB connection check failed:', error.message);
      status.mongodb.error = error.message;
    }

    return status;
  },

  // Helper to close all connections gracefully
  async closeAllConnections() {
    const results = [];

    // Close MySQL if connected
    if (mysql) {
      try {
        await mysql.close();
        results.push({ db: 'MySQL', status: 'closed' });
      } catch (error) {
        results.push({ db: 'MySQL', status: 'error', error: error.message });
      }
    }

    // Close PostgreSQL
    try {
      await postgresql.close();
      results.push({ db: 'PostgreSQL', status: 'closed' });
    } catch (error) {
      results.push({ db: 'PostgreSQL', status: 'error', error: error.message });
    }

    // Close MongoDB if connected
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        results.push({ db: 'MongoDB', status: 'closed' });
      }
    } catch (error) {
      results.push({ db: 'MongoDB', status: 'error', error: error.message });
    }

    return results;
  }
};