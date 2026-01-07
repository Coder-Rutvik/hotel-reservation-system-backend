const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set, skipping MongoDB connection');
      return null;
    }

    // Log connection attempt (masked URI)
    const maskedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`🔗 Attempting MongoDB connection to: ${maskedUri}`);

    const options = {
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 5,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Don't crash the app if MongoDB fails
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Continuing without MongoDB connection');
      return null;
    }
    throw error;
  }
};

module.exports = connectMongoDB;