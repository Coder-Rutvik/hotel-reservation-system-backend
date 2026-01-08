require('dotenv').config();
const sequelizePostgres = require('../config/database');

// Import PostgreSQL models to register them
const { UserPostgres, RoomPostgres, BookingPostgres } = require('../models/postgresql');

const syncPostgreSQL = async () => {
  try {
    console.log('🔄 Starting PostgreSQL database sync...');
    console.log('===========================================');
    
    // Test connection
    await sequelizePostgres.authenticate();
    console.log('✅ PostgreSQL connection authenticated');
    
    // Sync all models (create tables)
    await sequelizePostgres.sync({ force: false, alter: true });
    console.log('✅ PostgreSQL tables synced successfully');
    
    console.log('===========================================');
    console.log('📊 Tables created/updated:');
    console.log('  - users');
    console.log('  - rooms');
    console.log('  - bookings');
    console.log('===========================================');
    console.log('🎉 PostgreSQL sync completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL sync error:', error);
    process.exit(1);
  }
};

syncPostgreSQL();

