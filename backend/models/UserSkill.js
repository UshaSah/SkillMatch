const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    proficiencyLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner',
    },
    canTeach: {
      type: Boolean,
      default: false,
    },
    wantsToLearn: {
      type: Boolean,
      default: false,
    },
    experience: {
      type: String,
      maxlength: [
        1000,
        'Exprerience description cannot be more than 1000 characters',
      ],
      default: '',
    },
    availability: {
      weekdays: {
        type: Boolean,
        default: true,
      },
      weekends: {
        type: Boolean,
        default: true,
      },
      evenings: {
        type: Boolean,
        default: false,
      },
      mornings: {
        type: Boolean,
        default: false,
      },
    },
    preferredMethod: {
      type: String,
      enum: ['In-person', 'Online', 'Both'],
      default: 'Both',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('userSkill', UserSkill);
