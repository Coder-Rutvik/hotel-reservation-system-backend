// src/models/index.js - COMPLETE FIX
const { sequelizePostgres } = require('../config/database');

// Import models
const User = require('./User');
const Room = require('./Room');
const Booking = require('./Booking');

// Initialize models
const UserPostgres = User;
const RoomPostgres = Room;
const BookingPostgres = Booking;

// Define associations
BookingPostgres.belongsTo(UserPostgres, {
  foreignKey: 'userId',
  as: 'user'
});

UserPostgres.hasMany(BookingPostgres, {
  foreignKey: 'userId',
  as: 'bookings'
});

// Sync models (optional - for auto table creation)
const syncModels = async () => {
  try {
    await sequelizePostgres.sync({ alter: true });
    console.log('✅ Models synced with database');
  } catch (error) {
    console.error('❌ Model sync failed:', error.message);
  }
};

// Export everything
module.exports = {
  sequelize: sequelizePostgres,
  Sequelize: require('sequelize'),
  User,
  Room,
  Booking,
  UserPostgres,
  RoomPostgres,
  BookingPostgres,
  syncModels
};