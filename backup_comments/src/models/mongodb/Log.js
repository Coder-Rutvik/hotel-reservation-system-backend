const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: false
  },
  action: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for faster queries
logSchema.index({ timestamp: -1 });
logSchema.index({ userId: 1 });
logSchema.index({ action: 1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;