/**
 * Rate Limiting Middleware
 * 
 * This module provides different rate limiting strategies:
 * 1. IP-based: Limits by IP address (good for public endpoints)
 * 2. User-based: Limits by authenticated user ID (better for authenticated endpoints)
 * 
 * Why User-based for Messaging?
 * - Users are authenticated (we know their ID)
 * - More accurate than IP (IPs can change, be shared, or use VPNs)
 * - Prevents abuse even if user changes IP
 * - Better user experience (fair limits per user)
 */

const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorHandler');

/**
 * Create a user-based rate limiter
 * 
 * @param {Object} options - Rate limit configuration
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message when limit exceeded
 * @returns {Function} Express middleware
 * 
 * How it works:
 * 1. Uses req.user._id (from authentication) as the key
 * 2. Stores request count in memory (or Redis in production)
 * 3. Resets count after windowMs expires
 * 4. Returns 429 (Too Many Requests) if limit exceeded
 */
function createUserRateLimiter(options) {
  const {
    windowMs = 60 * 1000, // Default: 1 minute
    max = 10,              // Default: 10 requests
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    
    // Custom key generator: Use user ID instead of IP
    // This is the KEY difference from IP-based limiting
    keyGenerator: (req) => {
      // If user is authenticated, use their ID
      if (req.user && req.user._id) {
        return `user:${req.user._id.toString()}`;
      }
      // Fallback to IP if not authenticated (shouldn't happen with auth middleware)
      return req.ip || req.connection.remoteAddress;
    },
    
    // Custom handler for when limit is exceeded
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000); // Convert to seconds
      
      res.status(429).json({
        success: false,
        error: {
          message: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfter, // Tell client when they can try again
          limit: max,
          window: `${windowMs / 1000}s`
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    },
    
    // Skip rate limiting in test environment
    skip: (req) => {
      return process.env.NODE_ENV === 'test';
    }
  });
}

/**
 * Message sending rate limiter
 * 
 * Limits: 10 messages per minute per user
 * 
 * Why these limits?
 * - 10/minute = reasonable for human typing speed
 * - Prevents spam/abuse
 * - Still allows normal conversation flow
 * - Protects database from rapid writes
 */
const messageRateLimiter = createUserRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // 10 messages per minute
  message: 'You are sending messages too quickly. Please wait a moment before sending another message.'
});

/**
 * Thread creation rate limiter
 * 
 * Limits: 5 threads per 15 minutes per user
 * 
 * Why these limits?
 * - Prevents spam thread creation
 * - 5 per 15 min = reasonable for legitimate use
 * - Stops abuse of thread creation endpoint
 */
const threadCreationRateLimiter = createUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 threads per 15 minutes
  message: 'You are creating threads too quickly. Please wait before creating another thread.'
});

/**
 * General messaging API rate limiter
 * 
 * Limits: 60 requests per minute per user
 * 
 * Why these limits?
 * - Covers GET requests (getThreads, getMessages, etc.)
 * - Higher limit since reads are less expensive
 * - Prevents API abuse
 */
const messagingApiRateLimiter = createUserRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // 60 requests per minute
  message: 'Too many requests to messaging API. Please slow down.'
});

module.exports = {
  createUserRateLimiter,
  messageRateLimiter,
  threadCreationRateLimiter,
  messagingApiRateLimiter
};
