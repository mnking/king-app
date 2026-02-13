import { getAccessToken } from './auth-tokens';

type UnauthorizedHandler = () => void;

export interface AuthInterceptor {
  getAccessToken: () => string | null | Promise<string | null>;
  refreshAccessToken?: () => Promise<boolean>;
  onAuthFailure?: () => void | Promise<void>;
}

let interceptor: AuthInterceptor | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedNotified = false;

export interface ApiFetchOptions extends RequestInit {
  /**
   * Skip automatic Authorization header injection.
   */
  skipAuth?: boolean;
}

const toHeaders = (headers?: HeadersInit): Headers => {
  if (headers instanceof Headers) {
    return new Headers(headers);
  }

  return new Headers(headers ?? {});
};

const resolveAccessToken = async (): Promise<string | null> => {
  if (interceptor?.getAccessToken) {
    try {
      const token = await interceptor.getAccessToken();
      if (token) {
        return token;
      }
    } catch (error) {
      console.warn('Failed to retrieve access token from interceptor', error);
    }
  }

  return getAccessToken();
};

const ensureAuthHeader = async (headers: Headers) => {
  if (headers.has('Authorization')) {
    return;
  }

  const token = await resolveAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
};

const triggerUnauthorized = () => {
  if (unauthorizedNotified) {
    return;
  }

  unauthorizedNotified = true;
  if (unauthorizedHandler) {
    try {
      unauthorizedHandler();
    } catch (error) {
      console.error('apiFetch unauthorized handler failed', error);
    }
  }

  if (interceptor?.onAuthFailure) {
    Promise.resolve(interceptor.onAuthFailure()).catch((error) => {
      console.error('auth interceptor failure handler threw', error);
    });
  }
};

export const registerAuthInterceptor = (authInterceptor: AuthInterceptor | null) => {
  interceptor = authInterceptor;
};

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
  unauthorizedNotified = false;
};

export const resetUnauthorizedGuard = () => {
  unauthorizedNotified = false;
};

export const apiFetch = async (
  input: RequestInfo | URL,
  options: ApiFetchOptions = {},
): Promise<Response> => {
  const { skipAuth, headers, ...rest } = options;
  const computedHeaders = toHeaders(headers);

  if (!skipAuth) {
    await ensureAuthHeader(computedHeaders);
  }

  const executeRequest = () =>
    fetch(input, {
      ...rest,
      headers: computedHeaders,
    });

  let response = await executeRequest();

  if (response.status === 401 && !skipAuth && interceptor?.refreshAccessToken) {
    try {
      const refreshed = await interceptor.refreshAccessToken();
      if (refreshed) {
        const retryHeaders = toHeaders(headers);
        await ensureAuthHeader(retryHeaders);
        response = await fetch(input, {
          ...rest,
          headers: retryHeaders,
        });
      }
    } catch (error) {
      console.error('Token refresh failed', error);
    }
  }

  if (response.status === 401 && !skipAuth) {
    triggerUnauthorized();
  } else if (response.status !== 401) {
    unauthorizedNotified = false;
  }

  return response;
};
