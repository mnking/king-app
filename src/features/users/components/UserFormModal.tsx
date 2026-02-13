import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  UserIcon,
  Shield,
  Mail,
  Eye,
  EyeOff,
  Upload,
  Camera,
} from 'lucide-react';
import type { User } from '@/services/apiUsers';
import {
  UserCreateSchema,
  UserUpdateSchema,
  UserCreateForm,
  UserUpdateForm,
  UserRole,
  userFormDefaults,
} from '../schemas/user-schemas';
import { FormInput, FormSingleSelect } from '@/shared/components/forms';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  user?: User | null; // User from the API interface, null for create mode
  onSave: (data: UserCreateForm | UserUpdateForm) => Promise<void>;
}

// Role options for dropdown
const roleOptions = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'user', label: 'User' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

// Status options for dropdown
const statusOptions = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

// Department options (in real app, this would come from API)
const departmentOptions = [
  { value: '', label: 'No Department' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'management', label: 'Management' },
  { value: 'support', label: 'Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  user,
  onSave,
}) => {
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  const isReadOnly = isView;
  const schema = isEdit || isView ? UserUpdateSchema : UserCreateSchema;
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Force complete component remount with unique key
  const componentKey = React.useMemo(() => {
    if (!isOpen) return 'closed';
    if (mode === 'edit' && user) return `edit-${user.id}`;
    if (mode === 'view' && user) return `view-${user.id}`;
    return `create-${Date.now()}`;
  }, [isOpen, mode, user]);

  // Get initial values based on mode - always fresh values
  const defaultValues = React.useMemo(() => {
    // CRITICAL FIX: For create mode or no user, ALWAYS return fresh defaults
    if (mode === 'create' || !user) {
      return { ...userFormDefaults };
    }

    // Only use user data if we're explicitly in edit or view mode AND user exists
    if ((mode === 'edit' || mode === 'view') && user) {
      return {
        email: user.email,
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        role: user.role as UserRole,
        department: user.department || '',
        job_title: user.job_title || '',
        position: user.position || '',
        phone: user.phone || '',
        location: user.location || '',
        is_active: user.is_active ? 'true' : 'false', // Convert boolean to string for form
        password: '',
        confirm_password: '',
      };
    }

    // Fallback to defaults
    return { ...userFormDefaults };
  }, [mode, user]); // Remove isOpen - not needed in dependencies

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<UserCreateForm | UserUpdateForm>(
    React.useMemo(
      () => ({
        resolver: zodResolver(schema),
        defaultValues,
        mode: 'onChange',
      }),
      [schema, defaultValues],
    ),
  ); // Form configuration dependencies

  // Watch password field for strength indicator
  const passwordValue = watch('password');

  // Reset form when modal opens or mode/user changes
  React.useEffect(() => {
    if (!isOpen) {
      reset({ ...userFormDefaults });
      setShowPassword(false);
      setShowConfirmPassword(false);
      return;
    }

    // CRITICAL FIX: Force reset with correct values based on mode
    reset(defaultValues);

    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isOpen, defaultValues, reset]);

  const onSubmit = async (data: any) => {
    // Do nothing if in view mode
    if (isView) return;

    try {
      // Convert is_active from string to boolean
      const processedData = {
        ...data,
        is_active: data.is_active === 'true',
      };

      if (isEdit && user) {
        // For updates, only include password if it's provided
        const updateData = { ...processedData };
        if (!updateData.password || updateData.password === '') {
          delete updateData.password;
          delete updateData.confirm_password;
        }
        await onSave({ ...updateData, id: user.id } as UserUpdateForm & {
          id: string;
        });
      } else {
        await onSave(processedData as UserCreateForm);
      }
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleClose = () => {
    if (
      !isDirty ||
      window.confirm(
        'You have unsaved changes. Are you sure you want to close?',
      )
    ) {
      onClose();
    }
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = calculatePasswordStrength(passwordValue || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" key={componentKey}>
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center space-x-2">
              <UserIcon className="h-6 w-6" />
              <span>
                {isView
                  ? 'View User Details'
                  : isEdit
                    ? 'Edit User'
                    : 'Create New User'}
              </span>
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form
            key={componentKey}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            autoComplete="off"
          >
            {/* Avatar Upload Section */}
            <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-center space-x-6">
                {/* Avatar Preview */}
                <div className="relative">
                  {watch('avatar_url') ? (
                    <img
                      src={watch('avatar_url')}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600 shadow-lg"
                      onError={(e) => {
                        // If image fails to load, show initials
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove(
                          'hidden',
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ${watch('avatar_url') ? 'hidden' : ''}`}
                  >
                    {watch('full_name') ? (
                      watch('full_name')
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    ) : watch('email') ? (
                      watch('email')?.[0]?.toUpperCase()
                    ) : (
                      <UserIcon className="w-8 h-8" />
                    )}
                  </div>
                  {/* Upload overlay button */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="absolute inset-0 w-24 h-24 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => {
                        // In a real app, this would open a file picker or photo upload modal
                        const url = prompt(
                          'Enter avatar URL:',
                          watch('avatar_url') || '',
                        );
                        if (url !== null) {
                          setValue('avatar_url', url, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  )}
                </div>

                {/* Avatar Actions */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    Profile Picture
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Click on the avatar to change the profile picture
                  </p>
                  {!isReadOnly && (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt(
                            'Enter avatar URL:',
                            watch('avatar_url') || '',
                          );
                          if (url !== null) {
                            setValue('avatar_url', url, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload URL
                      </button>
                      {watch('avatar_url') && (
                        <button
                          type="button"
                          onClick={() =>
                            setValue('avatar_url', '', {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Basic Information</span>
              </h4>

              <div className="space-y-4">
                {/* Email and Full Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    name="email"
                    control={control}
                    label="Email Address"
                    placeholder="user@company.com"
                    type="email"
                    required={!isView}
                    disabled={isReadOnly}
                    autoComplete={mode === 'create' ? 'new-password' : 'email'}
                  />
                  <FormInput
                    name="full_name"
                    control={control}
                    label="Full Name"
                    placeholder="John Doe"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Department and Job Title Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSingleSelect
                    name="department"
                    control={control}
                    label="Department"
                    options={departmentOptions}
                    disabled={isReadOnly}
                  />
                  <FormInput
                    name="job_title"
                    control={control}
                    label="Job Title"
                    placeholder="Software Engineer"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Position and Location Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    name="position"
                    control={control}
                    label="Position"
                    placeholder="Senior Developer"
                    disabled={isReadOnly}
                  />
                  <FormInput
                    name="location"
                    control={control}
                    label="Location"
                    placeholder="New York, NY"
                    disabled={isReadOnly}
                  />
                </div>

                {/* Phone and Avatar URL Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    name="phone"
                    control={control}
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                    disabled={isReadOnly}
                  />
                  <FormInput
                    name="avatar_url"
                    control={control}
                    label="Avatar URL"
                    placeholder="https://example.com/avatar.jpg"
                    type="url"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            {/* Security & Access Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Access</span>
              </h4>

              <div className="space-y-4">
                {/* Role and Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSingleSelect
                    name="role"
                    control={control}
                    label="Role"
                    options={roleOptions}
                    required={!isView}
                    disabled={isReadOnly}
                  />
                  <FormSingleSelect
                    name="is_active"
                    control={control}
                    label="Status"
                    options={statusOptions}
                    required={!isView}
                    disabled={isReadOnly}
                  />
                </div>

                {/* Password Fields - Required for creation, optional for edit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <FormInput
                      name="password"
                      control={control}
                      label={
                        isEdit
                          ? 'New Password (leave blank to keep current)'
                          : 'Password'
                      }
                      placeholder="Enter password..."
                      type={showPassword ? 'text' : 'password'}
                      required={!isEdit && !isView}
                      disabled={isReadOnly}
                      autoComplete="new-password"
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <FormInput
                      name="confirm_password"
                      control={control}
                      label="Confirm Password"
                      placeholder="Confirm password..."
                      type={showConfirmPassword ? 'text' : 'password'}
                      required={!isEdit && !isView}
                      disabled={isReadOnly}
                      autoComplete="new-password"
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {passwordValue && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Password Strength
                      </span>
                      <span
                        className={`font-medium ${
                          passwordStrength.score <= 2
                            ? 'text-red-600'
                            : passwordStrength.score <= 3
                              ? 'text-yellow-600'
                              : passwordStrength.score <= 4
                                ? 'text-blue-600'
                                : 'text-green-600'
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Password must contain uppercase, lowercase, number, and
                      special character
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isSubmitting}
              >
                {isView ? 'Close' : 'Cancel'}
              </button>
              {!isView && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEdit ? 'Update User' : 'Create User'}</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
