const User = require('./User');
const Room = require('./Room');
const Booking = require('./Booking');

// Define associations
Booking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Booking, {
  foreignKey: 'userId',
  as: 'bookings'
});

module.exports = {
  User,
  Room,
  Booking
};

