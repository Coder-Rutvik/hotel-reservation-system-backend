const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getAvailableRooms,
  getRoomsByFloor,
  getRoomByNumber,
  getRoomTypes,
  searchRooms
} = require('../controllers/roomController');
const { roomSearchValidation } = require('../middleware/validation');

router.get('/', getAllRooms);
router.get('/available', getAvailableRooms);
router.get('/types', getRoomTypes);
router.get('/search', roomSearchValidation, searchRooms);
router.get('/floor/:floorNumber', getRoomsByFloor);
router.get('/number/:roomNumber', getRoomByNumber);

module.exports = router;