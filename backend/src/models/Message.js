const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ threadId: 1, createdAt: -1 }); // For thread messages
messageSchema.index({ senderId: 1 });
messageSchema.index({ recipientId: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ threadId: 1, isRead: 1 }); // For unread messages

// Virtual for message age
messageSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    userId: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
  return this.save();
};

// Static method to get thread messages with pagination
messageSchema.statics.getThreadMessages = function(threadId, limit = 50, skip = 0) {
  return this.find({
    threadId: threadId,
    isActive: true
  })
  .populate('senderId', 'email')
  .populate('recipientId', 'email')
  .populate('replyTo', 'content senderId')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get unread messages for user
messageSchema.statics.getUnreadMessages = function(userId) {
  return this.find({
    recipientId: userId,
    isRead: false,
    isActive: true
  })
  .populate('threadId', 'subject')
  .populate('senderId', 'email')
  .sort({ createdAt: -1 });
};

// Static method to mark thread messages as read
messageSchema.statics.markThreadAsRead = function(threadId, userId) {
  return this.updateMany({
    threadId: threadId,
    recipientId: userId,
    isRead: false
  }, {
    $set: {
      isRead: true,
      readAt: new Date()
    }
  });
};

// Pre-save middleware to update thread's last message
messageSchema.post('save', async function() {
  const Thread = mongoose.model('Thread');
  await Thread.findByIdAndUpdate(this.threadId, {
    $set: {
      'lastMessage.content': this.content,
      'lastMessage.senderId': this.senderId,
      'lastMessage.sentAt': this.createdAt
    },
    $inc: { messageCount: 1 }
  });
});

module.exports = mongoose.model('Message', messageSchema);
