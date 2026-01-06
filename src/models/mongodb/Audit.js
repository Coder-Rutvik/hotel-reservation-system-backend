const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  entity: {
    type: String,
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'],
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  changedBy: {
    type: String,
    required: true
  },
  changedById: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
auditSchema.index({ entity: 1, entityId: 1 });
auditSchema.index({ changedById: 1 });
auditSchema.index({ timestamp: -1 });

const Audit = mongoose.model('Audit', auditSchema);

module.exports = Audit;