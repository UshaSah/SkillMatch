const User = require('../models/User');

// @desc Resgister a new user
// @route POST /api/auth/register
// @access Public

const registerUSer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists ' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @des Authentication user & get token
// @route POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user by email and include password for comaprison
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.comparePassword(password))) {
      await user.updateLastActive();

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        rating: user.rating,
        token: generateToken(user_id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
// @access Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        rating: user.rating,
        preferences: user.rating,
        lastActive: user.lastActive,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Update profile
// @route PUT /api/auth/profile
// @access Private

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.location = req.body.avatar || user.avatar;
      user.preferences = req.body.preferences || user.preferences;

      const updateUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        location: updatedUser.location,
        avatar: updateUser.avatar,
        rating: updatedUser.rating,
        preferences: updateUser.prefrences,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Change password
// @route PUT /api/auth/password
// @access Private

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (user && (await user.comparePassword(currentPassword))) {
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Current password is incorrect' });
    }
  } catch (error) {
    console.error('Change password error: ', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUSer,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
};
