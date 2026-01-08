// Postgres connection helper — single source of truth
const postgresql = require('./postgresql');

const connect = async () => {
  try {
    await postgresql.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    return postgresql;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message || error);
    process.exit(1);
  }
};

const checkAllConnections = async () => {
  const status = { postgresql: { connected: false, error: null } };
  try {
    await postgresql.authenticate();
    status.postgresql.connected = true;
  } catch (err) {
    status.postgresql.error = err.message;
  }
  return status;
};

const closeAllConnections = async () => {
  try {
    await postgresql.close();
    return [{ db: 'PostgreSQL', status: 'closed' }];
  } catch (err) {
    return [{ db: 'PostgreSQL', status: 'error', error: err.message }];
  }
};

module.exports = {
  postgresql,
  connect,
  checkAllConnections,
  closeAllConnections
};