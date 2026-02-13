import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { UserRole } from '@/shared/types/roles';

interface LoginFormProps {
  onToggleMode: () => void;
  isSignUp: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode, isSignUp }) => {
  const { signIn, signUp, loading, user, isAuthenticated, initialized } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapAuthErrorMessage = (message?: string | null) => {
    if (!message) {
      return 'Unable to complete the request. Please try again.';
    }

    const normalized = message.toLowerCase();

    if (
      normalized.includes('invalid credentials') ||
      normalized.includes('unauthorized') ||
      normalized.includes('401')
    ) {
      return 'Incorrect email/username or password. Please try again.';
    }

    if (normalized.includes('network') || normalized.includes('fetch')) {
      return 'A network error occurred. Check your connection and try again.';
    }

    return message;
  };

  // Navigate to dashboard when user becomes authenticated
  useEffect(() => {
    if (initialized && isAuthenticated && user) {
      navigate('/dashboard');
    }
  }, [initialized, isAuthenticated, user, navigate]);

  // Email or username validation function
  const validateEmailOrUsername = (input: string): boolean => {
    // Check if it's a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(input)) return true;

    // Check if it's a valid username (at least 3 characters, alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
    return usernameRegex.test(input);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Email or username validation
    if (!validateEmailOrUsername(formData.email)) {
      setError('Please enter a valid email address or username');
      return;
    }

    if (isSignUp) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return;
      }

      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        role: 'user' as UserRole,
      });

      if (error) {
        setError(mapAuthErrorMessage(error.message));
      } else {
        // Navigate to dashboard on successful signup
        navigate('/dashboard');
      }
    } else {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        const mappedMessage = mapAuthErrorMessage(error.message);
        setError(mappedMessage);
      } else {
        // Navigate to dashboard on successful login
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 14 14"
              className="text-blue-600"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.673.834a.75.75 0 0 0-1.085.796l.168.946q-.676.14-1.369.173c-.747-.004-1.315-.287-2.041-.665l-.04-.02c-.703-.366-1.564-.814-2.71-.814h-.034A10.4 10.4 0 0 0 .416 2.328a.75.75 0 1 0 .668 1.343a8.9 8.9 0 0 1 3.529-.921c.747.004 1.315.287 2.041.665l.04.02c.703.366 1.564.815 2.71.815l.034-.001a10.3 10.3 0 0 0 4.146-1.078a.75.75 0 0 0 .338-1.005a.75.75 0 0 0-.334-.336zM4.562 5.751l.034-.001c1.146 0 2.007.448 2.71.814l.04.02c.726.378 1.294.662 2.041.666q.707-.034 1.398-.18l-.192-.916a.75.75 0 0 1 1.08-.82l1.915.996a.747.747 0 0 1 .36.943a.75.75 0 0 1-.364.399a10.5 10.5 0 0 1-1.705.668a10.3 10.3 0 0 1-2.475.41c-1.146 0-2.007-.448-2.71-.814l-.04-.02c-.726-.378-1.294-.662-2.041-.666a8.9 8.9 0 0 0-3.53.922a.75.75 0 1 1-.667-1.344a10.4 10.4 0 0 1 4.146-1.077m0 4.5h.034c1.146 0 2.007.448 2.71.814l.04.02c.726.378 1.294.661 2.041.665a9 9 0 0 0 1.402-.18l-.195-.912a.75.75 0 0 1 1.079-.823l1.915.996a.747.747 0 0 1 .36.942a.75.75 0 0 1-.364.4a10.4 10.4 0 0 1-4.18 1.078c-1.146 0-2.007-.449-2.71-.815l-.04-.02c-.726-.378-1.294-.661-2.041-.665a8.9 8.9 0 0 0-3.53.921a.75.75 0 1 1-.667-1.343a10.4 10.4 0 0 1 4.146-1.078"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isSignUp
              ? 'Join CFS Platform to manage terminal operations'
              : 'Welcome back to CFS Platform'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="sr-only">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={isSignUp}
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email address or username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required={isSignUp}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                if (e.currentTarget.form) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* OAuth Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          {/* <div className="grid grid-cols-2 gap-3">
            <OAuthButton
              provider="google"
              onClick={() => signInWithProvider('google')}
              disabled={loading}
            />
            <OAuthButton
              provider="github"
              onClick={() => signInWithProvider('github')}
              disabled={loading}
            />
          </div> */}

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
