import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { UserRole, hasRoleAccess } from '@/shared/types/roles';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions,
}) => {
  const {
    user,
    loading,
    initialized,
    isAuthenticated,
    profile: userProfile,
    can,
  } = useAuth();
  const location = useLocation();

  const hasRequiredPermission = React.useMemo(() => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.every((perm) => can(perm));
  }, [requiredPermissions, can]);

  // Show loading spinner while checking authentication or permissions
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access using role hierarchy
  if (
    requiredRole &&
    (userProfile?.roles?.length ?? 0) > 0 &&
    !userProfile.roles.some((role) =>
      hasRoleAccess(role as UserRole, requiredRole),
    )
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Required role: {requiredRole}
          </p>
        </div>
      </div>
    );
  }

  // Check permission-based access
  if (requiredPermissions && !hasRequiredPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to perform this action.
          </p>
          {requiredPermissions.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Required permissions: {requiredPermissions.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
