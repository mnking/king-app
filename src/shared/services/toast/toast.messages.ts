import type {
  ToastMessageDictionary,
  ToastMessageTemplate,
  ToastTemplateParams,
} from './toast.types';

export const toastMessages: ToastMessageDictionary = {
  common: {
    genericSuccess: {
      title: 'Success',
      description: 'Action completed successfully.',
      variant: 'success',
    },
    genericError: {
      title: 'Something went wrong',
      description: 'Please try again or contact support if the issue persists.',
      variant: 'error',
    },
    genericWarning: {
      title: 'Check required',
      description: 'Please review the highlighted information before proceeding.',
      variant: 'warning',
    },
    networkError: {
      title: 'Network issue',
      description: 'Unable to connect. Please verify your connection and retry.',
      variant: 'error',
    },
  },
  auth: {
    loginSuccess: {
      title: 'Welcome back',
      description: 'You have signed in successfully.',
      variant: 'success',
    },
    logoutSuccess: {
      title: 'Signed out',
      description: 'You have been signed out of the platform.',
      variant: 'info',
    },
    sessionExpired: {
      title: 'Session expired',
      description: 'Please sign in again to continue.',
      variant: 'warning',
    },
    invalidCredentials: {
      title: 'Invalid credentials',
      description: 'Check your email and password and try again.',
      variant: 'error',
    },
  },
  zones: {
    createSuccess: {
      title: 'Zone created',
      description: 'The zone has been added to the system.',
      variant: 'success',
    },
    updateSuccess: {
      title: 'Zone updated',
      description: 'Your changes to the zone have been saved.',
      variant: 'success',
    },
    deleteSuccess: {
      title: 'Zone removed',
      description: 'The zone has been deleted.',
      variant: 'info',
    },
  },
  locations: {
    createSuccess: {
      title: 'Location created',
      description: 'The location has been added successfully.',
      variant: 'success',
    },
    updateSuccess: {
      title: 'Location updated',
      description: 'Updates to the location are live.',
      variant: 'success',
    },
    deleteSuccess: {
      title: 'Location removed',
      description: 'The location has been deleted.',
      variant: 'info',
    },
  },
} satisfies ToastMessageDictionary;

export function getToastMessage(
  category: keyof typeof toastMessages,
  template: string,
): ToastMessageTemplate | undefined {
  return toastMessages[category]?.[template];
}

export function resolveToastTemplate(
  params: ToastTemplateParams<keyof typeof toastMessages>,
): ToastMessageTemplate {
  const { category, template, overrides, fallback } = params;
  const baseTemplate = getToastMessage(category, template) ?? fallback;

  if (!baseTemplate) {
    return {
      title: params.template,
      description: params.overrides?.description,
      variant: params.overrides?.variant ?? 'info',
    };
  }

  return {
    ...baseTemplate,
    ...overrides,
  };
}
