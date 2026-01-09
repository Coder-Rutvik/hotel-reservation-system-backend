const { Room, Booking } = require('../models');
const { Sequelize, Op } = require('sequelize');

// @desc    Create sample rooms
// @route   POST /api/rooms/create-sample
// @access  Public
const createSampleRooms = async (req, res) => {
  try {
    console.log('🏨 Creating sample rooms...');
    
    // Delete existing rooms
    await Room.destroy({ where: {} });
    
    const roomsToCreate = [];
    
    // Create 20 sample rooms (for quick testing)
    for (let i = 1; i <= 10; i++) {
      roomsToCreate.push({
        roomNumber: 100 + i,
        floor: 1,
        position: i,
        roomType: i <= 7 ? 'standard' : 'deluxe',
        isAvailable: true,
        basePrice: i <= 7 ? 100.00 : 150.00
      });
    }
    
    for (let i = 1; i <= 10; i++) {
      roomsToCreate.push({
        roomNumber: 200 + i,
        floor: 2,
        position: i,
        roomType: 'standard',
        isAvailable: true,
        basePrice: 100.00
      });
    }
    
    await Room.bulkCreate(roomsToCreate);
    
    res.json({
      success: true,
      message: `Successfully created ${roomsToCreate.length} sample rooms`,
      data: {
        totalRooms: roomsToCreate.length,
        rooms: roomsToCreate.map(r => r.roomNumber)
      }
    });
  } catch (error) {
    console.error('Create sample rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rooms'
    });
  }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    // If no rooms, create sample ones
    if (rooms.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No rooms found. Use POST /api/rooms/create-sample to create rooms',
        data: []
      });
    }

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available rooms
// @route   GET /api/rooms/available
// @access  Public
const getAvailableRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { isAvailable: true },
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ... rest of your existing roomController.js functions remain the same
// (getRoomsByFloor, getRoomByNumber, getRoomTypes, searchRooms, 
// generateRandomOccupancy, resetAllBookings, seedRooms)

// Add createSampleRooms to exports
module.exports = {
  createSampleRooms, // ADD THIS
  getAllRooms,
  getAvailableRooms,
  getRoomsByFloor,
  getRoomByNumber,
  getRoomTypes,
  searchRooms,
  generateRandomOccupancy,
  resetAllBookings,
  seedRooms
};