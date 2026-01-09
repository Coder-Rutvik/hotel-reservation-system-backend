// src/models/index.js - FINAL VERSION
const { sequelize } = require('../config/database');

// Import models
const User = require('./User');
const Room = require('./Room');
const Booking = require('./Booking');

// Setup associations
User.hasMany(Booking, { 
  foreignKey: 'userId', 
  as: 'bookings' 
});

Booking.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

// Export everything
module.exports = {
  // Database instance
  sequelize,
  Sequelize: require('sequelize'),
  
  // Primary models
  User,
  Room,
  Booking,
  
  // For backward compatibility
  UserPostgres: User,
  RoomPostgres: Room,
  BookingPostgres: Booking
};