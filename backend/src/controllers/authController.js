const crypto = require('crypto');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { generateTokenPair, verifyToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const metricsService = require('../services/aws/metricsService');

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Auto-generate displayName from email if not provided
    const finalDisplayName = displayName || email.split('@')[0];

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      emailVerified: false
    });

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;

    await user.save();

    // Create profile
    const profile = new Profile({
      userId: user._id,
      displayName: finalDisplayName,
      skills: [],
      location: {
        type: 'Point',
        coordinates: [0, 0] // Default location, user can update later
      }
    });

    await profile.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Log registration
    logger.info('User registered', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    // Track registration metric
    metricsService.trackAuth('register', true);

    // TODO: Queue email verification notification
    // await queueEmailVerification(user.email, emailVerificationToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          roles: user.roles
        },
        profile: {
          displayName: profile.displayName
        },
        tokens: {
          accessToken,
          refreshToken
        }
      },
      message: 'Registration successful. Please verify your email.',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Track failed login
      metricsService.trackAuth('login', false, 'user_not_found');
      
      // Increment login attempts for security
      // (We can't increment on non-existent user, but we log it)
      logger.warn('Login attempt with non-existent email', {
        requestId: req.requestId,
        email: email.toLowerCase()
      });

      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AppError(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        401,
        'ACCOUNT_LOCKED'
      );
    }

    // Check if account is active
    if (!user.isActive) {
      metricsService.trackAuth('login', false, 'account_inactive');
      throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();

      logger.warn('Failed login attempt', {
        requestId: req.requestId,
        userId: user._id,
        email: user.email,
        attempts: user.loginAttempts + 1
      });

      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Log successful login
    logger.info('User logged in', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    // Track successful login
    metricsService.trackAuth('login', true);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          roles: user.roles
        },
        tokens: {
          accessToken,
          refreshToken
        }
      },
      message: 'Login successful',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    // Verify refresh token
    const decoded = verifyToken(token, 'refresh');

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
    }

    // Check token version (for token rotation/revocation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

    logger.info('Token refreshed', {
      requestId: req.requestId,
      userId: user._id
    });

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      },
      message: 'Token refreshed successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (invalidate refresh token)
 */
const logout = async (req, res, next) => {
  try {
    // Increment token version to invalidate all refresh tokens
    // This is a simple approach - in production, you might want a token blacklist
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.tokenVersion = (user.tokenVersion || 1) + 1;
        await user.save();
      }

      logger.info('User logged out', {
        requestId: req.requestId,
        userId: req.user._id
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * Returns user info and profile in a frontend-friendly format
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const profile = await Profile.findOne({ userId: req.user._id });

    // Format response for frontend
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          roles: user.roles,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        profile: profile ? {
          id: profile._id,
          displayName: profile.displayName,
          bio: profile.bio,
          skills: profile.skills,
          location: {
            coordinates: profile.location.coordinates,
            address: profile.location.address,
            fullAddress: profile.fullAddress
          },
          radius: profile.radius,
          avatarUrl: profile.avatarUrl,
          reputation: profile.reputation,
          rating: profile.rating,
          availability: profile.availability,
          preferences: profile.preferences,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        } : null
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerified: false
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    logger.info('Email verified', {
      requestId: req.requestId,
      userId: user._id
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  verifyEmail
};