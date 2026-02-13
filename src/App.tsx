import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from '@/features/auth/useAuth';
import { Sidebar, TopNavigation } from '@/app/layouts';
import { LoginForm } from '@/pages';
import { Loader2 } from 'lucide-react';
import type { ViewType } from '@/config/routes.config';

const AppContent = () => {
  const { user, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get current view from URL path
  const getCurrentView = (): ViewType => {
    const path = location.pathname.slice(1); // Remove leading slash
    if (path === '' || path === 'dashboard') return 'dashboard';
    return (path as ViewType) || 'dashboard';
  };

  const currentView = getCurrentView();

  const handleViewChange = (view: ViewType) => {
    navigate(`/${view}`);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm
        onToggleMode={() => setIsSignUp(!isSignUp)}
        isSignUp={isSignUp}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <TopNavigation
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
