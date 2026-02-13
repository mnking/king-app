import { z } from 'zod';

// User Role and Status Enums
export const UserRoleEnum = z.enum(['admin', 'manager', 'user', 'viewer']);
export const UserStatusEnum = z.enum([
  'active',
  'inactive',
  'pending',
  'suspended',
]);

// Common validation patterns
const emailValidation = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

const nameValidation = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .regex(
    /^[a-zA-Z\s'-]+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes',
  );

const phoneValidation = z
  .string()
  .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

const urlValidation = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

// Password validation with security requirements
const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(
    /^(?=.*[@$!%*?&])/,
    'Password must contain at least one special character (@$!%*?&)',
  );

// Base User Schema - shared fields for all user operations
const UserBaseSchema = z.object({
  email: emailValidation,
  full_name: nameValidation.optional().or(z.literal('')),
  avatar_url: urlValidation,
  role: UserRoleEnum,
  department: z
    .string()
    .max(100, 'Department name is too long')
    .optional()
    .or(z.literal('')),
  job_title: z
    .string()
    .max(100, 'Job title is too long')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, 'Position is too long')
    .optional()
    .or(z.literal('')),
  phone: phoneValidation,
  location: z
    .string()
    .max(200, 'Location is too long')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
});
// Form-specific schema where is_active is a string for UI compatibility
export const UserFormBaseSchema = z.object({
  email: emailValidation,
  full_name: nameValidation.optional().or(z.literal('')),
  avatar_url: urlValidation,
  role: UserRoleEnum,
  department: z
    .string()
    .max(100, 'Department name is too long')
    .optional()
    .or(z.literal('')),
  job_title: z
    .string()
    .max(100, 'Job title is too long')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, 'Position is too long')
    .optional()
    .or(z.literal('')),
  phone: phoneValidation,
  location: z
    .string()
    .max(200, 'Location is too long')
    .optional()
    .or(z.literal('')),
  is_active: z.enum(['true', 'false']), // String enum for form compatibility
});

// User Creation Schema - includes password requirements
export const UserCreateSchema = UserFormBaseSchema.extend({
  password: passwordValidation,
  confirm_password: z.string().min(1, 'Please confirm your password'),
})
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })
  .refine(
    (data) => {
      // Ensure email uniqueness (client-side check)
      // This would typically involve an API call in real implementation
      const commonDomains = ['example.com', 'test.com', 'demo.com'];
      const domain = data.email.split('@')[1];
      return !commonDomains.includes(domain);
    },
    {
      message: 'Please use a valid business email address',
      path: ['email'],
    },
  )
  .refine(
    () => {
      // Role validation: prevent creating admin users without proper authorization
      // In real implementation, this would check current user permissions
      // For now, allow admin creation
      return true;
    },
    {
      message: 'You do not have permission to create admin users',
      path: ['role'],
    },
  );

// User Update Schema - password is optional for updates
export const UserUpdateSchema = UserFormBaseSchema.extend({
  password: passwordValidation.optional().or(z.literal('')),
  confirm_password: z.string().optional().or(z.literal('')),
})
  .refine(
    (data) => {
      // Only validate password confirmation if password is provided
      if (data.password && data.password !== '') {
        return data.password === data.confirm_password;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ['confirm_password'],
    },
  )
  .refine(
    (data) => {
      // Validate that password is provided if confirm_password is provided
      if (data.confirm_password && data.confirm_password !== '') {
        return data.password && data.password !== '';
      }
      return true;
    },
    {
      message: 'Please enter a password',
      path: ['password'],
    },
  )
  .refine(
    () => {
      // Role escalation prevention - users cannot promote themselves to admin
      // In real implementation, this would check current user role and target role
      return true; // Placeholder for role escalation check
    },
    {
      message: 'You cannot change user roles to a higher privilege level',
      path: ['role'],
    },
  );

// User Profile Schema - for self-service profile updates (limited fields)
export const UserProfileSchema = UserBaseSchema.pick({
  full_name: true,
  avatar_url: true,
  department: true,
  job_title: true,
  phone: true,
  location: true,
})
  .extend({
    current_password: z.string().optional().or(z.literal('')),
    new_password: passwordValidation.optional().or(z.literal('')),
    confirm_new_password: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      // If changing password, current password is required
      if (data.new_password && data.new_password !== '') {
        return data.current_password && data.current_password !== '';
      }
      return true;
    },
    {
      message: 'Current password is required to set a new password',
      path: ['current_password'],
    },
  )
  .refine(
    (data) => {
      // New password confirmation
      if (data.new_password && data.new_password !== '') {
        return data.new_password === data.confirm_new_password;
      }
      return true;
    },
    {
      message: "New passwords don't match",
      path: ['confirm_new_password'],
    },
  );

// User Filter Schema - for search and filtering
export const UserFilterSchema = z.object({
  search: z.string().optional(),
  role: UserRoleEnum.optional(),
  department: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_by: z
    .enum(['email', 'full_name', 'role', 'department', 'created_at'])
    .optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

// Bulk User Operations Schema
export const BulkUserActionSchema = z
  .object({
    user_ids: z
      .array(z.string().uuid('Invalid user ID'))
      .min(1, 'Select at least one user'),
    action: z.enum(['activate', 'deactivate', 'delete', 'change_role']),
    new_role: UserRoleEnum.optional(),
  })
  .refine(
    (data) => {
      // If action is change_role, new_role must be provided
      if (data.action === 'change_role') {
        return data.new_role !== undefined;
      }
      return true;
    },
    {
      message: 'New role is required when changing user roles',
      path: ['new_role'],
    },
  );

// Default values for forms
export const userFormDefaults = {
  email: '',
  full_name: '',
  avatar_url: '',
  role: 'user' as const,
  department: '',
  job_title: '',
  position: '',
  phone: '',
  location: '',
  is_active: 'true' as const, // Changed from boolean to string for form compatibility
  password: '',
  confirm_password: '',
};

export const userProfileDefaults = {
  full_name: '',
  avatar_url: '',
  department: '',
  job_title: '',
  phone: '',
  location: '',
  current_password: '',
  new_password: '',
  confirm_new_password: '',
};

// TypeScript types inferred from schemas
export type UserRole = z.infer<typeof UserRoleEnum>;
export type UserStatus = z.infer<typeof UserStatusEnum>;
export type UserCreateForm = z.infer<typeof UserCreateSchema>;
export type UserUpdateForm = z.infer<typeof UserUpdateSchema>;
export type UserProfileForm = z.infer<typeof UserProfileSchema>;
export type UserFilterForm = z.infer<typeof UserFilterSchema>;
export type BulkUserActionForm = z.infer<typeof BulkUserActionSchema>;

// Export all schemas for use in components
export const userSchemas = {
  UserCreateSchema,
  UserUpdateSchema,
  UserProfileSchema,
  UserFilterSchema,
  BulkUserActionSchema,
  UserRoleEnum,
  UserStatusEnum,
};
