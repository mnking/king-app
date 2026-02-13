import { z } from 'zod';

// Team Role and Color Enums
export const TeamRoleEnum = z.enum(['lead', 'member']);
export const TeamColorEnum = z.enum([
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#EC4899',
  '#6366F1',
]);

// Common validation patterns
const teamNameValidation = z
  .string()
  .min(2, 'Team name must be at least 2 characters')
  .max(100, 'Team name is too long')
  .regex(
    /^[a-zA-Z0-9\s\-_.()]+$/,
    'Team name can only contain letters, numbers, spaces, hyphens, underscores, dots, and parentheses',
  );

const teamDescriptionValidation = z
  .string()
  .max(500, 'Description is too long')
  .optional()
  .or(z.literal(''));

const teamColorValidation = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Please select a valid color')
  .optional()
  .or(z.literal(''))
  .default('#3B82F6');

const memberCapacityValidation = z.coerce
  .number()
  .int('Member capacity must be a whole number')
  .min(1, 'Team must allow at least 1 member')
  .max(100, 'Member capacity cannot exceed 100')
  .optional()
  .default(10);

const budgetValidation = z.coerce
  .number()
  .nonnegative('Budget cannot be negative')
  .max(10000000, 'Budget is too large')
  .optional();

// Team Member validation
const teamMemberValidation = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: TeamRoleEnum,
});

// Base Team Schema - shared fields for all team operations
const TeamBaseSchema = z.object({
  name: teamNameValidation,
  description: teamDescriptionValidation,
  color: teamColorValidation,
  member_capacity: memberCapacityValidation,
  budget: budgetValidation,
  is_active: z.boolean().default(true),
});

// Team Creation Schema - includes member management
export const TeamCreateSchema = TeamBaseSchema.extend({
  members: z
    .array(teamMemberValidation)
    .max(100, 'Cannot add more than 100 members at once')
    .optional()
    .default([]),
})
  .refine(
    (data) => {
      // Ensure team name uniqueness (client-side check)
      // This would typically involve an API call in real implementation
      const reservedNames = ['admin', 'system', 'default', 'root'];
      return !reservedNames.includes(data.name.toLowerCase());
    },
    {
      message: 'This team name is reserved. Please choose a different name.',
      path: ['name'],
    },
  )
  .refine(
    (data) => {
      // Validate member capacity vs actual members
      if (data.members && data.member_capacity) {
        return data.members.length <= data.member_capacity;
      }
      return true;
    },
    {
      message: 'Number of members cannot exceed team capacity',
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Ensure at least one team lead if members are added
      if (data.members && data.members.length > 0) {
        const leads = data.members.filter((member) => member.role === 'lead');
        return leads.length >= 1;
      }
      return true;
    },
    {
      message: 'Team must have at least one team lead',
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Ensure no duplicate members
      if (data.members && data.members.length > 0) {
        const userIds = data.members.map((member) => member.user_id);
        const uniqueUserIds = new Set(userIds);
        return userIds.length === uniqueUserIds.size;
      }
      return true;
    },
    {
      message: 'Cannot add the same user multiple times',
      path: ['members'],
    },
  );

// Team Update Schema - all fields optional except validation rules
export const TeamUpdateSchema = TeamBaseSchema.extend({
  members: z
    .array(teamMemberValidation)
    .max(100, 'Cannot have more than 100 members')
    .optional(),
})
  .partial()
  .refine(
    (data) => {
      // Validate member capacity vs actual members
      if (data.members && data.member_capacity) {
        return data.members.length <= data.member_capacity;
      }
      return true;
    },
    {
      message: 'Number of members cannot exceed team capacity',
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Ensure at least one team lead if members exist
      if (data.members && data.members.length > 0) {
        const leads = data.members.filter((member) => member.role === 'lead');
        return leads.length >= 1;
      }
      return true;
    },
    {
      message: 'Team must have at least one team lead',
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Ensure no duplicate members
      if (data.members && data.members.length > 0) {
        const userIds = data.members.map((member) => member.user_id);
        const uniqueUserIds = new Set(userIds);
        return userIds.length === uniqueUserIds.size;
      }
      return true;
    },
    {
      message: 'Cannot add the same user multiple times',
      path: ['members'],
    },
  )
  .refine(
    (data) => {
      // Team cannot be deactivated if it has active projects
      // In real implementation, this would check via API
      if (data.is_active === false) {
        // Placeholder for active projects check
        return true;
      }
      return true;
    },
    {
      message: 'Cannot deactivate team with active projects',
      path: ['is_active'],
    },
  );

// Team Settings Schema - for team configuration updates
export const TeamSettingsSchema = TeamBaseSchema.pick({
  member_capacity: true,
  budget: true,
  is_active: true,
})
  .extend({
    notifications_enabled: z.boolean().optional().default(true),
    auto_assign_tasks: z.boolean().optional().default(false),
    require_approval_for_members: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Budget validation for active teams
      if (data.is_active && data.budget !== undefined && data.budget > 0) {
        // In real implementation, check if budget is approved
        return true;
      }
      return true;
    },
    {
      message: 'Budget approval required for active teams',
      path: ['budget'],
    },
  );

// Team Member Management Schema
export const TeamMemberActionSchema = z
  .object({
    user_id: z.string().uuid('Invalid user ID'),
    action: z.enum(['add', 'remove', 'change_role', 'transfer_lead']),
    new_role: TeamRoleEnum.optional(),
    transfer_to_user_id: z.string().uuid('Invalid user ID').optional(),
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
      message: 'New role is required when changing member role',
      path: ['new_role'],
    },
  )
  .refine(
    (data) => {
      // If action is transfer_lead, transfer_to_user_id must be provided
      if (data.action === 'transfer_lead') {
        return data.transfer_to_user_id !== undefined;
      }
      return true;
    },
    {
      message: 'Target user is required when transferring leadership',
      path: ['transfer_to_user_id'],
    },
  )
  .refine(
    (data) => {
      // Cannot transfer lead to self
      if (data.action === 'transfer_lead' && data.transfer_to_user_id) {
        return data.user_id !== data.transfer_to_user_id;
      }
      return true;
    },
    {
      message: 'Cannot transfer leadership to yourself',
      path: ['transfer_to_user_id'],
    },
  );

// Team Filter Schema - for search and filtering
export const TeamFilterSchema = z
  .object({
    search: z.string().optional(),
    is_active: z.boolean().optional(),
    has_budget: z.boolean().optional(),
    member_count_min: z.number().int().nonnegative().optional(),
    member_count_max: z.number().int().nonnegative().optional(),
    created_by: z.string().uuid().optional(),
    sort_by: z
      .enum(['name', 'created_at', 'updated_at', 'member_count', 'budget'])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  })
  .refine(
    (data) => {
      // Ensure min is not greater than max for member count
      if (
        data.member_count_min !== undefined &&
        data.member_count_max !== undefined
      ) {
        return data.member_count_min <= data.member_count_max;
      }
      return true;
    },
    {
      message: 'Minimum member count cannot be greater than maximum',
      path: ['member_count_max'],
    },
  );

// Bulk Team Operations Schema
export const BulkTeamActionSchema = z
  .object({
    team_ids: z
      .array(z.string().uuid('Invalid team ID'))
      .min(1, 'Select at least one team'),
    action: z.enum([
      'activate',
      'deactivate',
      'delete',
      'archive',
      'update_capacity',
    ]),
    new_capacity: z.number().int().min(1).max(100).optional(),
    archive_reason: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      // If action is update_capacity, new_capacity must be provided
      if (data.action === 'update_capacity') {
        return data.new_capacity !== undefined;
      }
      return true;
    },
    {
      message: 'New capacity is required when updating team capacity',
      path: ['new_capacity'],
    },
  )
  .refine(
    (data) => {
      // If action is archive, archive_reason should be provided
      if (data.action === 'archive') {
        return (
          data.archive_reason !== undefined &&
          data.archive_reason.trim().length > 0
        );
      }
      return true;
    },
    {
      message: 'Archive reason is required when archiving teams',
      path: ['archive_reason'],
    },
  );

// Default values for forms
export const teamFormDefaults = {
  name: '',
  description: '',
  color: '#3B82F6',
  member_capacity: 10,
  budget: undefined,
  is_active: true,
  members: [],
};

export const teamSettingsDefaults = {
  member_capacity: 10,
  budget: undefined,
  is_active: true,
  notifications_enabled: true,
  auto_assign_tasks: false,
  require_approval_for_members: false,
};

export const teamMemberDefaults = {
  user_id: '',
  role: 'member' as const,
};

// TypeScript types inferred from schemas
export type TeamRole = z.infer<typeof TeamRoleEnum>;
export type TeamColor = z.infer<typeof TeamColorEnum>;
export type TeamCreateForm = z.infer<typeof TeamCreateSchema>;
export type TeamUpdateForm = z.infer<typeof TeamUpdateSchema>;
export type TeamSettingsForm = z.infer<typeof TeamSettingsSchema>;
export type TeamMemberActionForm = z.infer<typeof TeamMemberActionSchema>;
export type TeamFilterForm = z.infer<typeof TeamFilterSchema>;
export type BulkTeamActionForm = z.infer<typeof BulkTeamActionSchema>;
export type TeamMemberForm = z.infer<typeof teamMemberValidation>;

// Export all schemas for use in components
export const teamSchemas = {
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamSettingsSchema,
  TeamMemberActionSchema,
  TeamFilterSchema,
  BulkTeamActionSchema,
  TeamRoleEnum,
  TeamColorEnum,
};
