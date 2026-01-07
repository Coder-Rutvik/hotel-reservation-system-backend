const mysql = require('./mysql');
const postgresql = require('./postgresql');
const mongodb = require('./mongodb');

const connectDatabases = async () => {
  try {
    // Connect to MySQL
    await mysql.authenticate();
    console.log('✅ MySQL connected successfully');
    
    // Connect to PostgreSQL
    try {
      await postgresql.authenticate();
      console.log('✅ PostgreSQL connected successfully');
    } catch (postgresError) {
      console.warn('⚠️  PostgreSQL connection failed (continuing):', postgresError.message);
    }
    
    // Connect to MongoDB
    await mongodb.connect();
    console.log('✅ MongoDB connected successfully');
    
    return {
      mysql,
      postgresql,
      mongodb
    };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabases;