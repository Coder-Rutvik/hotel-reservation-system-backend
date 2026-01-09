require('dotenv').config();
const { sequelize } = require('./src/config/database');

console.log('🚀 Starting Hotel Reservation System Backend...');
console.log('===========================================');

// Manual table creation function
async function createTablesManually() {
  try {
    console.log('🛠️ Creating tables manually...');
    
    // Create users table FIRST
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(10) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');
    
    // Create rooms table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id SERIAL PRIMARY KEY,
        room_number INTEGER UNIQUE NOT NULL,
        floor INTEGER NOT NULL,
        position INTEGER NOT NULL,
        room_type VARCHAR(20) DEFAULT 'standard',
        is_available BOOLEAN DEFAULT true,
        base_price DECIMAL(10,2) DEFAULT 100.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Rooms table created');
    
    // Create bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        rooms JSONB NOT NULL,
        total_rooms INTEGER NOT NULL,
        travel_time INTEGER NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        booking_date DATE DEFAULT CURRENT_DATE,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed',
        payment_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Bookings table created');
    
    return true;
  } catch (error) {
    console.error('❌ Manual table creation failed:', error.message);
    throw error;
  }
}

// Database setup function
async function setupDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // FIRST: Check if users table exists
    console.log('🔍 Checking for existing tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'rooms', 'bookings')
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tables.length} existing tables`);
    
    // If users table doesn't exist, create all tables manually
    const usersTableExists = tables.some(t => t.table_name === 'users');
    
    if (!usersTableExists) {
      console.log('⚠️ Users table not found. Creating all tables...');
      await createTablesManually();
    } else {
      console.log('✅ Users table exists. Checking others...');
      
      // Create missing tables
      const existingTables = tables.map(t => t.table_name);
      
      if (!existingTables.includes('rooms')) {
        console.log('📝 Creating rooms table...');
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS rooms (
            room_id SERIAL PRIMARY KEY,
            room_number INTEGER UNIQUE NOT NULL,
            floor INTEGER NOT NULL,
            position INTEGER NOT NULL,
            room_type VARCHAR(20) DEFAULT 'standard',
            is_available BOOLEAN DEFAULT true,
            base_price DECIMAL(10,2) DEFAULT 100.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ Rooms table created');
      }
      
      if (!existingTables.includes('bookings')) {
        console.log('📝 Creating bookings table...');
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS bookings (
            booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id INTEGER NOT NULL REFERENCES users(user_id),
            rooms JSONB NOT NULL,
            total_rooms INTEGER NOT NULL,
            travel_time INTEGER NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            booking_date DATE DEFAULT CURRENT_DATE,
            check_in_date DATE NOT NULL,
            check_out_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'confirmed',
            payment_status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ Bookings table created');
      }
    }
    
    // Final verification
    const [finalTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 Final table count: ${finalTables.length}`);
    finalTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    // Check users table specifically
    try {
      const [userCount] = await sequelize.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Users table has ${userCount[0].count} records`);
    } catch (e) {
      console.log('⚠️ Could not count users:', e.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    // Last resort: try creating just users table
    try {
      console.log('🆘 Trying emergency users table creation...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(100) UNIQUE,
          password VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Emergency users table created');
      return true;
    } catch (emergencyError) {
      console.error('❌ Emergency creation failed:', emergencyError.message);
      return false;
    }
  }
}

// Start everything
async function startServer() {
  console.log('\n📊 Environment Details:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${process.env.PORT || 5000}`);
  
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(
      /\/\/([^:]+):([^@]+)@/,
      '//$1:****@'
    );
    console.log(`   Database: ${maskedUrl}`);
  }
  
  console.log('===========================================\n');
  
  // Setup database first
  console.log('⚙️ Setting up database...');
  const dbReady = await setupDatabase();
  
  if (dbReady) {
    console.log('✅ Database setup completed successfully');
  } else {
    console.warn('⚠️ Database setup had issues. Some features may not work.');
  }
  
  // Now start Express server
  const app = require('./src/app');
  const PORT = process.env.PORT || 10000;
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n===========================================');
    console.log(`✅ Express server running on port ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🌐 Production URL: https://hotel-reservation-system-backend-6nf6.onrender.com`);
    console.log(`🔍 Health Check: /api/health`);
    console.log(`📊 DB Test: /api/db-test`);
    console.log(`🏠 Home: /`);
    console.log(`💾 Database: ${dbReady ? '✅ Ready' : '⚠️ Issues'}`);
    console.log('===========================================');
    console.log('🎉 Server is ready and accepting requests!');
    console.log('===========================================\n');
    
    // Quick self-test after 1 second
    setTimeout(async () => {
      try {
        // Test database connection
        await sequelize.authenticate();
        console.log('🧪 Database connection test: ✅ OK');
        
        // Test users table
        const [result] = await sequelize.query('SELECT 1 FROM users LIMIT 1');
        console.log(`🧪 Users table test: ${result ? '✅ OK' : '⚠️ No data'}`);
        
      } catch (e) {
        console.log(`🧪 Self-test failed: ❌ ${e.message}`);
      }
    }, 1000);
  });
  
  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🔄 Shutting down gracefully...');
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      sequelize.close()
        .then(() => console.log('✅ Database connections closed'))
        .catch(err => console.log('⚠️ Could not close database:', err.message))
        .finally(() => {
          console.log('👋 Shutdown complete');
          process.exit(0);
        });
    });
    
    setTimeout(() => {
      console.error('❌ Forcing shutdown after timeout');
      process.exit(1);
    }, 5000);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
  });
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  setTimeout(() => process.exit(1), 1000);
});

// Start the application
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});