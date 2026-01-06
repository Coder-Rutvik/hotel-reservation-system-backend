const Room = require('../models/mysql/Room');
const algorithmService = require('./algorithmService');

class BookingService {
  async validateBooking(numRooms, checkInDate, checkOutDate) {
    // Validate number of rooms
    if (!numRooms || numRooms < 1 || numRooms > 5) {
      return { valid: false, message: 'Number of rooms must be between 1 and 5' };
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return { valid: false, message: 'Check-in date cannot be in the past' };
    }

    if (checkOut <= checkIn) {
      return { valid: false, message: 'Check-out date must be after check-in date' };
    }

    // Check minimum stay (1 night)
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      return { valid: false, message: 'Minimum stay is 1 night' };
    }

    return { valid: true };
  }

  async findOptimalRooms(numRooms) {
    // Get all available rooms
    const availableRooms = await Room.findAll({
      where: { isAvailable: true },
      order: [['floor', 'ASC'], ['position', 'ASC']]
    });

    // Group by floor for algorithm
    const roomsByFloor = {};
    const formattedRooms = availableRooms.map(room => ({
      number: room.roomNumber,
      floor: room.floor,
      position: room.position,
      roomId: room.roomId,
      roomType: room.roomType,
      basePrice: room.basePrice
    }));

    formattedRooms.forEach(room => {
      if (!roomsByFloor[room.floor]) roomsByFloor[room.floor] = [];
      roomsByFloor[room.floor].push(room);
    });

    // Convert to array for algorithm
    const availableRoomsByFloor = Object.values(roomsByFloor)
      .sort((a, b) => a[0].floor - b[0].floor);

    // Find optimal rooms using algorithm service
    const result = await algorithmService.findOptimalRooms(availableRoomsByFloor, numRooms);

    if (!result) {
      return null;
    }

    return {
      rooms: result.rooms,
      travelTime: result.travelTime,
      floors: result.floors,
      strategy: result.strategy
    };
  }

  async calculateTotalPrice(optimalRooms, checkInDate, checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Get room details for pricing
    const roomIds = optimalRooms.rooms.map(r => r.roomId);
    const rooms = await Room.findAll({
      where: { roomId: roomIds }
    });

    // Calculate total price
    let totalPrice = 0;
    rooms.forEach(room => {
      const basePrice = parseFloat(room.basePrice);
      
      // Apply pricing rules
      let pricePerNight = basePrice;
      
      // Weekend pricing (Friday, Saturday)
      const checkInDay = checkIn.getDay();
      if (checkInDay === 5 || checkInDay === 6) { // 5 = Friday, 6 = Saturday
        pricePerNight *= 1.2; // 20% increase on weekends
      }
      
      // Peak season pricing (Dec 20 - Jan 5)
      const checkInMonth = checkIn.getMonth();
      const checkInDate = checkIn.getDate();
      if (checkInMonth === 11 && checkInDate >= 20) { // December 20-31
        pricePerNight *= 1.3; // 30% increase
      }
      if (checkInMonth === 0 && checkInDate <= 5) { // January 1-5
        pricePerNight *= 1.3; // 30% increase
      }
      
      totalPrice += pricePerNight * nights;
    });

    return parseFloat(totalPrice.toFixed(2));
  }

  async updateRoomAvailability(rooms, isAvailable) {
    if (!rooms || rooms.length === 0) return;

    const roomNumbers = Array.isArray(rooms) ? rooms : [rooms];
    
    await Room.update(
      { isAvailable },
      {
        where: {
          roomNumber: roomNumbers
        }
      }
    );
  }

  async getBookingSummary(bookingId) {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: User,
          attributes: ['name', 'email', 'phone']
        }
      ]
    });

    if (!booking) return null;

    // Get room details
    const rooms = await Room.findAll({
      where: {
        roomNumber: booking.rooms
      }
    });

    return {
      booking,
      rooms,
      totalNights: Math.ceil(
        (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24)
      )
    };
  }
}

module.exports = new BookingService();