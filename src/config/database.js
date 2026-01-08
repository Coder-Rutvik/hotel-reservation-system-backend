// Consolidated PostgreSQL connection + helper methods
// This file merges the previous `postgresql.js` logic and the connection helpers
// into a single export that can be required as either the Sequelize instance
// or as an object with helper methods (backwards-compatible).

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Helper that builds a Sequelize instance based on environment variables
const getPostgresConnection = (overrideSsl = undefined) => {
  const buildSequelize = (sslOption) => {
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL not found. Using fallback configuration.');
      return new Sequelize(
        process.env.POSTGRES_DATABASE || 'hotel_reservation',
        process.env.POSTGRES_USER || 'postgres',
        process.env.POSTGRES_PASSWORD || '',
        {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || 5432,
          dialect: 'postgres',
          logging: process.env.NODE_ENV === 'development' ? console.log : false,
          pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
          },
          dialectOptions: {
            ssl: sslOption
          }
        }
      );
    }

    let maskedUrl = process.env.DATABASE_URL;
    let shouldUseSsl = false;
    let sslReason = 'default false';

    try {
      const urlObj = new URL(process.env.DATABASE_URL);
      maskedUrl = `postgresql://${urlObj.username || 'user'}:****@${urlObj.hostname || 'host'}:${urlObj.port || '5432'}${urlObj.pathname || ''}`;

      const host = urlObj.hostname || '';
      const isLocalHost = host === 'localhost' || host === '127.0.0.1';

      if (process.env.PG_SSL === 'true') {
        shouldUseSsl = true;
        sslReason = 'PG_SSL=true (explicit)';
      } else if (process.env.PG_SSL === 'false') {
        shouldUseSsl = false;
        sslReason = 'PG_SSL=false (explicit)';
      } else if (isLocalHost) {
        shouldUseSsl = false;
        sslReason = 'host is localhost (safe default)';
      } else {
        shouldUseSsl = process.env.NODE_ENV === 'production';
        sslReason = process.env.NODE_ENV === 'production' ? 'NODE_ENV=production (default on hosted dbs)' : 'non-production default';
      }

      if (process.env.NODE_ENV === 'production' && isLocalHost) {
        console.warn('⚠️ DATABASE_URL host is localhost while running in production. On managed platforms set `DATABASE_URL` and `PG_SSL=true`.');
      }
    } catch (e) {
      console.warn('⚠️ Could not parse DATABASE_URL for diagnostics:', e.message);
      shouldUseSsl = process.env.PG_SSL === 'true' || process.env.NODE_ENV === 'production';
      sslReason = 'fallback (could not parse URL)';
    }

    if (overrideSsl !== undefined) {
      shouldUseSsl = !!overrideSsl;
      sslReason = 'override param';
    }

    const dialectSslOption = shouldUseSsl ? { require: true, rejectUnauthorized: false } : false;

    console.log(`🔗 Connecting to PostgreSQL: ${maskedUrl}`);
    console.log(`🔒 PostgreSQL SSL: ${shouldUseSsl} (${sslReason})`);

    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: dialectSslOption,
        keepAlive: true,
        connectTimeout: 30000,
        statement_timeout: 30000,
        query_timeout: 30000
      },
      pool: {
        max: 2,
        min: 0,
        acquire: 60000,
        idle: 10000,
        evict: 10000
      },
      retry: {
        match: [
          /ConnectionError/,
          /SequelizeConnectionError/,
          /Connection terminated/,
          /ETIMEDOUT/,
          /ECONNRESET/,
          /ENOTFOUND/,
          /ENETUNREACH/,
          /ECONNREFUSED/
        ],
        max: 3,
        backoffBase: 1000,
        backoffExponent: 1.5
      },
      define: {
        timestamps: true,
        underscored: true
      }
    });
  };

  return buildSequelize(undefined);
};

// Create initial instance
let sequelizePostgres = getPostgresConnection();
let _sslAttempted = undefined;

// Test connection with retry + automatic SSL fallback
const testConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await sequelizePostgres.authenticate();
      console.log('✅ PostgreSQL connection authenticated');

      const [result] = await sequelizePostgres.query('SELECT version()');
      console.log('📊 PostgreSQL version:', result[0]?.version?.split(' ')[1] || 'Unknown');

      return true;
    } catch (error) {
      retries--;
      const message = error && error.message ? error.message : String(error);
      console.error(`❌ PostgreSQL connection failed. Retries left: ${retries}`, message);

      if (message.includes('does not support SSL') || message.includes('no pg_hba.conf')) {
        if (_sslAttempted !== false) {
          console.warn('⚠️ Detected server does not support SSL. Retrying connection with SSL disabled...');
          sequelizePostgres = getPostgresConnection(false);
          _sslAttempted = false;
          continue;
        }
      }

      if (retries === 0) {
        console.error('❌ All PostgreSQL connection attempts failed');
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const isHostValid = () => {
  if (process.env.DATABASE_URL) return true;
  const host = process.env.POSTGRES_HOST || 'localhost';
  if (host === 'localhost') return true;
  return host.includes('.');
};

if (process.env.NODE_ENV !== 'test' && isHostValid()) {
  testConnection().then(success => {
    if (!success && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  PostgreSQL connection failed but continuing in production mode');
    }
  });
} else if (!isHostValid()) {
  console.warn('⚠️  Skipping automatic PostgreSQL connection test due to incomplete host configuration. Set `DATABASE_URL` or a fully qualified `POSTGRES_HOST` to enable it.');
}


sequelizePostgres.connect = async () => {
  try {
    await sequelizePostgres.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    return sequelizePostgres;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message || error);
    process.exit(1);
  }
};

sequelizePostgres.checkAllConnections = async () => {
  const status = { postgresql: { connected: false, error: null } };
  try {
    await sequelizePostgres.authenticate();
    status.postgresql.connected = true;
  } catch (err) {
    status.postgresql.error = err.message;
  }
  return status;
};

sequelizePostgres.closeAllConnections = async () => {
  try {
    await sequelizePostgres.close();
    return [{ db: 'PostgreSQL', status: 'closed' }];
  } catch (err) {
    return [{ db: 'PostgreSQL', status: 'error', error: err.message }];
  }
};


module.exports = sequelizePostgres;

module.exports.postgresql = sequelizePostgres;
module.exports.getPostgresConnection = getPostgresConnection;