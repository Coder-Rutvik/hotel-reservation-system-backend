// src/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { bookingValidation } = require('../middleware/validation');
const {
  bookRooms,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getBookingStats
} = require('../controllers/bookingController');

// All routes require authentication
router.use(protect);

// Keep validation middleware - it's good practice!
router.route('/')
  .post(bookingValidation, bookRooms);

router.route('/my-bookings')
  .get(getUserBookings);

router.route('/stats')
  .get(getBookingStats);

router.route('/:id')
  .get(getBookingById);

router.route('/:id/cancel')
  .put(cancelBooking);

module.exports = router;