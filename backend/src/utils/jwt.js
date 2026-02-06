const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

/**
 * Generate JWT Access Token
 * @param {Object} payload - User data to encode
 * @returns {String} JWT token
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
  }

  const expiresIn = process.env.JWT_ACCESS_TTL || '15m';

  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      roles: payload.roles || ['user'],
      type: 'access'
    },
    secret,
    {
      expiresIn,
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    }
  );
};

/**
 * Generate JWT Refresh Token
 * @param {Object} payload - User data to encode
 * @returns {String} JWT token
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
  }

  const expiresIn = process.env.JWT_REFRESH_TTL || '7d';

  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      type: 'refresh',
      tokenVersion: payload.tokenVersion || 1
    },
    secret,
    {
      expiresIn,
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    roles: user.roles || ['user'],
    tokenVersion: user.tokenVersion || 1
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify JWT Token
 * @param {String} token - JWT token to verify
 * @param {String} expectedType - Expected token type ('access' or 'refresh')
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, expectedType = 'access') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    });

    // Verify token type
    if (decoded.type !== expectedType) {
      throw new AppError(`Invalid token type. Expected ${expectedType}`, 401, 'INVALID_TOKEN_TYPE');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
};

/**
 * Decode token without verification (for inspection)
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload (not verified)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  extractTokenFromHeader
};