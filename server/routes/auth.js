const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// JWT secret token for authentication 
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// Generate JWT token 
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /auth/signup
// @desc    Register a new user with email/password
// @access  Public
router.post('/signup', [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // checking for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // checking if user is already present in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Creating a new user if they wont exist
    const user = new User({
      name,
      email,
      password,
      authProvider: 'email'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
});

// @route   POST /auth/login
// @desc    Login user with email/password
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email, authProvider: 'email' });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /auth/google
// @desc    Authenticate user with Firebase Google token
// @access  Public
router.post('/google', [
  body('idToken').notEmpty().withMessage('Firebase ID token is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { idToken } = req.body;

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    
    const { uid, email, name, picture } = decodedToken;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email, authProvider: 'google' },
        { firebaseUid: uid }
      ]
    });

    if (!user) {
      // Create new user for Google auth
      user = new User({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        firebaseUid: uid,
        isEmailVerified: true,
        profilePicture: picture || ''
      });

      await user.save();
    } else {
      // Update existing user's Firebase UID if needed
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.isEmailVerified = true;
        if (picture) user.profilePicture = picture;
        await user.save();
      }
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
    });
  }
});

// @route   GET /auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // This route will use the auth middleware
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;