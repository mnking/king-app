import { z } from 'zod';

// ===========================
// COMMON FIELD VALIDATORS
// ===========================

/**
 * Email validation with custom error messages
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email address is too long');

/**
 * Password validation with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

/**
 * Name validation (person names, project names, etc.)
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name is too long')
  .regex(
    /^[a-zA-Z\s\-.']+$/,
    'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  );

/**
 * Organization/company name validation
 */
export const organizationNameSchema = z
  .string()
  .min(1, 'Organization name is required')
  .min(2, 'Organization name must be at least 2 characters long')
  .max(150, 'Organization name is too long')
  .regex(
    /^[a-zA-Z0-9\s\-.'&()]+$/,
    'Organization name contains invalid characters',
  );

/**
 * Phone number validation (international format)
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^\+?[\d\s\-()]{10,15}$/.test(val),
    'Please enter a valid phone number',
  );

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || z.string().url().safeParse(val).success,
    'Please enter a valid URL',
  );

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Slug validation (URL-friendly strings)
 */
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .min(3, 'Slug must be at least 3 characters long')
  .max(50, 'Slug is too long')
  .regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens',
  )
  .regex(/^[a-z]/, 'Slug must start with a letter')
  .regex(/[a-z0-9]$/, 'Slug must end with a letter or number');

// ===========================
// BUSINESS LOGIC VALIDATORS
// ===========================

/**
 * Date range validation (start date must be before end date)
 */
export const createDateRangeSchema = <T extends Record<string, any>>(
  startDateKey: keyof T,
  endDateKey: keyof T,
  options: {
    startRequired?: boolean;
    endRequired?: boolean;
    allowSameDay?: boolean;
    futureOnly?: boolean;
    pastOnly?: boolean;
  } = {},
) => {
  const {
    startRequired = false,
    endRequired = false,
    allowSameDay = true,
    futureOnly = false,
    pastOnly = false,
  } = options;

  return z
    .object({
      [startDateKey]: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (startRequired && !val) return false;
            if (!val) return true;
            const date = new Date(val);
            if (isNaN(date.getTime())) return false;
            if (futureOnly && date < new Date()) return false;
            if (pastOnly && date > new Date()) return false;
            return true;
          },
          {
            message: startRequired
              ? 'Start date is required'
              : futureOnly
                ? 'Start date must be in the future'
                : pastOnly
                  ? 'Start date must be in the past'
                  : 'Invalid start date',
          },
        ),
      [endDateKey]: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (endRequired && !val) return false;
            if (!val) return true;
            const date = new Date(val);
            if (isNaN(date.getTime())) return false;
            if (futureOnly && date < new Date()) return false;
            if (pastOnly && date > new Date()) return false;
            return true;
          },
          {
            message: endRequired
              ? 'End date is required'
              : futureOnly
                ? 'End date must be in the future'
                : pastOnly
                  ? 'End date must be in the past'
                  : 'Invalid end date',
          },
        ),
    } as Record<keyof T, z.ZodOptional<z.ZodString>>)
    .refine(
      (data) => {
        const startDate = data[startDateKey] as string;
        const endDate = data[endDateKey] as string;

        if (!startDate || !endDate) return true;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (allowSameDay) {
          return start <= end;
        } else {
          return start < end;
        }
      },
      {
        message: allowSameDay
          ? 'End date must be on or after start date'
          : 'End date must be after start date',
        path: [endDateKey as string],
      },
    );
};

/**
 * Capacity validation (ensures value is within reasonable limits)
 */
export const capacitySchema = z
  .number()
  .int('Capacity must be a whole number')
  .min(1, 'Capacity must be at least 1')
  .max(10000, 'Capacity cannot exceed 10,000');

/**
 * Budget validation
 */
export const budgetSchema = z
  .number()
  .min(0, 'Budget cannot be negative')
  .max(1000000000, 'Budget cannot exceed $1 billion')
  .optional();

/**
 * Priority validation
 */
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Please select a valid priority level' }),
});

/**
 * Status validation for different entity types
 */
export const createStatusSchema = <T extends string>(
  validStatuses: T[],
  entityType = 'item',
) =>
  z.enum(validStatuses as [T, ...T[]], {
    errorMap: () => ({ message: `Please select a valid ${entityType} status` }),
  });

// ===========================
// ARRAY AND RELATIONSHIP VALIDATORS
// ===========================

/**
 * Non-empty array validation
 */
export const nonEmptyArraySchema = <T>(
  itemSchema: z.ZodType<T>,
  entityName = 'items',
) =>
  z
    .array(itemSchema)
    .min(1, `At least one ${entityName.slice(0, -1)} is required`);

/**
 * Unique array validation (no duplicates)
 */
export const uniqueArraySchema = <T>(
  itemSchema: z.ZodType<T>,
  keyExtractor: (item: T) => string | number,
  entityName = 'items',
) =>
  z.array(itemSchema).refine((items) => {
    const keys = items.map(keyExtractor);
    return keys.length === new Set(keys).size;
  }, `Duplicate ${entityName} are not allowed`);

/**
 * Team member validation (at least one lead required)
 */
export const teamMembersSchema = z
  .array(
    z.object({
      user_id: uuidSchema,
      role: z.enum(['lead', 'member']),
    }),
  )
  .min(1, 'At least one team member is required')
  .refine(
    (members) => members.some((member) => member.role === 'lead'),
    'At least one team lead is required',
  )
  .refine((members) => {
    const userIds = members.map((m) => m.user_id);
    return userIds.length === new Set(userIds).size;
  }, 'Duplicate team members are not allowed');

// ===========================
// FILE AND UPLOAD VALIDATORS
// ===========================

/**
 * File size validation
 */
export const createFileSizeSchema = (maxSizeMB: number) =>
  z
    .instanceof(File)
    .refine(
      (file) => file.size <= maxSizeMB * 1024 * 1024,
      `File size must be less than ${maxSizeMB}MB`,
    );

/**
 * File type validation
 */
export const createFileTypeSchema = (allowedTypes: string[]) =>
  z
    .instanceof(File)
    .refine(
      (file) => allowedTypes.includes(file.type),
      `File type must be one of: ${allowedTypes.join(', ')}`,
    );

/**
 * Image file validation
 */
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.type.startsWith('image/'), 'File must be an image')
  .refine(
    (file) => file.size <= 5 * 1024 * 1024, // 5MB
    'Image size must be less than 5MB',
  );

// ===========================
// CONDITIONAL VALIDATORS
// ===========================

/**
 * Conditional required field based on another field's value
 */
export const conditionalRequired = <T extends Record<string, any>>(
  field: keyof T,
  condition: (data: T) => boolean,
  schema: z.ZodType,
  message = `${String(field)} is required`,
) =>
  z.any().superRefine((data: T, ctx) => {
    if (condition(data) && !data[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: [field as string],
      });
    }
  });

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Transform and sanitize text input
 */
export const sanitizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Generate password strength indicator
 */
export const getPasswordStrength = (
  password: string,
): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('One uppercase letter');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('One lowercase letter');

  if (/\d/.test(password)) score++;
  else feedback.push('One number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('One special character');

  return { score, feedback };
};

/**
 * Validate and format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Basic formatting for US numbers (can be extended)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return cleaned;
};

/**
 * Deep merge validation errors from multiple schemas
 */
export const mergeValidationErrors = (
  ...errorObjects: Array<Record<string, string | undefined>>
): Record<string, string> => {
  const merged: Record<string, string> = {};

  errorObjects.forEach((errors) => {
    Object.entries(errors).forEach(([key, value]) => {
      if (value && !merged[key]) {
        merged[key] = value;
      }
    });
  });

  return merged;
};

// ===========================
// PRESET VALIDATION SCHEMAS
// ===========================

/**
 * User profile validation schema
 */
export const userProfileSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  job_title: z.string().max(100, 'Job title is too long').optional(),
  department: z.string().max(100, 'Department name is too long').optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
});

/**
 * Project basic info validation schema
 */
export const projectBasicSchema = z.object({
  name: organizationNameSchema,
  description: z.string().max(1000, 'Description is too long').optional(),
  priority: prioritySchema,
  status: createStatusSchema(
    ['active', 'completed', 'on_hold', 'cancelled'],
    'project',
  ),
});

/**
 * Team basic info validation schema
 */
export const teamBasicSchema = z.object({
  name: organizationNameSchema,
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  member_capacity: capacitySchema.optional(),
  budget: budgetSchema,
  is_active: z.boolean(),
});

// Export commonly used composed schemas
export const commonSchemas = {
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  organizationName: organizationNameSchema,
  phone: phoneSchema,
  url: urlSchema,
  uuid: uuidSchema,
  slug: slugSchema,
  priority: prioritySchema,
  capacity: capacitySchema,
  budget: budgetSchema,
  teamMembers: teamMembersSchema,
  userProfile: userProfileSchema,
  projectBasic: projectBasicSchema,
  teamBasic: teamBasicSchema,
};
