const mongoose = require('mongoose');

// define schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
      default: '',
    },
    location: {
      city: {
        type: String,
        trim: true,
        maxlength: [50, 'City name cannot be more than 50 characters'],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State name cannot be more than 50 characters'],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country name cannot be more than 50 characters'],
      },
    },
    avatar: {
      type: String(URL),
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    preferences: {
      maxDistance: {
        type: Number,
        default: 50,
        min: 1,
        max: 500,
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// compile model from schema
const user = mongoose.model('User', userSchema);
