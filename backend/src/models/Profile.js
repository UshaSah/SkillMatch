const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    trim: true
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
  radius: {
    type: Number,
    default: 25, // miles
    min: [1, 'Radius must be at least 1 mile'],
    max: [100, 'Radius cannot exceed 100 miles']
  },
  avatarUrl: {
    type: String,
    default: null
  },
  reputation: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      newMessages: {
        type: Boolean,
        default: true
      },
      newMatches: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showLocation: {
        type: Boolean,
        default: true
      },
      showEmail: {
        type: Boolean,
        default: false
      }
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
profileSchema.index({ userId: 1 });
profileSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
profileSchema.index({ 'skills.name': 1 });
profileSchema.index({ 'skills.category': 1 });
profileSchema.index({ reputation: -1 });
profileSchema.index({ 'rating.average': -1 });

// Virtual for full address
profileSchema.virtual('fullAddress').get(function() {
  if (!this.location.address) return null;
  const { street, city, state, zipCode, country } = this.location.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

// Instance method to calculate distance from another profile
profileSchema.methods.distanceFrom = function(otherProfile) {
  if (!this.location.coordinates || !otherProfile.location.coordinates) {
    return null;
  }

  const [lon1, lat1] = this.location.coordinates;
  const [lon2, lat2] = otherProfile.location.coordinates;

  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Instance method to check if user is within radius
profileSchema.methods.isWithinRadius = function(otherProfile) {
  const distance = this.distanceFrom(otherProfile);
  return distance !== null && distance <= this.radius;
};

module.exports = mongoose.model('Profile', profileSchema);
