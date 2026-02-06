const Profile = require('../models/Profile');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Find or create profile
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      // Create profile if it doesn't exist
      profile = new Profile({
        userId,
        displayName: updates.displayName || req.user.email.split('@')[0],
        skills: [],
        location: {
          type: 'Point',
          coordinates: updates.location?.coordinates || [0, 0]
        }
      });
    }

    // Update fields
    if (updates.displayName !== undefined) {
      profile.displayName = updates.displayName;
    }

    if (updates.bio !== undefined) {
      profile.bio = updates.bio;
    }

    if (updates.skills !== undefined) {
      profile.skills = updates.skills;
    }

    if (updates.location !== undefined) {
      if (updates.location.coordinates) {
        profile.location.coordinates = updates.location.coordinates;
      }
      if (updates.location.address) {
        profile.location.address = {
          ...profile.location.address,
          ...updates.location.address
        };
      }
    }

    if (updates.radius !== undefined) {
      profile.radius = updates.radius;
    }

    if (updates.avatarUrl !== undefined) {
      profile.avatarUrl = updates.avatarUrl;
    }

    if (updates.availability !== undefined) {
      profile.availability = {
        ...profile.availability,
        ...updates.availability
      };
    }

    if (updates.preferences !== undefined) {
      if (updates.preferences.notifications) {
        profile.preferences.notifications = {
          ...profile.preferences.notifications,
          ...updates.preferences.notifications
        };
      }
      if (updates.preferences.privacy) {
        profile.preferences.privacy = {
          ...profile.preferences.privacy,
          ...updates.preferences.privacy
        };
      }
    }

    await profile.save();

    // Log profile update
    logger.info('Profile updated', {
      requestId: req.requestId,
      userId: userId,
      updatedFields: Object.keys(updates)
    });

    res.json({
      success: true,
      data: {
        profile: profile
      },
      message: 'Profile updated successfully',
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.json({
        success: true,
        data: {
          profile: null
        },
        message: 'Profile not found. Create one by updating your profile.',
        requestId: req.requestId
      });
    }

    res.json({
      success: true,
      data: {
        profile: profile
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  getProfile
};