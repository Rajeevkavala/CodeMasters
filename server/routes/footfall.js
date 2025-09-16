const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const FootfallData = require('../models/FootfallData');
const Store = require('../models/Store');
const Alert = require('../models/Alert');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/footfall/ingest
// @desc    Ingest footfall data (entry/exit counts, POS rate)
// @access  Private
router.post('/ingest', [
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('entryCount').isInt({ min: 0 }).withMessage('Entry count must be non-negative'),
  body('exitCount').isInt({ min: 0 }).withMessage('Exit count must be non-negative'),
  body('posRate').isFloat({ min: 0 }).withMessage('POS rate must be non-negative')
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
      entryCount,
      exitCount,
      posRate,
      queueData,
      entryDetails,
      exitDetails,
      weather,
      specialEvents
    } = req.body;

    // Verify store exists and belongs to user
    const store = await Store.findOne({
      storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    // Create footfall data entry
    const footfallData = new FootfallData({
      storeId,
      entryCount,
      exitCount,
      posRate,
      queueData,
      entryDetails,
      exitDetails,
      weather,
      specialEvents,
      owner: req.user.userId
    });

    await footfallData.save();

    // Calculate queue metrics
    const queueMetrics = footfallData.calculateQueueMetrics();

    // Auto-generate alerts based on the data
    const alertData = {
      queueLength: queueMetrics.totalQueue,
      avgWaitTime: queueMetrics.avgWaitTime,
      currentOccupancy: footfallData.currentOccupancy,
      posRate: footfallData.posRate
    };

    // Create staffing alert if needed
    await Alert.createStaffingAlert(storeId, req.user.userId, alertData);

    // Create individual till alerts if needed
    if (queueData && queueData.tillQueues) {
      for (const till of queueData.tillQueues) {
        await Alert.createQueueAlert(storeId, req.user.userId, {
          queueLength: till.queueLength,
          tillNumber: till.tillNumber,
          avgWaitTime: till.avgServiceTime * till.queueLength
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Footfall data ingested successfully',
      data: {
        ...footfallData.toObject(),
        queueMetrics
      }
    });

  } catch (error) {
    console.error('Ingest footfall data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while ingesting footfall data'
    });
  }
});

// @route   GET /api/footfall/latest/:storeId
// @desc    Get latest footfall data for a store
// @access  Private
router.get('/latest/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    // Verify store belongs to user
    const store = await Store.findOne({
      storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    const latestData = await FootfallData.getLatestForStore(storeId);

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: 'No footfall data found for this store'
      });
    }

    const queueMetrics = latestData.calculateQueueMetrics();

    res.json({
      success: true,
      data: {
        ...latestData.toObject(),
        queueMetrics
      }
    });

  } catch (error) {
    console.error('Get latest footfall data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching latest footfall data'
    });
  }
});

// @route   GET /api/footfall/window/:storeId
// @desc    Get window statistics for a store (last N minutes)
// @access  Private
router.get('/window/:storeId', [
  query('minutes').optional().isInt({ min: 1 }).withMessage('Minutes must be positive integer')
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

    const { storeId } = req.params;
    const windowMinutes = parseInt(req.query.minutes) || 60; // Default 1 hour

    // Verify store belongs to user
    const store = await Store.findOne({
      storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    const windowStats = await FootfallData.getWindowStats(storeId, windowMinutes);

    if (!windowStats || windowStats.length === 0) {
      return res.json({
        success: true,
        data: {
          windowMinutes,
          totalEntries: 0,
          totalExits: 0,
          avgPosRate: 0,
          avgOccupancy: 0,
          maxOccupancy: 0,
          dataPoints: 0,
          latestOccupancy: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        windowMinutes,
        ...windowStats[0]
      }
    });

  } catch (error) {
    console.error('Get window stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching window statistics'
    });
  }
});

// @route   GET /api/footfall/history/:storeId
// @desc    Get historical footfall data with pagination
// @access  Private
router.get('/history/:storeId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date'),
  query('dataType').optional().isIn(['realtime', 'hourly', 'daily']).withMessage('Data type must be realtime, hourly, or daily')
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

    const { storeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const dataType = req.query.dataType || 'realtime';

    // Verify store belongs to user
    const store = await Store.findOne({
      storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    // Build query
    const query = { 
      storeId,
      dataType,
      owner: req.user.userId
    };

    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      FootfallData.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      FootfallData.countDocuments(query)
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching historical data'
    });
  }
});

// @route   GET /api/footfall/analytics/:storeId
// @desc    Get analytics data (daily/hourly aggregates)
// @access  Private
router.get('/analytics/:storeId', [
  query('period').optional().isIn(['today', 'week', 'month']).withMessage('Period must be today, week, or month'),
  query('groupBy').optional().isIn(['hour', 'day']).withMessage('Group by must be hour or day')
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

    const { storeId } = req.params;
    const period = req.query.period || 'today';
    const groupBy = req.query.groupBy || 'hour';

    // Verify store belongs to user
    const store = await Store.findOne({
      storeId,
      owner: req.user.userId,
      isActive: true
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    // Calculate date range
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    // Aggregation pipeline
    const groupField = groupBy === 'hour' 
      ? { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        }
      : {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };

    const analytics = await FootfallData.aggregate([
      {
        $match: {
          storeId,
          timestamp: { $gte: startDate, $lt: endDate },
          dataType: 'realtime',
          owner: req.user.userId
        }
      },
      {
        $group: {
          _id: groupField,
          totalEntries: { $sum: '$entryCount' },
          totalExits: { $sum: '$exitCount' },
          avgPosRate: { $avg: '$posRate' },
          avgOccupancy: { $avg: '$currentOccupancy' },
          maxOccupancy: { $max: '$currentOccupancy' },
          avgQueueLength: { $avg: '$queueData.totalQueue' },
          dataPoints: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        analytics
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics data'
    });
  }
});

module.exports = router;