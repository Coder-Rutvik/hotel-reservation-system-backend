const sequelize = require('../src/config/mysql');
const { Booking, User } = require('../src/models/mysql');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected for test');

    const bookings = await Booking.findAll({
      limit: 5,
      include: [{ model: User, as: 'user', attributes: ['userId', 'name', 'email'] }]
    });

    console.log('Bookings (with user):', bookings.map(b => ({ bookingId: b.bookingId, user: b.user ? b.user.name : null })));
    process.exit(0);
  } catch (err) {
    console.error('Association test error:', err);
    process.exit(1);
  }
})();