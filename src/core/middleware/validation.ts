import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

// Validation schemas
export interface ValidationSchema {
  body?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null; // Return error message or null
}

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+8801|01)[3-9]\d{8}$/,
  postalCode: /^\d{4}$/,
  slug: /^[a-z0-9-]+$/,
  objectId: /^[0-9a-fA-F]{24}$/,
};

// Validation middleware factory
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    // Validate body
    if (schema.body) {
      Object.entries(schema.body).forEach(([field, rule]) => {
        const value = req.body[field];
        const error = validateField(field, value, rule);
        if (error) {
          errors[field] = error;
        }
      });
    }

    // Validate query parameters
    if (schema.query) {
      Object.entries(schema.query).forEach(([field, rule]) => {
        const value = req.query[field];
        const error = validateField(field, value, rule);
        if (error) {
          errors[field] = error;
        }
      });
    }

    // Validate route parameters
    if (schema.params) {
      Object.entries(schema.params).forEach(([field, rule]) => {
        const value = req.params[field];
        const error = validateField(field, value, rule);
        if (error) {
          errors[field] = error;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      throw new AppError('Validation failed', {
        status: 400,
        code: 'VALIDATION_ERROR'
      });
    }

    next();
  };
}

function validateField(field: string, value: unknown, rule: ValidationRule): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${field} is required`;
  }

  // Skip validation if value is empty and not required
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${field} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `${field} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field} must be a boolean`;
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !patterns.email.test(value)) {
          return `${field} must be a valid email address`;
        }
        break;
      case 'phone':
        if (typeof value !== 'string' || !patterns.phone.test(value)) {
          return `${field} must be a valid Bangladesh phone number (01XXXXXXXXX)`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `${field} must be an array`;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `${field} must be an object`;
        }
        break;
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      return `${field} must be at least ${rule.minLength} characters`;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${field} must be no more than ${rule.maxLength} characters`;
    }
  }

  // Pattern validation
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return `${field} format is invalid`;
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      return customError;
    }
  }

  return null;
}

// Common validation schemas
export const commonSchemas = {
  // User registration
  register: {
    body: {
      firstName: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      lastName: { required: false, type: 'string', maxLength: 50 },
      email: { required: false, type: 'email' },
      phone: { required: true, type: 'phone' },
      password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
    }
  },

  // User login
  login: {
    body: {
      identifier: { required: true, type: 'string', minLength: 1 },
      password: { required: true, type: 'string', minLength: 1 },
      rememberMe: { required: false, type: 'boolean' },
    }
  },

  // Order creation
  createOrder: {
    body: {
      firstName: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      lastName: { required: false, type: 'string', maxLength: 50 },
      email: { required: false, type: 'email' },
      phone: { required: true, type: 'phone' },
      address: { required: true, type: 'string', minLength: 10, maxLength: 200 },
      city: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      area: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      postalCode: { required: true, type: 'string', pattern: patterns.postalCode },
      paymentMethod: { 
        required: true, 
        type: 'string',
        custom: (value: string) => {
          const validMethods = ['bkash', 'nagad', 'rocket', 'card', 'cod'];
          return validMethods.includes(value) ? null : 'Invalid payment method';
        }
      },
      notes: { required: false, type: 'string', maxLength: 500 },
    }
  },

  // Product ID parameter
  productId: {
    params: {
      id: { required: true, type: 'string', pattern: patterns.objectId }
    }
  },

  // Order ID parameter
  orderId: {
    params: {
      id: { required: true, type: 'string', pattern: patterns.objectId }
    }
  },
};
