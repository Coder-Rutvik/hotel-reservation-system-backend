// src/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware - IMPROVED with detailed error messages
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // IMPROVED: Log detailed errors
    console.log('❌ Validation Failed:');
    errors.array().forEach(err => {
      console.log(`   - ${err.param}: ${err.msg} (value: ${err.value})`);
    });

    // IMPROVED: Return detailed error response
    res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
        location: err.location
      }))
    });
  };
};

// User registration validation
const registerValidation = validate([
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number')
]);

// User login validation
const loginValidation = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
]);

// Booking validation - FIXED with proper date validation
const bookingValidation = validate([
  body('numRooms')
    .notEmpty().withMessage('Number of rooms is required')
    .isInt({ min: 1, max: 5 }).withMessage('Number of rooms must be between 1 and 5'),
  
  body('checkInDate')
    .notEmpty().withMessage('Check-in date is required')
    .custom((value, { req }) => {
      // Check if valid date format
      const checkIn = new Date(value);
      if (isNaN(checkIn.getTime())) {
        throw new Error('Invalid check-in date format');
      }
      
      // Check if not in past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      
      if (checkIn < today) {
        throw new Error('Check-in date cannot be in the past');
      }
      
      return true;
    }),
  
  body('checkOutDate')
    .notEmpty().withMessage('Check-out date is required')
    .custom((value, { req }) => {
      // Check if valid date format
      const checkOut = new Date(value);
      if (isNaN(checkOut.getTime())) {
        throw new Error('Invalid check-out date format');
      }
      
      // Check if after check-in
      const checkIn = new Date(req.body.checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkOut <= checkIn) {
        throw new Error('Check-out date must be after check-in date');
      }
      
      return true;
    })
]);

// Room search validation
const roomSearchValidation = validate([
  query('floor')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Floor must be between 1 and 10'),
  
  query('roomType')
    .optional()
    .isIn(['standard', 'deluxe', 'suite']).withMessage('Invalid room type'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  
  query('available')
    .optional()
    .isIn(['true', 'false']).withMessage('Available must be true or false')
]);

// Room ID validation
const roomIdValidation = validate([
  param('id')
    .notEmpty().withMessage('Room ID is required')
    .isInt({ min: 1 }).withMessage('Invalid room ID')
]);

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  bookingValidation,
  roomSearchValidation,
  roomIdValidation
};