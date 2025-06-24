import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  DollarSign, 
  TrendingUp,
  Eye,
  Info
} from 'lucide-react';
import { getSubOrganizations } from '../../services/subOrgService';
import { SubOrganization } from '../../types';

export const GuestDashboard: React.FC = () => {
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubOrganizations = async () => {
      try {
        const subOrganizations = await getSubOrganizations();
        setSubOrgs(subOrganizations);
      } catch (error) {
        console.error('Error fetching sub-organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubOrganizations();
  }, []);

  const totalBudget = subOrgs.reduce((sum, org) => sum + org.budgetAllocated, 0);
  const totalSpent = subOrgs.reduce((sum, org) => sum + org.budgetSpent, 0);
  const budgetRemaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <Badge variant="info" size="md">
          <Eye className="h-4 w-4 mr-1" />
          Guest View
        </Badge>
      </div>

      {/* Guest Notice */}
      <Card className="border-blue-600 bg-blue-900/30">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-300 font-medium mb-1">Welcome, Guest!</h3>
            <p className="text-blue-200 text-sm">
              You're viewing the CircuitRunners PO System in read-only mode. You can explore budget information 
              and view purchase orders, but cannot make any changes. Contact an administrator for full access.
            </p>
          </div>
        </div>
      </Card>

      {/* Budget Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-900/50 rounded-lg border border-green-700">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalBudget.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-900/50 rounded-lg border border-red-700">
              <TrendingUp className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Budget Spent</p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-900/50 rounded-lg border border-blue-700">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-gray-100">
                ${budgetRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget by Sub-Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Budget by Sub-Organization</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          {subOrgs.map((org) => {
            const utilization = org.budgetAllocated > 0 ? (org.budgetSpent / org.budgetAllocated) * 100 : 0;
            const isOverBudget = utilization > 100;
            const isNearLimit = utilization > 80;
            const remaining = org.budgetAllocated - org.budgetSpent;

            return (
              <div key={org.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-100">{org.name}</span>
                    {isOverBudget && (
                      <Badge variant="danger" size="sm">Over Budget</Badge>
                    )}
                    {!isOverBudget && isNearLimit && (
                      <Badge variant="warning" size="sm">Near Limit</Badge>
                    )}
                  </div>
                  <span className="text-sm text-gray-300">
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
        </div>
      </Card>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-200 mb-3">Budget Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Organizations:</span>
                <span className="text-gray-100">{subOrgs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Allocated:</span>
                <span className="text-green-400 font-medium">${totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Spent:</span>
                <span className="text-red-400 font-medium">${totalSpent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2">
                <span className="text-gray-300 font-medium">Remaining:</span>
                <span className={`font-bold ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${budgetRemaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-200 mb-3">Budget Utilization</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Overall Utilization</span>
                  <span className="text-gray-300">
                    {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      totalSpent > totalBudget 
                        ? 'bg-red-500' 
                        : (totalSpent / totalBudget) > 0.8 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                <p>• Green: Under 80% utilization</p>
                <p>• Yellow: 80-100% utilization</p>
                <p>• Red: Over budget</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};