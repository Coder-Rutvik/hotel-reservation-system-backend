const express = require('express');
const router = express.Router();

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Get all rooms endpoint' });
});

router.get('/available', (req, res) => {
  res.json({ message: 'Get available rooms endpoint' });
});

module.exports = router;