const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['offer', 'request'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    category: {
      type: String,
      required: true,
      trim: true
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  compensation: {
    type: {
      type: String,
      enum: ['free', 'paid', 'trade', 'negotiable'],
      default: 'free'
    },
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    description: String
  },
  timeCommitment: {
    type: String,
    enum: ['one-time', 'short-term', 'long-term', 'ongoing'],
    default: 'one-time'
  },
  estimatedHours: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  contactMethod: {
    type: String,
    enum: ['message', 'email', 'phone'],
    default: 'message'
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  viewCount: {
    type: Number,
    default: 0
  },
  interestCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
listingSchema.index({ ownerId: 1 });
listingSchema.index({ type: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
listingSchema.index({ 'skills.name': 1 });
listingSchema.index({ 'skills.category': 1 });
listingSchema.index({ tags: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
listingSchema.index({ 
  type: 1, 
  status: 1, 
  'location.coordinates': '2dsphere',
  createdAt: -1 
}); // Compound index for search

// Virtual for full address
listingSchema.virtual('fullAddress').get(function() {
  if (!this.location.address) return null;
  const { street, city, state, zipCode, country } = this.location.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

// Virtual for time remaining
listingSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const timeLeft = this.expiresAt.getTime() - now.getTime();
  return timeLeft > 0 ? Math.ceil(timeLeft / (1000 * 60 * 60 * 24)) : 0; // days
});

// Instance method to increment view count
listingSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment interest count
listingSchema.methods.incrementInterestCount = function() {
  this.interestCount += 1;
  return this.save();
};

// Static method to find nearby listings
listingSchema.statics.findNearby = function(coordinates, maxDistance = 25, limit = 20) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance * 1609.34 // Convert miles to meters
      }
    },
    status: 'active',
    isActive: true
  }).limit(limit);
};

// Pre-save middleware to update tags from skills
listingSchema.pre('save', function(next) {
  if (this.isModified('skills')) {
    this.tags = [...new Set([
      ...this.skills.map(skill => skill.name.toLowerCase()),
      ...this.skills.map(skill => skill.category.toLowerCase())
    ])];
  }
  next();
});

module.exports = mongoose.model('Listing', listingSchema);
