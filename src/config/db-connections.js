// Centralized database connections export
// Use this to access all database connections from anywhere in the project

const mysql = require('./mysql');
const postgresql = require('./postgresql');
const connectMongoDB = require('./mongodb');
const mongoose = require('mongoose');

module.exports = {
  mysql,
  postgresql,
  mongodb: mongoose.connection,
  connectMongoDB,
  
  // Helper function to check all connections
  async checkAllConnections() {
    const status = {
      mysql: false,
      postgresql: false,
      mongodb: false
    };

    try {
      await mysql.authenticate();
      status.mysql = true;
    } catch (error) {
      console.error('MySQL connection check failed:', error.message);
    }

    try {
      await postgresql.authenticate();
      status.postgresql = true;
    } catch (error) {
      console.error('PostgreSQL connection check failed:', error.message);
    }

    try {
      status.mongodb = mongoose.connection.readyState === 1;
    } catch (error) {
      console.error('MongoDB connection check failed:', error.message);
    }

    return status;
  }
};

