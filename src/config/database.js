const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database configuration from DATABASE_URL or individual variables
let sequelizeConfig = {};
let sequelize; // Declare here at the top

if (process.env.DATABASE_URL) {
  console.log('🔌 Using DATABASE_URL for PostgreSQL connection...');

  const isRender = process.env.DATABASE_URL.includes('render.com');

  sequelizeConfig = {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: isRender || process.env.PG_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    define: {
      timestamps: true,
      underscored: true
    }
  };

  sequelize = new Sequelize(process.env.DATABASE_URL, sequelizeConfig); // Remove var

} else {
  console.log('🔌 Using individual environment variables for PostgreSQL connection...');
  const dbConfig = {
    database: process.env.POSTGRES_DATABASE || 'hotel_reservation_db',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'rutvik',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);

  sequelize = new Sequelize( // Remove var
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      pool: dbConfig.pool,
      define: {
        timestamps: true,
        underscored: true
      }
    }
  );
}

// Function to ensure users table exists - REMOVED
// const ensureUsersTable = async () => ...

// Function to create all tables if missing
// Function to create all tables (Sync Models)
const setupDatabaseTables = async () => {
  try {
    console.log('🛠️ Syncing database models...');

    // This will create all tables based on the models in src/models/
    // alter: true adds missing columns/tables without dropping existing data
    await sequelize.sync({ alter: true });

    console.log('✅ Database models synced successfully');

    // Double check specific tables just in case
    try {
      const [results] = await sequelize.query("SELECT to_regclass('public.rooms')");
      if (results[0].to_regclass) console.log('✅ Confirmed: rooms table exists');
      else console.error('❌ Warning: rooms table might be missing even after sync');
    } catch (e) { console.log('Checking table existence skipped'); }

    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    return false;
  }
};

// Test the connection
const connect = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connected successfully');

      await setupDatabaseTables();

      const [result] = await sequelize.query('SELECT version()');
      console.log('📊 PostgreSQL version:', result[0]?.version?.split(' ')[1] || 'Unknown');

      return sequelize;
    } catch (error) {
      retries--;
      console.error(`❌ PostgreSQL connection failed. Retries left: ${retries}`, error.message);

      if (retries === 0) {
        console.error('❌ All PostgreSQL connection attempts failed');
        if (process.env.NODE_ENV === 'production') {
          console.warn('⚠️ Continuing in production without database connection (reduced functionality)');
          return null;
        }
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Check database connection status
const checkConnection = async () => {
  try {
    await sequelize.authenticate();

    return {
      connected: true,
      message: 'PostgreSQL connected successfully'
    };
  } catch (error) {
    console.error('❌ PostgreSQL connection check failed:', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
};

// For backward compatibility
const checkAllConnections = async () => {
  const status = await checkConnection();

  return {
    postgresql: {
      connected: status.connected,
      error: status.error || undefined,
      message: status.message
    }
  };
};

// Close all connections
const close = async () => {
  try {
    await sequelize.close();
    return { closed: true };
  } catch (error) {
    return {
      closed: false,
      error: error.message
    };
  }
};

const closeAllConnections = async () => {
  const result = await close();
  return [{
    db: 'PostgreSQL',
    status: result.closed ? 'closed' : 'error',
    error: result.error
  }];
};

module.exports = {
  sequelize,
  connect,
  checkConnection,
  close,
  // ensureUsersTable, // REMOVED
  setupDatabaseTables,

  postgresql: sequelize,
  sequelizePostgres: sequelize,

  checkAllConnections,
  closeAllConnections
};