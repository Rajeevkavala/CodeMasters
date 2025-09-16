const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  configuration: {
    tillCount: {
      type: Number,
      required: true,
      min: 1
    },
    operatingHours: {
      open: String,
      close: String
    },
    capacity: {
      type: Number,
      default: 100
    },
    entryPoints: [{
      name: String,
      location: String
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
StoreSchema.index({ storeId: 1, owner: 1 });
StoreSchema.index({ isActive: 1 });

module.exports = mongoose.model('Store', StoreSchema);