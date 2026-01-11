const { Booking, Room } = require('../models');
const { Op } = require('sequelize');
const algorithmService = require('../services/algorithmService');

// @desc    Book rooms
// @route   POST /api/bookings
const bookRooms = async (req, res) => {
  try {
    const { numRooms, checkInDate, checkOutDate } = req.body;

    console.log('📅 Booking attempt:', { numRooms, checkInDate, checkOutDate });

    // 1. Validation
    if (!numRooms || numRooms < 1 || numRooms > 5) {
      return res.status(400).json({
        success: false,
        message: 'Number of rooms must be between 1 and 5'
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide check-in and check-out dates'
      });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // 2. Fetch available rooms
    const allAvailableRooms = await Room.findAll({
      where: { isAvailable: true },
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    if (allAvailableRooms.length < numRooms) {
      return res.status(400).json({
        success: false,
        message: `Not enough rooms available. (Requested: ${numRooms}, Available: ${allAvailableRooms.length})`
      });
    }

    // 3. Find optimal rooms using AlgorithmService
    const roomsByFloor = [];
    for (let f = 1; f <= 10; f++) {
      const floorRooms = allAvailableRooms.filter(r => r.floor === f);
      if (floorRooms.length > 0) {
        roomsByFloor.push(floorRooms);
      }
    }

    const optimalResult = await algorithmService.findOptimalRooms(roomsByFloor, numRooms);

    if (!optimalResult) {
      return res.status(400).json({
        success: false,
        message: 'Could not find an optimal combination of rooms.'
      });
    }

    const selectedRooms = optimalResult.rooms;
    const roomNumbers = selectedRooms.map(room => room.roomNumber);
    const travelTime = optimalResult.travelTime;

    // 4. Calculate total price
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalPrice = 0;
    selectedRooms.forEach(room => {
      let pricePerNight = parseFloat(room.basePrice);
      const checkInDay = checkIn.getDay();
      if (checkInDay === 5 || checkInDay === 6) {
        pricePerNight *= 1.2;
      }
      totalPrice += pricePerNight * nights;
    });

    totalPrice = parseFloat(totalPrice.toFixed(2));

    // 5. Create booking record
    console.log('💾 Creating booking record...');
    const booking = await Booking.create({
      rooms: roomNumbers,
      totalRooms: numRooms,
      travelTime,
      totalPrice,
      checkInDate,
      checkOutDate,
      status: 'confirmed',
      paymentStatus: 'pending'
    });

    // 6. Update room availability
    await Room.update(
      {
        isAvailable: false,
        status: 'booked'
      },
      {
        where: {
          roomNumber: roomNumbers
        }
      }
    );

    res.status(201).json({
      success: true,
      data: {
        bookingId: booking.bookingId,
        rooms: roomNumbers,
        travelTime,
        totalPrice,
        checkInDate,
        checkOutDate,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during booking',
      error: error.message
    });
  }
};

// @desc    Get all bookings
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// @desc    Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      where: { bookingId: id }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      where: { bookingId: id }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    await Room.update(
      { isAvailable: true, status: 'not-booked' },
      { where: { roomNumber: booking.rooms } }
    );

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  bookRooms,
  getBookings,
  getBookingById,
  cancelBooking
};