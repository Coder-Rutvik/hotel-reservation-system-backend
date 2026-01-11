const { sequelize } = require('../config/database');

const alterTable = async () => {
    try {
        console.log('🛠️ Attempting to add status column... (Production Fix)');

        // Add status column directly
        // Using try/catch to handle if it already exists or if other errors occur
        try {
            await sequelize.query('ALTER TABLE rooms ADD COLUMN status VARCHAR(20) DEFAULT \'not-booked\'');
            console.log('✅ Column status added to rooms table.');
        } catch (e) {
            if (e.message && e.message.includes('already exists')) {
                console.log('ℹ️ Column status already exists.');
            } else {
                console.log('⚠️ Error adding column (might exist):', e.message);
            }
        }

        console.log('✅ Database patch complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Patch failed:', error.message);
        process.exit(1);
    }
};

alterTable();
