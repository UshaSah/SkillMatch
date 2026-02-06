const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    default: null
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  messageCount: {
    type: Number,
    default: 0
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
threadSchema.index({ 'participants.userId': 1 });
threadSchema.index({ listingId: 1 });
threadSchema.index({ status: 1 });
threadSchema.index({ 'lastMessage.sentAt': -1 });
threadSchema.index({ 
  'participants.userId': 1, 
  status: 1, 
  'lastMessage.sentAt': -1 
}); // Compound index for user threads

// Virtual for thread participants (excluding current user)
threadSchema.virtual('otherParticipants').get(function() {
  return this.participants.filter(p => p.isActive);
});

// Instance method to add participant
threadSchema.methods.addParticipant = function(userId) {
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (!existingParticipant) {
    this.participants.push({
      userId: userId,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      isActive: true
    });
  } else if (!existingParticipant.isActive) {
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
  }
  
  return this.save();
};

// Instance method to remove participant
threadSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.isActive = false;
  }
  return this.save();
};

// Instance method to update last read time
threadSchema.methods.updateLastRead = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
  }
  return this.save();
};

// Instance method to get unread count for user
threadSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) return 0;
  
  // This would need to be calculated based on messages after lastReadAt
  // For now, return a placeholder
  return this.unreadCount;
};

// Static method to find or create thread between users
threadSchema.statics.findOrCreate = async function(userId1, userId2, listingId = null, subject = null) {
  // Look for existing active thread between these users
  let thread = await this.findOne({
    'participants.userId': { $all: [userId1, userId2] },
    status: 'active',
    isActive: true
  });

  if (!thread) {
    // Create new thread
    thread = new this({
      participants: [
        { userId: userId1, joinedAt: new Date(), lastReadAt: new Date() },
        { userId: userId2, joinedAt: new Date(), lastReadAt: new Date() }
      ],
      listingId: listingId,
      subject: subject
    });
    await thread.save();
  }

  return thread;
};

// Static method to get user's threads
threadSchema.statics.getUserThreads = function(userId, limit = 20, skip = 0) {
  return this.find({
    'participants.userId': userId,
    'participants.isActive': true,
    status: 'active',
    isActive: true
  })
  .populate('participants.userId', 'email')
  .populate('listingId', 'title type')
  .populate('lastMessage.senderId', 'email')
  .sort({ 'lastMessage.sentAt': -1 })
  .limit(limit)
  .skip(skip);
};

module.exports = mongoose.model('Thread', threadSchema);
