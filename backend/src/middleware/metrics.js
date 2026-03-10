const metricsService = require('../services/aws/metricsService');

/**
 * Middleware to track API requests and responses
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const route = req.route ? req.route.path : req.path;
  const method = req.method;

  // Track response when it finishes
  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Track the request
    metricsService.trackRequest(route, method, statusCode, latencyMs);

    // Track errors
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'ServerError' : 'ClientError';
      metricsService.trackError(route, method, statusCode, errorType);
    }
  });

  next();
};

module.exports = metricsMiddleware;
