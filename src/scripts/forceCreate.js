const { sequelize } = require('../config/database');

const forceCreateTables = async () => {
    try {
        console.log('💥 FORCE CREATION STARTED...');

        await sequelize.authenticate();
        console.log('✅ DB Connection OK');

        // Drop everything first to be sure
        await sequelize.query('DROP TABLE IF EXISTS bookings CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS rooms CASCADE');
        await sequelize.query('DROP TABLE IF EXISTS users CASCADE');
        console.log('🗑️ Dropped old tables');

        // 1. Create Rooms Table MANUALLY
        console.log('📝 Creating Rooms Table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                room_id SERIAL PRIMARY KEY,
                room_number INTEGER UNIQUE NOT NULL,
                floor INTEGER NOT NULL,
                position INTEGER NOT NULL,
                room_type VARCHAR(20) DEFAULT 'standard',
                status VARCHAR(20) DEFAULT 'not-booked',
                is_available BOOLEAN DEFAULT true,
                base_price DECIMAL(10,2) DEFAULT 100.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create Bookings Table MANUALLY
        console.log('📝 Creating Bookings Table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                rooms JSONB NOT NULL,
                total_rooms INTEGER NOT NULL,
                travel_time INTEGER NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                booking_date DATE DEFAULT CURRENT_DATE,
                check_in_date DATE NOT NULL,
                check_out_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                payment_status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tables Created Successfully.');

        // 3. Seed Rooms
        console.log('🌱 Seeding 97 Rooms...');
        const rooms = [];
        // Floors 1-9
        for (let floor = 1; floor <= 9; floor++) {
            for (let position = 1; position <= 10; position++) {
                rooms.push(`(${floor * 100 + position}, ${floor}, ${position}, '${floor >= 8 ? 'deluxe' : 'standard'}', 'not-booked', true, ${floor >= 8 ? 150.00 : 100.00})`);
            }
        }
        // Floor 10
        for (let position = 1; position <= 7; position++) {
            rooms.push(`(${1000 + position}, 10, ${position}, 'suite', 'not-booked', true, 200.00)`);
        }

        const query = `
            INSERT INTO rooms (room_number, floor, position, room_type, status, is_available, base_price)
            VALUES ${rooms.join(',')}
            ON CONFLICT (room_number) DO NOTHING;
        `;

        await sequelize.query(query);
        console.log('✅ 97 Rooms Seeded.');

        console.log('🎉 DB REPAIR COMPLETE.');
        process.exit(0);
    } catch (e) {
        console.error('❌ FATAL ERROR:', e);
        process.exit(1);
    }
};

forceCreateTables();
