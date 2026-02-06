const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT access token
 * Attaches user to req.user if authenticated
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AppError('Authentication required. Please provide a valid token.', 401, 'AUTH_REQUIRED');
    }

    // Verify token
    const decoded = verifyToken(token, 'access');

    // Fetch user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AppError('Account is temporarily locked due to multiple failed login attempts', 401, 'ACCOUNT_LOCKED');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    // Log authentication
    logger.info('User authenticated', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email,
      route: req.originalUrl
    });

    next();
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error.isOperational) {
      return next(error);
    }

    // Otherwise, create a generic auth error
    next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user to req.user if token is valid, otherwise continues
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token, 'access');
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    // User will be undefined, which is fine
  }

  next();
};

/**
 * Role-based authorization middleware
 * @param {...String} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Unauthorized access attempt', {
        requestId: req.requestId,
        userId: req.user._id,
        userRoles: userRoles,
        requiredRoles: roles,
        route: req.originalUrl
      });

      return next(new AppError(
        'You do not have permission to perform this action',
        403,
        'FORBIDDEN'
      ));
    }

    next();
  };
};

/**
 * Check if user owns resource or is admin
 * @param {String} resourceUserId - User ID of resource owner
 */
const authorizeOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const resourceUserId = req.params.userId || req.body.userId || req.query.userId;
  const isOwner = req.user._id.toString() === resourceUserId?.toString();
  const isAdmin = req.user.roles?.includes('admin');

  if (!isOwner && !isAdmin) {
    return next(new AppError(
      'You do not have permission to access this resource',
      403,
      'FORBIDDEN'
    ));
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeOwnerOrAdmin
};