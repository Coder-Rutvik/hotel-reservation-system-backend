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
  sequelize,
  Sequelize: require('sequelize'),
  
  User,
  Room,
  Booking,
  
  UserPostgres: User,
  RoomPostgres: Room,
  BookingPostgres: Booking
};