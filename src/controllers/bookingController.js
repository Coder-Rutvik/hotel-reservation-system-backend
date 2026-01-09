const { Booking, User, Room } = require('../models');
const { Op } = require('sequelize');

// @desc    Book rooms
// @route   POST /api/bookings
// @access  Private
const bookRooms = async (req, res) => {
  try {
    const { numRooms, checkInDate, checkOutDate } = req.body;
    const userId = req.user.userId;

    console.log('📅 Booking attempt by user:', userId, { numRooms, checkInDate, checkOutDate });

    // Validation
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

    // Find available rooms
    console.log('🔍 Looking for available rooms...');
    
    const roomCount = await Room.count();
    if (roomCount === 0) {
      console.log('⚠️ No rooms found in database!');
      return res.status(400).json({
        success: false,
        message: 'No rooms available in the system.'
      });
    }
    
    const allAvailableRooms = await Room.findAll({
      where: { isAvailable: true },
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    console.log(`📊 Found ${allAvailableRooms.length} available rooms out of ${roomCount} total`);

    if (allAvailableRooms.length < numRooms) {
      return res.status(400).json({
        success: false,
        message: `Not enough available rooms. Need ${numRooms}, but only ${allAvailableRooms.length} available`
      });
    }

    // Take first N available rooms
    const selectedRooms = allAvailableRooms.slice(0, numRooms);
    const roomNumbers = selectedRooms.map(room => room.roomNumber);
    
    // Calculate travel time
    let travelTime = 0;
    if (selectedRooms.length > 1) {
      const firstFloor = selectedRooms[0].floor;
      const sameFloor = selectedRooms.every(room => room.floor === firstFloor);
      
      if (sameFloor) {
        const positions = selectedRooms.map(r => r.position);
        const maxPos = Math.max(...positions);
        const minPos = Math.min(...positions);
        travelTime = (maxPos - minPos) * 2;
      } else {
        travelTime = (selectedRooms.length * 3) + 5;
      }
    }

    // Calculate price
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

    // Create booking
    console.log('💾 Creating booking...');
    const booking = await Booking.create({
      userId,
      rooms: roomNumbers,
      totalRooms: numRooms,
      travelTime,
      totalPrice,
      checkInDate,
      checkOutDate,
      status: 'confirmed',
      paymentStatus: 'pending'
    });

    // Update room availability
    await Room.update(
      { isAvailable: false },
      {
        where: {
          roomNumber: roomNumbers
        }
      }
    );

    console.log('✅ Booking created successfully:', {
      bookingId: booking.bookingId,
      rooms: roomNumbers,
      travelTime,
      totalPrice
    });

    res.status(201).json({
      success: true,
      message: 'Booking successful!',
      data: {
        bookingId: booking.bookingId,
        rooms: roomNumbers,
        travelTime,
        totalPrice,
        checkInDate,
        checkOutDate,
        bookingDate: booking.bookingDate,
        status: booking.status,
        nights: nights
      }
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await Booking.findAll({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Found ${bookings.length} bookings for user ${userId}`);

    // Get user details separately
    const user = await User.findByPk(userId, {
      attributes: ['name', 'email', 'phone']
    });

    // Add user info to bookings
    const bookingsWithUser = bookings.map(booking => {
      const bookingData = booking.toJSON();
      return {
        ...bookingData,
        user: user || { name: 'User', email: 'N/A' }
      };
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookingsWithUser
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({
      where: {
        bookingId: id,
        userId: userId
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['name', 'email']
    });

    const bookingData = booking.toJSON();
    bookingData.user = user || { name: 'User', email: 'N/A' };

    res.json({
      success: true,
      data: bookingData
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
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findOne({
      where: {
        bookingId: id,
        userId: userId
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    await Room.update(
      { isAvailable: true },
      {
        where: {
          roomNumber: booking.rooms
        }
      }
    );

    console.log('✅ Booking cancelled:', { bookingId: id, userId });

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

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
const getBookingStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalBookings = await Booking.count({ where: { userId: userId } });
    const confirmedBookings = await Booking.count({
      where: { userId: userId, status: 'confirmed' }
    });
    const cancelledBookings = await Booking.count({
      where: { userId: userId, status: 'cancelled' }
    });
    const totalSpent = await Booking.sum('totalPrice', {
      where: { userId: userId, status: 'confirmed' }
    }) || 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBookings = await Booking.count({
      where: {
        userId: userId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        recent: recentBookings,
        totalSpent: parseFloat(totalSpent),
        averageSpent: totalBookings > 0 ? parseFloat(totalSpent) / totalBookings : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  bookRooms,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getBookingStats
};