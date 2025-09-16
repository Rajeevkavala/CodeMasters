const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const Store = require('../models/Store');
const FootfallData = require('../models/FootfallData');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/stores
// @desc    Create a new store
// @access  Private
router.post('/', [
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('storeName').notEmpty().withMessage('Store name is required'),
  body('tillCount').isInt({ min: 1 }).withMessage('Till count must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      storeId,
      storeName,
      location,
      configuration,
    } = req.body;

    // Check if store ID already exists for this user
    const existingStore = await Store.findOne({ 
      storeId, 
      owner: req.user.userId 
    });

    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'Store with this ID already exists'
      });
    }

    const store = new Store({
      storeId,
      storeName,
      location,
      configuration,
      owner: req.user.userId
    });

    await store.save();

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store
    });

  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating store'
    });
  }
});

// @route   GET /api/stores
// @desc    Get all stores for authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const stores = await Store.find({ 
      owner: req.user.userId,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: stores.length,
      stores
    });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stores'
    });
  }
});

// @route   GET /api/stores/:storeId
// @desc    Get single store by ID
// @access  Private
router.get('/:storeId', async (req, res) => {
  try {
    const store = await Store.findOne({
      storeId: req.params.storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Get latest footfall data for this store
    const latestData = await FootfallData.getLatestForStore(req.params.storeId);

    res.json({
      success: true,
      store,
      latestFootfallData: latestData
    });

  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching store'
    });
  }
});

// @route   PUT /api/stores/:storeId
// @desc    Update store configuration
// @access  Private
router.put('/:storeId', [
  body('storeName').optional().notEmpty().withMessage('Store name cannot be empty'),
  body('configuration.tillCount').optional().isInt({ min: 1 }).withMessage('Till count must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const store = await Store.findOne({
      storeId: req.params.storeId,
      owner: req.user.userId
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['storeName', 'location', 'configuration'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(store, updates);
    await store.save();

    res.json({
      success: true,
      message: 'Store updated successfully',
      store
    });

  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating store'
    });
  }
});

// @route   DELETE /api/stores/:storeId
// @desc    Soft delete store (set inactive)
// @access  Private
router.delete('/:storeId', async (req, res) => {
  try {
    const store = await Store.findOne({
      storeId: req.params.storeId,
      owner: req.user.userId
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    store.isActive = false;
    await store.save();

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });

  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting store'
    });
  }
});

module.exports = router;