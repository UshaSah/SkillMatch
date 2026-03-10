# CloudWatch Metrics Service

This document describes the CloudWatch metrics service implementation for tracking application performance and business metrics.

## Overview

The CloudWatch metrics service automatically tracks API requests, errors, latency, and custom business metrics. Metrics are batched and sent to CloudWatch for efficient processing and cost optimization.

## Features

- **Automatic Request Tracking**: All API requests are tracked with route, method, status code, and latency
- **Error Tracking**: 4xx and 5xx errors are tracked separately with error types
- **Latency Percentiles**: P50, P95, and P99 latency metrics calculated automatically
- **Business Metrics**: Custom metrics for auth, messaging, notifications, uploads, etc.
- **Batched Sending**: Metrics are batched (up to 20 per request) for efficiency
- **Graceful Degradation**: Service continues working even if CloudWatch is unavailable

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Enable/disable CloudWatch metrics (default: true)
ENABLE_CLOUDWATCH_METRICS=true

# CloudWatch namespace (default: SkillMatch/API)
CLOUDWATCH_NAMESPACE=SkillMatch/API

# AWS Region (default: us-east-1)
AWS_REGION=us-east-1
```

### AWS IAM Permissions

Your ECS task role needs the following CloudWatch permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

## Usage

### Automatic Tracking

The metrics middleware automatically tracks all API requests:

```javascript
// Already integrated in app.js
app.use(metricsMiddleware);
```

This automatically tracks:
- Request count per route/method/status code
- Latency per route/method
- Error counts (4xx, 5xx)

### Manual Tracking

#### Track Authentication Events

```javascript
const metricsService = require('../services/aws/metricsService');

// Track successful login
metricsService.trackAuth('login', true);

// Track failed login
metricsService.trackAuth('login', false, 'invalid_credentials');

// Track registration
metricsService.trackAuth('register', true);
```

#### Track Database Operations

```javascript
const startTime = Date.now();

try {
  await User.findOne({ email });
  const duration = Date.now() - startTime;
  metricsService.trackDatabase('findOne', duration, true);
} catch (error) {
  const duration = Date.now() - startTime;
  metricsService.trackDatabase('findOne', duration, false);
}
```

#### Track Messaging Events

```javascript
// Track message sent
metricsService.trackMessaging('message_sent', 1);

// Track thread created
metricsService.trackMessaging('thread_created', 1);
```

#### Track Notifications

```javascript
// Track successful notification
metricsService.trackNotification('sent', 0);

// Track failed notification with retry
metricsService.trackNotification('failed', 3);
```

#### Track File Uploads

```javascript
try {
  const result = await uploadFile(file);
  metricsService.trackUpload(true, file.size);
} catch (error) {
  metricsService.trackUpload(false, file.size);
}
```

#### Track Custom Metrics

```javascript
// Track any custom business metric
metricsService.trackCustomMetric(
  'ListingsCreated',
  1,
  'Count',
  [
    { Name: 'Type', Value: 'offer' },
    { Name: 'Category', Value: 'programming' }
  ]
);
```

## Metrics Tracked

### API Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `ApiRequests` | Total API requests | Count | Route, Method, StatusCode |
| `ApiLatency` | Request latency | Milliseconds | Route, Method |
| `ApiLatencyP50` | 50th percentile latency | Milliseconds | Route, Method |
| `ApiLatencyP95` | 95th percentile latency | Milliseconds | Route, Method |
| `ApiLatencyP99` | 99th percentile latency | Milliseconds | Route, Method |
| `ApiErrors` | Total errors | Count | Route, Method, StatusCode, ErrorType |
| `ApiServerErrors` | 5xx errors | Count | Route, Method, StatusCode |
| `ApiClientErrors` | 4xx errors | Count | Route, Method, StatusCode |

### Authentication Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `AuthSuccess` | Successful auth events | Count | Event, Success |
| `AuthFailure` | Failed auth events | Count | Event, Success, Reason |

### Database Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `DatabaseOperations` | DB operation count | Count | Operation, Success |
| `DatabaseLatency` | DB operation latency | Milliseconds | Operation, Success |
| `DatabaseErrors` | DB errors | Count | Operation, Success |

### Messaging Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `MessagingEvents` | Messaging events | Count | Event |

### Notification Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `Notifications` | Total notifications | Count | Status, RetryCount |
| `NotificationsSent` | Successful notifications | Count | - |
| `NotificationsFailed` | Failed notifications | Count | - |

### File Upload Metrics

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|------------|
| `FileUploads` | Total uploads | Count | Success |
| `FileUploadSize` | Upload file sizes | Bytes | Success |
| `FileUploadErrors` | Upload errors | Count | Success |

## CloudWatch Dashboard

### Creating a Dashboard

1. Go to CloudWatch Console → Dashboards
2. Create new dashboard: "SkillMatch API Metrics"
3. Add widgets for:

**API Performance Widget:**
```
- ApiRequests (Sum)
- ApiLatencyP95 (Average)
- ApiErrors (Sum)
```

**Authentication Widget:**
```
- AuthSuccess (Sum)
- AuthFailure (Sum)
```

**Error Rate Widget:**
```
- ApiServerErrors (Sum)
- ApiClientErrors (Sum)
```

### Sample Dashboard JSON

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["SkillMatch/API", "ApiRequests", {"stat": "Sum"}],
          [".", "ApiLatencyP95", {"stat": "Average"}],
          [".", "ApiErrors", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Performance"
      }
    }
  ]
}
```

## CloudWatch Alarms

### Recommended Alarms

#### High Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name skillmatch-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name ApiErrors \
  --namespace SkillMatch/API \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

#### High Latency Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name skillmatch-high-latency \
  --alarm-description "Alert when P95 latency exceeds 1 second" \
  --metric-name ApiLatencyP95 \
  --namespace SkillMatch/API \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

#### Database Error Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name skillmatch-database-errors \
  --alarm-description "Alert on database errors" \
  --metric-name DatabaseErrors \
  --namespace SkillMatch/API \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

## Performance Considerations

### Batching

- Metrics are batched (up to 20 per CloudWatch request)
- Automatic flush every 60 seconds
- Immediate flush when batch is full
- Flush on process shutdown (SIGTERM/SIGINT)

### Cost Optimization

- CloudWatch charges per metric ($0.30 per custom metric per month)
- Batching reduces API call costs
- Consider disabling in development: `ENABLE_CLOUDWATCH_METRICS=false`

### Latency Impact

- Metrics are sent asynchronously
- No impact on request latency
- Failed metric sends are logged but don't affect application

## Testing

### Disable Metrics for Testing

```bash
ENABLE_CLOUDWATCH_METRICS=false npm test
```

### Manual Flush (for Testing)

```javascript
const metricsService = require('../services/aws/metricsService');

// Force flush metrics
await metricsService.forceFlush();

// Check queue size
const queueSize = metricsService.getQueueSize();
```

## Troubleshooting

### Metrics Not Appearing

1. **Check IAM Permissions**: Ensure ECS task role has `cloudwatch:PutMetricData`
2. **Check Environment Variables**: Verify `ENABLE_CLOUDWATCH_METRICS=true`
3. **Check Logs**: Look for CloudWatch errors in application logs
4. **Verify Region**: Ensure `AWS_REGION` matches your CloudWatch region

### High CloudWatch Costs

1. **Reduce Metric Dimensions**: Fewer dimensions = fewer unique metrics
2. **Disable in Development**: Set `ENABLE_CLOUDWATCH_METRICS=false` locally
3. **Review Custom Metrics**: Only track essential business metrics

### Metrics Delayed

- Metrics are batched and flushed every 60 seconds
- This is normal behavior for cost optimization
- Use `forceFlush()` if immediate metrics are needed

## Example Integration

### In Auth Controller

```javascript
const metricsService = require('../services/aws/metricsService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      metricsService.trackAuth('login', false, 'invalid_credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check account lockout
    if (user.isLocked) {
      metricsService.trackAuth('login', false, 'account_locked');
      return res.status(423).json({ error: 'Account is locked' });
    }
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    metricsService.trackAuth('login', true);
    
    res.json({ tokens, user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};
```

## Next Steps

1. **Set up CloudWatch Dashboard**: Visualize your metrics
2. **Create Alarms**: Get notified of issues
3. **Add Custom Metrics**: Track business-specific metrics
4. **Review Metrics Regularly**: Use insights to optimize performance

---

*For questions or issues, check the application logs or CloudWatch console.*
