const Log = require('../models/mongodb/Log');

const logger = async (req, res, next) => {
  const start = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    res.send = originalSend;
    res.send(body);
    
    // Log after response is sent
    logRequest(req, res, start, body);
  };

  next();
};

const logRequest = async (req, res, start, responseBody) => {
  try {
    const duration = Date.now() - start;
    
    let parsedBody;
    try {
      parsedBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    } catch {
      parsedBody = responseBody;
    }

    const logData = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      message: `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      userId: req.user ? req.user.userId.toString() : null,
      action: getActionFromRoute(req),
      endpoint: req.originalUrl,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      metadata: {
        method: req.method,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: parsedBody?.success || false,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: shouldLogBody(req) ? req.body : undefined
      },
      timestamp: new Date()
    };

    // Save log to MongoDB
    await Log.create(logData);
  } catch (error) {
    console.error('Logger error:', error);
  }
};

const getActionFromRoute = (req) => {
  const { method, originalUrl } = req;
  
  if (originalUrl.includes('/auth/register')) return 'REGISTER';
  if (originalUrl.includes('/auth/login')) return 'LOGIN';
  if (originalUrl.includes('/bookings') && method === 'POST') return 'CREATE_BOOKING';
  if (originalUrl.includes('/bookings') && method === 'PUT') return 'UPDATE_BOOKING';
  if (originalUrl.includes('/rooms')) return 'VIEW_ROOMS';
  if (originalUrl.includes('/admin')) return 'ADMIN_ACTION';
  
  return `${method}_${originalUrl.split('/')[2]?.toUpperCase() || 'UNKNOWN'}`;
};

const shouldLogBody = (req) => {
  const sensitivePaths = ['/auth/login', '/auth/register', '/auth/change-password'];
  return !sensitivePaths.some(path => req.originalUrl.includes(path));
};

module.exports = logger;