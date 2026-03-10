const AWS = require('aws-sdk');
const logger = require('../../utils/logger');

// Configure CloudWatch
const cloudwatch = new AWS.CloudWatch({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials will be picked up from environment or IAM role in ECS
});

const NAMESPACE = process.env.CLOUDWATCH_NAMESPACE || 'SkillMatch/API';
const ENABLE_METRICS = process.env.ENABLE_CLOUDWATCH_METRICS !== 'false'; // Default to true

// Batch metrics for efficiency (CloudWatch allows up to 20 metrics per request)
const metricQueue = [];
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 60000; // Flush every 60 seconds

// Latency tracking for percentile calculations
const latencyData = {
  p50: [],
  p95: [],
  p99: []
};

/**
 * Flush queued metrics to CloudWatch
 */
const flushMetrics = async () => {
  if (metricQueue.length === 0) return;

  const batches = [];
  for (let i = 0; i < metricQueue.length; i += BATCH_SIZE) {
    batches.push(metricQueue.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const params = {
        Namespace: NAMESPACE,
        MetricData: batch
      };

      await cloudwatch.putMetricData(params).promise();
      logger.debug('CloudWatch metrics flushed', { count: batch.length });
    } catch (error) {
      logger.error('Failed to flush CloudWatch metrics', {
        error: error.message,
        count: batch.length
      });
    }
  }

  // Clear the queue
  metricQueue.length = 0;
};

// Flush metrics periodically
if (ENABLE_METRICS) {
  setInterval(flushMetrics, FLUSH_INTERVAL);
  
  // Flush on process exit
  process.on('SIGTERM', () => {
    flushMetrics();
  });
  
  process.on('SIGINT', () => {
    flushMetrics();
  });
}

/**
 * Add metric to queue
 */
const putMetric = (metricName, value, unit = 'Count', dimensions = []) => {
  if (!ENABLE_METRICS) return;

  const metric = {
    MetricName: metricName,
    Value: value,
    Unit: unit,
    Timestamp: new Date(),
    ...(dimensions.length > 0 && { Dimensions: dimensions })
  };

  metricQueue.push(metric);

  // Flush immediately if queue is full
  if (metricQueue.length >= BATCH_SIZE) {
    flushMetrics();
  }
};

/**
 * Track API request
 */
const trackRequest = (route, method, statusCode, latencyMs) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Route', Value: route },
    { Name: 'Method', Value: method },
    { Name: 'StatusCode', Value: statusCode.toString() }
  ];

  // Request count
  putMetric('ApiRequests', 1, 'Count', dimensions);

  // Latency
  putMetric('ApiLatency', latencyMs, 'Milliseconds', [
    { Name: 'Route', Value: route },
    { Name: 'Method', Value: method }
  ]);

  // Track latency for percentile calculation
  latencyData.p50.push(latencyMs);
  latencyData.p95.push(latencyMs);
  latencyData.p99.push(latencyMs);

  // Flush percentiles periodically (every 100 requests)
  if (latencyData.p50.length >= 100) {
    calculateAndSendPercentiles(route, method);
  }
};

/**
 * Calculate and send latency percentiles
 */
const calculateAndSendPercentiles = (route, method) => {
  const sorted = [...latencyData.p50].sort((a, b) => a - b);
  
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  const dimensions = [
    { Name: 'Route', Value: route },
    { Name: 'Method', Value: method }
  ];

  putMetric('ApiLatencyP50', p50, 'Milliseconds', dimensions);
  putMetric('ApiLatencyP95', p95, 'Milliseconds', dimensions);
  putMetric('ApiLatencyP99', p99, 'Milliseconds', dimensions);

  // Clear arrays
  latencyData.p50 = [];
  latencyData.p95 = [];
  latencyData.p99 = [];
};

/**
 * Track error
 */
const trackError = (route, method, statusCode, errorType = 'Unknown') => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Route', Value: route },
    { Name: 'Method', Value: method },
    { Name: 'StatusCode', Value: statusCode.toString() },
    { Name: 'ErrorType', Value: errorType }
  ];

  putMetric('ApiErrors', 1, 'Count', dimensions);

  // Track error rate
  if (statusCode >= 500) {
    putMetric('ApiServerErrors', 1, 'Count', dimensions);
  } else if (statusCode >= 400) {
    putMetric('ApiClientErrors', 1, 'Count', dimensions);
  }
};

/**
 * Track authentication events
 */
const trackAuth = (event, success = true, reason = null) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Event', Value: event },
    { Name: 'Success', Value: success.toString() },
    ...(reason ? [{ Name: 'Reason', Value: reason }] : [])
  ];

  if (success) {
    putMetric('AuthSuccess', 1, 'Count', dimensions);
  } else {
    putMetric('AuthFailure', 1, 'Count', dimensions);
  }
};

/**
 * Track database operations
 */
const trackDatabase = (operation, duration, success = true) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Operation', Value: operation },
    { Name: 'Success', Value: success.toString() }
  ];

  putMetric('DatabaseOperations', 1, 'Count', dimensions);
  putMetric('DatabaseLatency', duration, 'Milliseconds', dimensions);

  if (!success) {
    putMetric('DatabaseErrors', 1, 'Count', dimensions);
  }
};

/**
 * Track messaging events
 */
const trackMessaging = (event, count = 1) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Event', Value: event }
  ];

  putMetric('MessagingEvents', count, 'Count', dimensions);
};

/**
 * Track notification delivery
 */
const trackNotification = (status, retryCount = 0) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Status', Value: status },
    { Name: 'RetryCount', Value: retryCount.toString() }
  ];

  putMetric('Notifications', 1, 'Count', dimensions);

  if (status === 'sent') {
    putMetric('NotificationsSent', 1, 'Count');
  } else if (status === 'failed') {
    putMetric('NotificationsFailed', 1, 'Count');
  }
};

/**
 * Track file uploads
 */
const trackUpload = (success = true, fileSize = 0) => {
  if (!ENABLE_METRICS) return;

  const dimensions = [
    { Name: 'Success', Value: success.toString() }
  ];

  putMetric('FileUploads', 1, 'Count', dimensions);
  putMetric('FileUploadSize', fileSize, 'Bytes', dimensions);

  if (!success) {
    putMetric('FileUploadErrors', 1, 'Count', dimensions);
  }
};

/**
 * Track active users
 */
const trackActiveUser = (userId) => {
  if (!ENABLE_METRICS) return;

  // This is a gauge metric - tracks unique users
  putMetric('ActiveUsers', 1, 'Count', [
    { Name: 'UserId', Value: userId }
  ]);
};

/**
 * Track custom business metric
 */
const trackCustomMetric = (metricName, value, unit = 'Count', dimensions = []) => {
  if (!ENABLE_METRICS) return;

  putMetric(metricName, value, unit, dimensions);
};

/**
 * Get current metric queue size (for monitoring)
 */
const getQueueSize = () => {
  return metricQueue.length;
};

/**
 * Force flush metrics (useful for testing or before shutdown)
 */
const forceFlush = async () => {
  await flushMetrics();
};

module.exports = {
  trackRequest,
  trackError,
  trackAuth,
  trackDatabase,
  trackMessaging,
  trackNotification,
  trackUpload,
  trackActiveUser,
  trackCustomMetric,
  calculateAndSendPercentiles,
  getQueueSize,
  forceFlush,
  flushMetrics
};
