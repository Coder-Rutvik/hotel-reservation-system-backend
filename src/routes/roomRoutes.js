const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/available', roomController.getAvailableRooms);
router.get('/floor/:floorNumber', roomController.getRoomsByFloor);
router.get('/number/:roomNumber', roomController.getRoomByNumber);
router.get('/types', roomController.getRoomTypes);
router.get('/search', roomController.searchRooms);

// Admin/System routes
router.post('/create-sample', roomController.createSampleRooms);
router.post('/random-occupancy', roomController.generateRandomOccupancy);
router.post('/reset-all', roomController.resetAllBookings);
router.post('/seed-rooms', roomController.seedRooms);

module.exports = router;