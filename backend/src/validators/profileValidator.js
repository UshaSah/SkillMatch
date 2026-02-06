const Joi = require('joi');

// Skill validation schema
const skillSchema = Joi.object({
  name: Joi.string().trim().required().max(50),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate'),
  category: Joi.string().trim().required().max(50)
});

// Location coordinates validation
const coordinatesSchema = Joi.array()
  .items(Joi.number())
  .length(2)
  .custom((value, helpers) => {
    const [lng, lat] = value;
    if (lng < -180 || lng > 180) {
      return helpers.error('coordinates.longitude.invalid');
    }
    if (lat < -90 || lat > 90) {
      return helpers.error('coordinates.latitude.invalid');
    }
    return value;
  }, 'Coordinates validation')
  .messages({
    'coordinates.longitude.invalid': 'Longitude must be between -180 and 180',
    'coordinates.latitude.invalid': 'Latitude must be between -90 and 90'
  });

// Location address validation
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).allow('', null),
  city: Joi.string().trim().max(100).allow('', null),
  state: Joi.string().trim().max(100).allow('', null),
  zipCode: Joi.string().trim().max(20).allow('', null),
  country: Joi.string().trim().max(100).allow('', null)
});

// Location validation
const locationSchema = Joi.object({
  coordinates: coordinatesSchema.required(),
  address: addressSchema.optional()
});

// Availability time slot validation
const timeSlotSchema = Joi.object({
  start: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required()
});

// Availability validation
const availabilitySchema = Joi.object({
  monday: Joi.array().items(timeSlotSchema).optional(),
  tuesday: Joi.array().items(timeSlotSchema).optional(),
  wednesday: Joi.array().items(timeSlotSchema).optional(),
  thursday: Joi.array().items(timeSlotSchema).optional(),
  friday: Joi.array().items(timeSlotSchema).optional(),
  saturday: Joi.array().items(timeSlotSchema).optional(),
  sunday: Joi.array().items(timeSlotSchema).optional()
});

// Preferences validation
const preferencesSchema = Joi.object({
  notifications: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    newMessages: Joi.boolean().optional(),
    newMatches: Joi.boolean().optional()
  }).optional(),
  privacy: Joi.object({
    showLocation: Joi.boolean().optional(),
    showEmail: Joi.boolean().optional()
  }).optional()
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  displayName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .optional()
    .messages({
      'string.min': 'Display name must be at least 2 characters',
      'string.max': 'Display name cannot exceed 50 characters'
    }),
  bio: Joi.string()
    .max(500)
    .trim()
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),
  skills: Joi.array()
    .items(skillSchema)
    .optional(),
  location: locationSchema.optional(),
  radius: Joi.number()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Radius must be at least 1 mile',
      'number.max': 'Radius cannot exceed 100 miles'
    }),
  avatarUrl: Joi.string()
    .uri()
    .allow('', null)
    .optional()
    .messages({
      'string.uri': 'Avatar URL must be a valid URL'
    }),
  availability: availabilitySchema.optional(),
  preferences: preferencesSchema.optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

module.exports = {
  updateProfileSchema,
  validate
};