const express = require('express');
const router = express.Router();
const {
  bookRooms,
  getBookings,
  getBookingById,
  cancelBooking
} = require('../controllers/bookingController');

// Public routes
router.post('/', bookRooms);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);

module.exports = router;