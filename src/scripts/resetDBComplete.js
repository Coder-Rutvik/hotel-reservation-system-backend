const { sequelize } = require('../config/database');

const resetDB = async () => {
    try {
        console.log('🗑️ Dropping all tables...');
        await sequelize.authenticate();

        // Drop in correct order due to FKs (bookings depends on users typically, but we removed FK).
        // Safest to drop bookings first.
        await sequelize.query('DROP TABLE IF EXISTS bookings CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS rooms CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS users CASCADE');

        console.log('✅ Tables dropped.');

        // Config's setupDatabaseTables will run on next app start
        process.exit(0);
    } catch (error) {
        console.error('❌ Error dropping tables:', error);
        process.exit(1);
    }
};

resetDB();
