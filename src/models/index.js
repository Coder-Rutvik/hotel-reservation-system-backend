// src/models/index.js - FINAL VERSION
const { sequelize } = require('../config/database');

// Import models
const Room = require('./Room');
const Booking = require('./Booking');

// Export everything
module.exports = {
  sequelize,
  Sequelize: require('sequelize'),

  Room,
  Booking,

  RoomPostgres: Room,
  BookingPostgres: Booking
};