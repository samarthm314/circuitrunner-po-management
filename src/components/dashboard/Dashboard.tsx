import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardStats, getRecentActivity } from '../../services/dashboardService';
import { getSubOrganizations } from '../../services/subOrgService';
import { SubOrganization } from '../../types';
import { GuestDashboard } from './GuestDashboard';

interface DashboardStats {
  totalPOs: number;
  pendingPOs: number;
  approvedPOs: number;
  totalSpent: number;
}

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
}

export const Dashboard: React.FC = () => {
  const { userProfile, isGuest } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPOs: 0,
    pendingPOs: 0,
    approvedPOs: 0,
    totalSpent: 0
  });
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // If user is a guest, show the guest dashboard
  if (isGuest) {
    return <GuestDashboard />;
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboardStats, subOrganizations, activity] = await Promise.all([
          getDashboardStats(),
          getSubOrganizations(),
          getRecentActivity()
        ]);

        setStats({
          totalPOs: dashboardStats.totalPOs,
          pendingPOs: dashboardStats.pendingPOs,
          approvedPOs: dashboardStats.approvedPOs,
          totalSpent: dashboardStats.totalSpent
        });
        
        setSubOrgs(subOrganizations);
        setRecentActivity(activity);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalBudget = subOrgs.reduce((sum, org) => sum + org.budgetAllocated, 0);
  const totalSpent = subOrgs.reduce((sum, org) => sum + org.budgetSpent, 0);
  const budgetRemaining = totalBudget - totalSpent;

  const handlePendingPOsClick = () => {
    if (userProfile?.role === 'admin') {
      navigate('/pending-approval');
    } else if (userProfile?.role === 'purchaser') {
      navigate('/pending-purchase');
    }
  };

  const handleTotalPOsClick = () => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'purchaser') {
      navigate('/all-pos');
    } else {
      navigate('/my-pos');
    }
  };

  const isPendingPOsClickable = userProfile?.role === 'admin' || userProfile?.role === 'purchaser';

  // Get the appropriate label and count for pending POs based on role
  const getPendingPOsInfo = () => {
    if (userProfile?.role === 'admin') {
      return {
        label: 'Pending Approval',
        count: stats.pendingPOs,
        description: stats.pendingPOs > 0 ? 'Click to review' : 'No POs awaiting approval'
      };
    } else if (userProfile?.role === 'purchaser') {
      return {
        label: 'Ready for Purchase',
        count: stats.approvedPOs,
        description: stats.approvedPOs > 0 ? 'Click to purchase' : 'No POs ready for purchase'
      };
    } else {
      return {
        label: 'Pending POs',
        count: stats.pendingPOs,
        description: 'POs awaiting approval'
      };
    }
  };

  const pendingPOsInfo = getPendingPOsInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Dashboard</h1>
        <Badge variant="info" size="md">
          {userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1)}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-900/50 rounded-lg border border-green-700 flex-shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400">Total Budget</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">
                ${totalBudget.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-900/50 rounded-lg border border-red-700 flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400">Budget Spent</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-100 truncate">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-4 sm:p-6 ${
            isPendingPOsClickable 
              ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' 
              : ''
          }`}
          onClick={isPendingPOsClickable ? handlePendingPOsClick : undefined}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700 flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">{pendingPOsInfo.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-100">{pendingPOsInfo.count}</p>
              <p className="text-xs text-blue-400 mt-1 truncate">
                {pendingPOsInfo.description}
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 sm:p-6 cursor-pointer hover:bg-gray-700/50 transition-colors"
          onClick={handleTotalPOsClick}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-900/50 rounded-lg border border-purple-700 flex-shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-400">Total POs</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-100">{stats.totalPOs}</p>
              <p className="text-xs text-purple-400 mt-1 truncate">Click to view all</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Budget by Sub-Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Budget by Sub-Organization</CardTitle>
          </CardHeader>
          <div className="space-y-3 sm:space-y-4">
            {subOrgs.slice(0, 8).map((org) => {
              const utilization = org.budgetAllocated > 0 ? (org.budgetSpent / org.budgetAllocated) * 100 : 0;
              const isOverBudget = utilization > 100;
              const isNearLimit = utilization > 80;
              const remaining = org.budgetAllocated - org.budgetSpent;

              return (
                <div key={org.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-medium text-gray-100 text-sm sm:text-base truncate">{org.name}</span>
                      {isOverBudget && (
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-300 whitespace-nowrap ml-2">
                      ${org.budgetSpent.toLocaleString()} / ${org.budgetAllocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isOverBudget 
                          ? 'bg-red-500' 
                          : isNearLimit 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{utilization.toFixed(1)}% utilized</span>
                    <span className={utilization > 100 ? 'text-red-400 font-medium' : 'text-gray-300'}>
                      ${remaining.toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              );
            })}
            {subOrgs.length > 8 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-400">
                  +{subOrgs.length - 8} more organizations
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <div className="space-y-3 sm:space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="p-1 bg-green-900/50 rounded-full mt-1 border border-green-700 flex-shrink-0">
                    <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{activity.action}</p>
                    <p className="text-xs text-gray-400 truncate">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};