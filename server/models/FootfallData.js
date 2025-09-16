const mongoose = require('mongoose');

const FootfallDataSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: true,
    trim: true,
    ref: 'Store'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  entryCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  exitCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  currentOccupancy: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  posRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    // Transactions per minute
  },
  queueData: {
    totalQueue: {
      type: Number,
      default: 0
    },
    avgWaitTime: {
      type: Number,
      default: 0
    },
    tillQueues: [{
      tillNumber: {
        type: Number,
        required: true
      },
      queueLength: {
        type: Number,
        default: 0
      },
      avgServiceTime: {
        type: Number,
        default: 0
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
      }
    }]
  },
  entryDetails: [{
    entryPoint: String,
    count: Number,
    timestamp: Date
  }],
  exitDetails: [{
    exitPoint: String,
    count: Number,
    timestamp: Date
  }],
  // For aggregated hourly/daily data
  dataType: {
    type: String,
    enum: ['realtime', 'hourly', 'daily'],
    default: 'realtime'
  },
  // Additional metadata
  weather: {
    condition: String,
    temperature: Number
  },
  specialEvents: [String],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
FootfallDataSchema.index({ storeId: 1, timestamp: -1 });
FootfallDataSchema.index({ storeId: 1, dataType: 1, timestamp: -1 });
FootfallDataSchema.index({ timestamp: -1 });
FootfallDataSchema.index({ owner: 1, timestamp: -1 });

// Pre-save middleware to calculate current occupancy
FootfallDataSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Calculate running occupancy based on entries and exits
    const latestData = await this.constructor.findOne({
      storeId: this.storeId,
      timestamp: { $lt: this.timestamp }
    }).sort({ timestamp: -1 });

    if (latestData) {
      this.currentOccupancy = Math.max(0, 
        latestData.currentOccupancy + this.entryCount - this.exitCount
      );
    } else {
      this.currentOccupancy = Math.max(0, this.entryCount - this.exitCount);
    }
  }
  next();
});

// Static method to get latest data for a store
FootfallDataSchema.statics.getLatestForStore = function(storeId) {
  return this.findOne({ 
    storeId, 
    dataType: 'realtime' 
  }).sort({ timestamp: -1 });
};

// Static method to get window stats (last N minutes/hours)
FootfallDataSchema.statics.getWindowStats = function(storeId, windowMinutes = 60) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        storeId,
        timestamp: { $gte: windowStart },
        dataType: 'realtime'
      }
    },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: '$entryCount' },
        totalExits: { $sum: '$exitCount' },
        avgPosRate: { $avg: '$posRate' },
        avgOccupancy: { $avg: '$currentOccupancy' },
        maxOccupancy: { $max: '$currentOccupancy' },
        dataPoints: { $sum: 1 },
        latestOccupancy: { $last: '$currentOccupancy' }
      }
    }
  ]);
};

// Instance method to calculate queue metrics
FootfallDataSchema.methods.calculateQueueMetrics = function() {
  if (!this.queueData || !this.queueData.tillQueues) {
    return {
      totalQueue: 0,
      avgWaitTime: 0,
      activeTills: 0
    };
  }

  const activeTills = this.queueData.tillQueues.filter(till => till.status === 'active');
  const totalQueue = activeTills.reduce((sum, till) => sum + till.queueLength, 0);
  const avgWaitTime = activeTills.length > 0 
    ? activeTills.reduce((sum, till) => sum + (till.avgServiceTime * till.queueLength), 0) / activeTills.length 
    : 0;

  return {
    totalQueue,
    avgWaitTime: Math.round(avgWaitTime * 100) / 100,
    activeTills: activeTills.length
  };
};

module.exports = mongoose.model('FootfallData', FootfallDataSchema);