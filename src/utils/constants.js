// Hotel configuration constants
const HOTEL_CONFIG = {
  TOTAL_ROOMS: 97,
  TOTAL_FLOORS: 10,
  ROOMS_PER_FLOOR: {
    1: 10, 2: 10, 3: 10, 4: 10, 5: 10,
    6: 10, 7: 10, 8: 10, 9: 10, 10: 7
  },
  FLOOR_10_ROOMS: [1001, 1002, 1003, 1004, 1005, 1006, 1007],
  ROOM_TYPES: {
    STANDARD: 'standard',
    DELUXE: 'deluxe',
    SUITE: 'suite'
  },
  ROOM_PRICES: {
    standard: 100.00,
    deluxe: 150.00,
    suite: 200.00
  }
};

// Travel time constants
const TRAVEL_TIME = {
  HORIZONTAL_PER_ROOM: 1, // minutes
  VERTICAL_PER_FLOOR: 2,  // minutes
  MAX_ROOMS_PER_BOOKING: 5
};

// Booking rules
const BOOKING_RULES = {
  MAX_ROOMS: 5,
  MIN_STAY_NIGHTS: 1,
  MAX_STAY_NIGHTS: 30,
  CANCELLATION_HOURS: 24, // Free cancellation up to 24 hours before check-in
  CHECK_IN_TIME: '14:00',
  CHECK_OUT_TIME: '12:00'
};

// Application constants
const APP_CONSTANTS = {
  JWT_EXPIRE: '7d',
  PAGINATION_LIMIT: 10,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss'
};

// Error messages
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Not authorized',
  FORBIDDEN: 'Access forbidden',
  SERVER_ERROR: 'Internal server error',
  DUPLICATE_ENTRY: 'Duplicate entry found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  ROOM_UNAVAILABLE: 'Room is not available',
  MAX_ROOMS_EXCEEDED: 'Cannot book more than 5 rooms at once',
  MIN_STAY_REQUIRED: 'Minimum stay is 1 night',
  PAST_CHECKIN: 'Check-in date cannot be in the past',
  CANCELLATION_DEADLINE: 'Cannot cancel booking after check-in time'
};

// Success messages
const SUCCESS_MESSAGES = {
  REGISTER_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  BOOKING_SUCCESS: 'Booking successful',
  CANCELLATION_SUCCESS: 'Booking cancelled successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  DELETE_SUCCESS: 'Deleted successfully'
};

// Status codes
const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_CANCELLATION: 'booking_cancellation',
  PASSWORD_RESET: 'password_reset'
};

module.exports = {
  HOTEL_CONFIG,
  TRAVEL_TIME,
  BOOKING_RULES,
  APP_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STATUS_CODES,
  EMAIL_TEMPLATES
};