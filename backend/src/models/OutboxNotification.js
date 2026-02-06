const mongoose = require('mongoose');

const outboxNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'push', 'sms'],
    required: true
  },
  to: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  template: {
    type: String,
    required: true,
    trim: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  dedupeKey: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  nextAttemptAt: {
    type: Date,
    default: Date.now
  },
  lastAttemptAt: {
    type: Date
  },
  lastError: {
    message: String,
    code: String,
    stack: String
  },
  sentAt: {
    type: Date
  },
  externalId: {
    type: String, // SES message ID, push notification ID, etc.
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  },
  metadata: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread'
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing'
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
outboxNotificationSchema.index({ status: 1, nextAttemptAt: 1 }); // For worker queries
outboxNotificationSchema.index({ dedupeKey: 1 }, { unique: true });
outboxNotificationSchema.index({ type: 1, status: 1 });
outboxNotificationSchema.index({ 'metadata.userId': 1 });
outboxNotificationSchema.index({ scheduledFor: 1 });
outboxNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
outboxNotificationSchema.index({ 
  status: 1, 
  priority: 1, 
  nextAttemptAt: 1 
}); // Compound index for worker

// Virtual for retry delay calculation
outboxNotificationSchema.virtual('retryDelay').get(function() {
  if (this.attempts === 0) return 0;
  
  // Exponential backoff with jitter: 1s, 5s, 25s, 125s, 625s
  const baseDelay = Math.pow(5, this.attempts - 1) * 1000; // Convert to milliseconds
  const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
  return Math.min(baseDelay + jitter, 10 * 60 * 1000); // Cap at 10 minutes
});

// Instance method to mark as sent
outboxNotificationSchema.methods.markAsSent = function(externalId = null) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.externalId = externalId;
  return this.save();
};

// Instance method to mark as failed
outboxNotificationSchema.methods.markAsFailed = function(error) {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  this.lastError = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack
  };

  if (this.attempts >= this.maxAttempts) {
    this.status = 'failed';
  } else {
    // Schedule next attempt with exponential backoff
    this.nextAttemptAt = new Date(Date.now() + this.retryDelay);
  }

  return this.save();
};

// Instance method to cancel notification
outboxNotificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Instance method to reschedule
outboxNotificationSchema.methods.reschedule = function(scheduledFor) {
  this.scheduledFor = scheduledFor;
  this.nextAttemptAt = scheduledFor;
  this.status = 'pending';
  return this.save();
};

// Static method to get pending notifications for processing
outboxNotificationSchema.statics.getPendingNotifications = function(limit = 100) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() },
    nextAttemptAt: { $lte: new Date() },
    isActive: true
  })
  .sort({ priority: -1, createdAt: 1 }) // High priority first, then by creation time
  .limit(limit);
};

// Static method to get failed notifications for manual review
outboxNotificationSchema.statics.getFailedNotifications = function(limit = 50) {
  return this.find({
    status: 'failed',
    isActive: true
  })
  .sort({ lastAttemptAt: -1 })
  .limit(limit);
};

// Static method to create notification with deduplication
outboxNotificationSchema.statics.createNotification = async function(notificationData) {
  const { dedupeKey, ...data } = notificationData;
  
  // Check if notification with same dedupeKey already exists
  const existing = await this.findOne({ dedupeKey });
  
  if (existing) {
    // Update existing notification if it's not sent
    if (existing.status !== 'sent') {
      Object.assign(existing, data);
      return existing.save();
    }
    return existing; // Return existing if already sent
  }
  
  // Create new notification
  return this.create({ ...data, dedupeKey });
};

// Static method to cleanup old notifications
outboxNotificationSchema.statics.cleanup = function() {
  return this.deleteMany({
    $or: [
      { status: 'sent', sentAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days
      { status: 'failed', lastAttemptAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7 days
      { expiresAt: { $lt: new Date() } }
    ]
  });
};

module.exports = mongoose.model('OutboxNotification', outboxNotificationSchema);
