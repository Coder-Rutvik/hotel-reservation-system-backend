const mysql = require('./mysql');
const mongodb = require('./mongodb');

const connectDatabases = async () => {
  try {
    // Connect to MySQL
    await mysql.authenticate();
    console.log('✅ MySQL connected successfully');
    
    // Connect to MongoDB
    await mongodb.connect();
    console.log('✅ MongoDB connected successfully');
    
    return {
      mysql,
      mongodb
    };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabases;