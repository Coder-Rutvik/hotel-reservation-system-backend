const { Sequelize } = require('sequelize');
require('dotenv').config();

// Enhanced PostgreSQL connection with better error handling
const getPostgresConnection = (overrideSsl = undefined) => {
  // Helper to build a Sequelize instance with a given ssl option
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

    // Parse the DATABASE_URL for logging (masked) and decide SSL usage
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
        console.warn('⚠️ DATABASE_URL host is localhost while running in production. On Render you should use the managed DB and set `DATABASE_URL` and `PG_SSL=true`.');
      }
    } catch (e) {
      console.warn('⚠️ Could not parse DATABASE_URL for diagnostics:', e.message);
      // conservative defaults
      shouldUseSsl = process.env.PG_SSL === 'true' || process.env.NODE_ENV === 'production';
      sslReason = 'fallback (could not parse URL)';
    }

    // Allow explicit override via parameter
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
        connectTimeout: 30000, // 30 seconds
        statement_timeout: 30000,
        query_timeout: 30000
      },
      pool: {
        max: 2, // Reduce for Render free tier
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

  // By default, build with no override
  return buildSequelize(undefined);
};

let sequelizePostgres = getPostgresConnection();
let _sslAttempted = undefined; // track whether SSL was explicitly attempted

// Test connection with retry logic and automatic SSL fallback
const testConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await sequelizePostgres.authenticate();
      console.log('✅ PostgreSQL connection authenticated');

      // Test a simple query
      const [result] = await sequelizePostgres.query('SELECT version()');
      console.log('📊 PostgreSQL version:', result[0]?.version?.split(' ')[1] || 'Unknown');

      return true;
    } catch (error) {
      retries--;
      const message = error && error.message ? error.message : String(error);
      console.error(`❌ PostgreSQL connection failed. Retries left: ${retries}`, message);

      // If the error indicates SSL not supported and we haven't tried disabling SSL yet, retry without SSL
      if (message.includes('does not support SSL') || message.includes('no pg_hba.conf')) {
        if (_sslAttempted !== false) {
          console.warn('⚠️ Detected server does not support SSL. Retrying connection with SSL disabled...');
          // Recreate sequelize instance with SSL disabled
          sequelizePostgres = getPostgresConnection(false);
          _sslAttempted = false;
          // continue loop to retry immediately
          continue;
        }
      }

      if (retries === 0) {
        console.error('❌ All PostgreSQL connection attempts failed');
        return false;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Auto-test connection only when host configuration looks valid
const isHostValid = () => {
  if (process.env.DATABASE_URL) return true;
  const host = process.env.POSTGRES_HOST || 'localhost';
  if (host === 'localhost') return true;
  // Consider host valid only if it's a fully-qualified domain (contains a dot)
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

module.exports = sequelizePostgres;