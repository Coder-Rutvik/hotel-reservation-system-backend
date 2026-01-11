const { Room, Booking } = require('../models');
const { Sequelize, Op } = require('sequelize');

// Helper to generate 97 rooms structure
const generate97Rooms = () => {
  const rooms = [];
  // Floors 1-9: 10 rooms each
  for (let floor = 1; floor <= 9; floor++) {
    for (let position = 1; position <= 10; position++) {
      rooms.push({
        roomNumber: (floor * 100) + position,
        floor: floor,
        position: position,
        roomType: floor >= 8 ? 'deluxe' : 'standard',
        status: 'not-booked',
        isAvailable: true,
        basePrice: floor >= 8 ? 150.00 : 100.00
      });
    }
  }
  // Floor 10: 7 rooms
  for (let position = 1; position <= 7; position++) {
    rooms.push({
      roomNumber: 1000 + position,
      floor: 10,
      position: position,
      roomType: 'suite',
      status: 'not-booked',
      isAvailable: true,
      basePrice: 200.00
    });
  }
  return rooms;
};

// @desc    Create sample rooms
// @route   POST /api/rooms/create-sample
// @access  Public
const createSampleRooms = async (req, res) => {
  try {
    console.log('🏨 Creating sample rooms...');

    // Delete existing rooms
    await Room.destroy({ where: {} });

    const roomsToCreate = [];

    // Floors 1-9: 10 rooms each
    for (let floor = 1; floor <= 9; floor++) {
      for (let position = 1; position <= 10; position++) {
        roomsToCreate.push({
          roomNumber: (floor * 100) + position,
          floor: floor,
          position: position,
          roomType: floor >= 8 ? 'deluxe' : 'standard',
          status: 'not-booked',
          isAvailable: true,
          basePrice: floor >= 8 ? 150.00 : 100.00
        });
      }
    }

    // Floor 10: 7 rooms
    for (let position = 1; position <= 7; position++) {
      roomsToCreate.push({
        roomNumber: 1000 + position,
        floor: 10,
        position: position,
        roomType: 'suite',
        status: 'not-booked',
        isAvailable: true,
        basePrice: 200.00
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

    // If no rooms, create them automatically (Self-Healing)
    if (rooms.length === 0) {
      console.log('⚠️ No rooms found on GET /api/rooms. Triggering auto-seed...');
      // Re-use seed functionality but internally
      const seedReq = { body: {} };
      const seedRes = {
        json: (data) => {
          // After seeding, return the data as if it was a normal GET
          return res.json({
            success: true,
            count: data.data.totalRooms,
            data: data.data.rooms // Note: seedRooms returns list of IDs, we might want objects.
            // Actually, safer to just return success and ask frontend to reload, 
            // OR fetch again. But let's fetch again for smooth UX.
          });
        },
        status: (code) => ({ json: (data) => res.status(code).json(data) })
      };

      // Better approach: Call seed logic directly then re-fetch
      await require('../models').Room.bulkCreate(
        generate97Rooms() // We need to extract generation logic to avoid code duplication
      );

      // Fetch again
      const newRooms = await Room.findAll({
        order: [['floor', 'ASC'], ['position', 'ASC']]
      });

      return res.json({
        success: true,
        count: newRooms.length,
        message: 'Rooms were auto-generated',
        data: newRooms
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

// @desc    Get room by floor
// @route   GET /api/rooms/floor/:floorNumber
// @access  Public
const getRoomsByFloor = async (req, res) => {
  try {
    const { floorNumber } = req.params;

    const rooms = await Room.findAll({
      where: { floor: floorNumber },
      order: [['position', 'ASC']]
    });

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No rooms found on floor ${floorNumber}`
      });
    }

    res.json({
      success: true,
      count: rooms.length,
      floor: floorNumber,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms by floor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get room by number
// @route   GET /api/rooms/number/:roomNumber
// @access  Public
const getRoomByNumber = async (req, res) => {
  try {
    const { roomNumber } = req.params;

    const room = await Room.findOne({
      where: { roomNumber }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room ${roomNumber} not found`
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get room types
// @route   GET /api/rooms/types
// @access  Public
const getRoomTypes = async (req, res) => {
  try {
    const roomTypes = await Room.findAll({
      attributes: [
        'roomType',
        [Sequelize.fn('COUNT', Sequelize.col('room_id')), 'count'],
        [Sequelize.fn('AVG', Sequelize.col('base_price')), 'avgPrice'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN is_available = true THEN 1 ELSE 0 END')), 'available']
      ],
      group: ['roomType'],
      raw: true
    });

    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search rooms
// @route   GET /api/rooms/search
// @access  Public
const searchRooms = async (req, res) => {
  try {
    const { floor, roomType, minPrice, maxPrice, available } = req.query;

    let where = {};

    if (floor) where.floor = floor;
    if (roomType) where.roomType = roomType;
    if (available !== undefined) where.isAvailable = available === 'true';

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice[Op.gte] = minPrice;
      if (maxPrice) where.basePrice[Op.lte] = maxPrice;
    }

    const rooms = await Room.findAll({
      where,
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Search rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Generate random occupancy
// @route   POST /api/rooms/random-occupancy
// @access  Private
const generateRandomOccupancy = async (req, res) => {
  try {
    const allRooms = await Room.findAll();
    const occupancyRate = 0.3 + Math.random() * 0.3;
    const numToBook = Math.floor(allRooms.length * occupancyRate);
    const shuffled = allRooms.sort(() => 0.5 - Math.random());

    for (const room of shuffled.slice(0, numToBook)) {
      room.isAvailable = false;
      room.status = 'booked';
      await room.save();
    }

    for (const room of shuffled.slice(numToBook)) {
      room.isAvailable = true;
      room.status = 'not-booked';
      await room.save();
    }

    res.json({
      success: true,
      message: `Random occupancy generated: ${numToBook} rooms occupied`,
      data: {
        totalRooms: allRooms.length,
        occupiedRooms: numToBook,
        availableRooms: allRooms.length - numToBook,
        occupancyRate: (occupancyRate * 100).toFixed(1) + '%'
      }
    });
  } catch (error) {
    console.error('Generate random occupancy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset all bookings and make all rooms available (and fix room count if needed)
// @route   POST /api/rooms/reset-all
// @access  Private
const resetAllBookings = async (req, res) => {
  try {
    // 1. Cancel all confirmed bookings
    await Booking.update(
      { status: 'cancelled' },
      { where: { status: 'confirmed' } }
    );

    // 2. Make all rooms available
    await Room.update(
      { isAvailable: true, status: 'not-booked' },
      { where: {} }
    );

    // 3. AUTO-FIX: Check if we have exactly 97 rooms
    const totalRooms = await Room.count();

    if (totalRooms !== 97) {
      console.log(`⚠️ Reset detected ${totalRooms} rooms. Enforcing 97 rooms...`);
      await seedRooms(req, res); // Re-use seed logic to fix it
      return; // seedRooms handles the response
    }

    res.json({
      success: true,
      message: 'All bookings reset and rooms made available',
      data: {
        totalRooms,
        availableRooms: totalRooms
      }
    });
  } catch (error) {
    console.error('Reset all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    SEED ROOMS (EMERGENCY FIX)
// @route   POST /api/rooms/seed-rooms
// @access  Private
const seedRooms = async (req, res) => {
  try {
    console.log('🏨 Seeding rooms...');

    // Delete all existing rooms
    await Room.destroy({ where: {} });

    const roomsToCreate = [];

    // Floors 1-9: 10 rooms each
    for (let floor = 1; floor <= 9; floor++) {
      for (let position = 1; position <= 10; position++) {
        roomsToCreate.push({
          roomNumber: (floor * 100) + position,
          floor: floor,
          position: position,
          roomType: floor >= 8 ? 'deluxe' : 'standard',
          status: 'not-booked',
          isAvailable: true,
          basePrice: floor >= 8 ? 150.00 : 100.00
        });
      }
    }

    // Floor 10: 7 rooms
    for (let position = 1; position <= 7; position++) {
      roomsToCreate.push({
        roomNumber: 1000 + position,
        floor: 10,
        position: position,
        roomType: 'suite',
        status: 'not-booked',
        isAvailable: true,
        basePrice: 200.00
      });
    }

    await Room.bulkCreate(roomsToCreate);

    res.json({
      success: true,
      message: `Successfully seeded ${roomsToCreate.length} rooms`,
      data: {
        totalRooms: roomsToCreate.length,
        rooms: roomsToCreate.map(r => r.roomNumber)
      }
    });
  } catch (error) {
    console.error('Seed rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createSampleRooms,
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