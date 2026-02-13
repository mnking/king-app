import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  CheckSquare,
  Award,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  RefreshCw,
  Zap,
  Star,
  Flame,
  Flag,
} from 'lucide-react';
import { useUsers } from '../features/users/useUsers';
import { useTeams } from '../features/teams/useTeams';
import type { User } from '../services/apiUsers';

// Remove Database types as we've migrated away from Supabase
// Task and Goal types are now handled by the custom hooks

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  trend = 'neutral',
  onClick,
}) => {
  const getTrendIcon = () => {
    if (trend === 'up')
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (trend === 'down')
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>
        {change !== undefined && (
          <div className="text-right">
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {change > 0 ? '+' : ''}
                {change}%
              </span>
            </div>
            {changeLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {changeLabel}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { entities: users, loading: usersLoading } = useUsers();
  const { entities: teams, loading: teamsLoading } = useTeams();
  const [refreshing, setRefreshing] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Early return if data is not loaded yet
    if (!users || !teams) {
      return {
        team: { totalUsers: 0, activeUsers: 0, totalTeams: 0 },
        productivity: { score: 0, trend: 'neutral' as const },
      };
    }

    // Team metrics
    const activeUsers = users.filter((u: User) => u.is_active);
    const totalTeams = teams.length;

    // Calculate productivity score (simplified, based on team activity)
    const productivityScore = activeUsers.length > 0 ? 85 : 50;

    return {
      team: {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        totalTeams,
      },
      productivity: {
        score: productivityScore,
        trend:
          productivityScore > 75
            ? 'up'
            : productivityScore > 50
              ? 'neutral'
              : 'down',
      },
    };
  }, [users, teams]);

  // Sample data for recent activity
  const recentActivity = [
    {
      id: 1,
      title: 'Container inspection and documentation',
      type: 'task',
      status: 'Complete',
      assignee: 'John Doe',
      priority: 'High',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      title: 'Equipment maintenance - Crane A3',
      type: 'task',
      status: 'In progress',
      assignee: 'Jane Smith',
      priority: 'Medium',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      title: 'Vessel arrival coordination - MSC Monaco',
      type: 'task',
      status: 'In progress',
      assignee: 'Mike Johnson',
      priority: 'High',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      title: 'CFS cargo consolidation - Export 2024-0918',
      type: 'task',
      status: 'pending',
      assignee: 'Sarah Wilson',
      priority: 'Medium',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 5,
      title: 'Security audit - Terminal gate access',
      type: 'task',
      status: 'Complete',
      assignee: 'Alex Brown',
      priority: 'High',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const loading = usersLoading || teamsLoading;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <LayoutDashboard className="h-6 w-6 animate-pulse" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Filter Controls */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Active Personnel"
            value={metrics.team.activeUsers}
            change={8}
            changeLabel="vs last month"
            icon={Users}
            color="bg-green-500"
            trend="up"
          />

          <MetricCard
            title="Total Teams"
            value={metrics.team.totalTeams}
            change={2}
            changeLabel="vs last month"
            icon={Activity}
            color="bg-blue-500"
            trend="up"
          />

          <MetricCard
            title="Operational Efficiency"
            value={`${metrics.productivity.score}%`}
            change={15}
            changeLabel="vs last month"
            icon={TrendingUp}
            color="bg-orange-500"
            trend={metrics.productivity.trend as 'up' | 'down' | 'neutral'}
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  View All
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
                      <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.title}
                        </p>
                        {activity.priority === 'High' && (
                          <Flag className="h-3 w-3 text-red-500" />
                        )}
                        {activity.priority === 'Medium' && (
                          <Flame className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            activity.status === 'Complete' ||
                            activity.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : activity.status === 'In progress' ||
                                  activity.status === 'in_progress'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {activity.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {activity.assignee}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Insights */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center space-x-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>New Operation</span>
                </button>

                <button className="flex items-center space-x-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <Users className="h-4 w-4" />
                  <span>Add Personnel</span>
                </button>

                <button className="flex items-center space-x-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <BarChart3 className="h-4 w-4" />
                  <span>View Reports</span>
                </button>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Insights</span>
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Terminal efficiency up 15%
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Terminal teams completed 23% more operations this month
                        compared to last month.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Excellent terminal coordination
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {metrics.team.totalTeams} operational teams are
                        coordinating efficiently.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
