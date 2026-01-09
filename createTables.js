// src/scripts/createTables.js
require('dotenv').config();
const { sequelize } = require('../config/database');

async function createTables() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Drop existing tables (optional - only for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Dropping existing tables...');
      await sequelize.query('DROP TABLE IF EXISTS bookings CASCADE');
      await sequelize.query('DROP TABLE IF EXISTS rooms CASCADE');
      await sequelize.query('DROP TABLE IF EXISTS users CASCADE');
    }
    
    // Create users table
    console.log('📝 Creating users table...');
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
    
    // Create bookings table
    console.log('📝 Creating bookings table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);
    console.log('✅ Bookings table created');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor)');
    console.log('✅ Indexes created');
    
    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table.table_name}`));
    
    // Test each table
    console.log('\n🧪 Testing table access...');
    const testQueries = [
      ['users', 'SELECT 1 FROM users LIMIT 1'],
      ['rooms', 'SELECT 1 FROM rooms LIMIT 1'],
      ['bookings', 'SELECT 1 FROM bookings LIMIT 1']
    ];
    
    for (const [tableName, query] of testQueries) {
      try {
        await sequelize.query(query);
        console.log(`   ✅ ${tableName} table is accessible`);
      } catch (error) {
        console.log(`   ❌ ${tableName} table error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 All tables created successfully!');
    console.log('👉 Now restart your server and try registering a user.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();