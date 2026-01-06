const Joi = require('joi');
const { ERROR_MESSAGES } = require('../utils/constants');

// User registration validation schema
const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid Indian phone number'
    }),
  
  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Role must be either user or admin'
    })
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'any.required': 'Password is required'
    })
});

// Update profile validation schema
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid Indian phone number'
    })
});

// Change password validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.min': 'New password must be at least 6 characters long',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
});

// Password reset request validation schema
const resetPasswordRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Password reset validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'any.required': 'Reset token is required'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.empty': ERROR_MESSAGES.VALIDATION_ERROR,
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
});

// Validate function
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors: errorMessages
      });
    }

    req.body = value;
    next();
  };
};

// Export validators
module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateResetPasswordRequest: validate(resetPasswordRequestSchema),
  validateResetPassword: validate(resetPasswordSchema)
};