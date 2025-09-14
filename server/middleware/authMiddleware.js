const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../config/firebase');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// Authentication middleware that accepts both JWT and Firebase tokens
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try to verify as JWT token first
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }

      req.user = { userId: decoded.userId };
      return next();

    } catch (jwtError) {
      // If JWT verification fails, try Firebase token verification
      try {
        const decodedFirebaseToken = await verifyFirebaseToken(token);
        
        // Find user by Firebase UID
        const user = await User.findOne({ 
          firebaseUid: decodedFirebaseToken.uid,
          authProvider: 'google'
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid Firebase token. User not found.'
          });
        }

        req.user = { userId: user._id };
        return next();

      } catch (firebaseError) {
        // Both JWT and Firebase token verification failed
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Authentication failed.',
          details: process.env.NODE_ENV === 'development' ? {
            jwtError: jwtError.message,
            firebaseError: firebaseError.message
          } : undefined
        });
      }
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    // Try JWT first
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      req.user = user ? { userId: decoded.userId } : null;
      return next();
    } catch (jwtError) {
      // Try Firebase token
      try {
        const decodedFirebaseToken = await verifyFirebaseToken(token);
        const user = await User.findOne({ 
          firebaseUid: decodedFirebaseToken.uid,
          authProvider: 'google'
        });
        req.user = user ? { userId: user._id } : null;
        return next();
      } catch (firebaseError) {
        req.user = null;
        return next();
      }
    }

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    return next();
  }
};

// Admin middleware (requires user to be authenticated and admin)
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin verification'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminMiddleware
};