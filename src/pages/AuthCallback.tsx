import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract tokens from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          navigate(`/login?error=${error}`);
          return;
        }

        if (token && refreshToken) {
          // Store tokens
          localStorage.setItem('access_token', token);
          localStorage.setItem('refresh_token', refreshToken);

          // Successfully authenticated
          navigate('/');
        } else {
          // No tokens found
          navigate('/login?error=no_tokens');
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        navigate('/login?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Completing authentication...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we complete your sign-in process.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
