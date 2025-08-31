const mongoose = require('mongoose');

const matchSchema = new mongoose.model({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skillToTeach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
  },
  skillToLearn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'],
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  meetingDetails: {
    method: String,
    enum: ['In-person', 'Online', 'Both'],
    location: String,
    onlinePlatform: String,
    scheduledDate: Date,
    duration: Number(15 - 480),
  },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      content: String,
      timestamp: Date,
      isRead: Boolean,
    },
  ],
  ratings: {
    user1Rating: {
      rating: Number(1 - 5),
      comment: String,
      maxlength: [500, 'Comment can not be more than 500 characters'],
      timestamp: Date,
    },
    user2Rating: {
      rating: Number(1 - 5),
      comment: String,
      maxlength: [500, 'Comment can not be more than 500 characters'],
      timestamp: Date,
    },
  },
  creditTransactions: {
    learnerPaid: Number,
    teacherEarned: Number,
    platformFee: Number,
    transactionFee: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: Date,
  updatedAt: Date,
});

module.exports = mongoose.model('Match', matchSchema);
