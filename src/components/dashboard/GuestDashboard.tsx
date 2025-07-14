import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  DollarSign, 
  TrendingUp,
  Eye,
  Info,
  UserX,
  Building,
  Filter,
  X,
  FileText,
  Calendar
} from 'lucide-react';
import { getSubOrganizations } from '../../services/subOrgService';
import { getAllTransactions } from '../../services/transactionService';
import { getAllPOs } from '../../services/poService';
import { SubOrganization, Transaction, PurchaseOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const GuestDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states - NOT persistent for guests
  const [selectedSubOrg, setSelectedSubOrg] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtered data
  const [filteredSubOrgs, setFilteredSubOrgs] = useState<SubOrganization[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subOrganizations, transactions, pos] = await Promise.all([
          getSubOrganizations(),
          getAllTransactions(),
          getAllPOs()
        ]);
        setSubOrgs(subOrganizations);
        setAllTransactions(transactions);
        setAllPOs(pos);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters whenever selection changes
  useEffect(() => {
    if (selectedSubOrg === 'all') {
      setFilteredSubOrgs(subOrgs);
      setFilteredTransactions(allTransactions);
      setFilteredPOs(allPOs);
    } else {
      const selectedOrg = subOrgs.find(org => org.id === selectedSubOrg);
      setFilteredSubOrgs(selectedOrg ? [selectedOrg] : []);
      
      // Filter transactions by sub-organization
      const orgTransactions = allTransactions.filter(t => t.subOrgId === selectedSubOrg);
      setFilteredTransactions(orgTransactions);
      
      // Filter POs by sub-organization
      const orgPOs = allPOs.filter(po => po.subOrgId === selectedSubOrg);
      setFilteredPOs(orgPOs);
    }
  }, [selectedSubOrg, subOrgs, allTransactions, allPOs]);

  const handleSubOrgChange = (value: string) => {
    setSelectedSubOrg(value);
  };

  const clearFilters = () => {
    setSelectedSubOrg('all');
  };

  const totalBudget = filteredSubOrgs.reduce((sum, org) => sum + org.budgetAllocated, 0);
  const totalSpent = filteredSubOrgs.reduce((sum, org) => sum + org.budgetSpent, 0);
  const budgetRemaining = totalBudget - totalSpent;

  // Calculate PO statistics for filtered data
  const totalPOs = filteredPOs.length;
  const pendingPOs = filteredPOs.filter(po => po.status === 'pending_approval').length;
  const approvedPOs = filteredPOs.filter(po => po.status === 'approved').length;
  const purchasedPOs = filteredPOs.filter(po => po.status === 'purchased').length;

  // Calculate allocated vs unallocated transactions
  const allocatedTransactions = filteredTransactions.filter(t => 
    t.subOrgId || (t.allocations && t.allocations.length > 0)
  ).length;
  
  const unallocatedAmount = filteredTransactions
    .filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0))
    .reduce((sum, t) => sum + t.debitAmount, 0);

  // Determine if this is a signed-in user with no roles or an anonymous guest
  const isSignedInUser = !!currentUser;
  const isAnonymousGuest = !currentUser;

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
          {isSignedInUser ? 'Limited Access' : 'Guest View'}
        </Badge>
      </div>

      {/* User Status Notice */}
      <Card className={`border-${isSignedInUser ? 'yellow' : 'blue'}-600 bg-${isSignedInUser ? 'yellow' : 'blue'}-900/30`}>
        <div className="flex items-start space-x-3">
          {isSignedInUser ? (
            <UserX className="h-5 w-5 text-yellow-400 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          )}
          <div>
            {isSignedInUser ? (
              <>
                <h3 className="text-yellow-300 font-medium mb-1">No Roles Assigned</h3>
                <p className="text-yellow-200 text-sm">
                  Welcome, {userProfile?.displayName}! Your account has been created but no roles have been assigned yet. 
                  You currently have read-only access to budget information and purchase orders. 
                  Please contact an administrator to have appropriate roles assigned to your account.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-blue-300 font-medium mb-1">Welcome, Guest!</h3>
                <p className="text-blue-200 text-sm">
                  You're viewing the CircuitRunners PO System in read-only mode. You can explore budget information 
                  and view purchase orders, but cannot make any changes. Contact an administrator for full access.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Filter Controls */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                View by Organization
              </label>
              <select
                value={selectedSubOrg}
                onChange={(e) => handleSubOrgChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
              >
                <option value="all" className="text-gray-100 bg-gray-700">All Organizations</option>
                {subOrgs.map(org => (
                  <option key={org.id} value={org.id} className="text-gray-100 bg-gray-700">
                    {org.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {selectedSubOrg === 'all' 
                  ? 'Showing data for all sub-organizations' 
                  : `Showing data for ${subOrgs.find(org => org.id === selectedSubOrg)?.name || 'selected organization'}`
                }
              </p>
            </div>
          </div>
          
          {/* Clear Filter Button - Now properly positioned with filter controls */}
          {selectedSubOrg !== 'all' && (
            <div className="flex justify-center">
              <button
                onClick={clearFilters}
                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600 hover:border-gray-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filter
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Filter Summary */}
      {selectedSubOrg !== 'all' && (
        <Card className="border-blue-600 bg-blue-900/30">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-blue-300 font-medium mb-1">Filtered View</h3>
              <div className="text-blue-200 text-sm space-y-1">
                <p>• Viewing data for: <strong>{subOrgs.find(org => org.id === selectedSubOrg)?.name}</strong></p>
                <p>• Budget, transactions, and PO statistics are filtered to this organization</p>
                <p className="text-xs text-blue-300 mt-2">
                  Note: Filter preferences are not saved for guest users and will reset when you refresh the page.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid - Updated with filtered data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-900/50 rounded-lg border border-purple-700">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {selectedSubOrg === 'all' ? 'Total POs' : 'POs'}
              </p>
              <p className="text-2xl font-bold text-gray-100">{totalPOs}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Sub-Organization or Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSubOrg === 'all' ? 'Budget by Sub-Organization' : 'Recent Transactions'}
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {selectedSubOrg === 'all' ? (
              // Show budget breakdown when viewing all organizations
              subOrgs.map((org) => {
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
              })
            ) : (
              // Show recent transactions for selected organization
              filteredTransactions.slice(0, 6).length > 0 ? (
                filteredTransactions.slice(0, 6).map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">{transaction.description}</p>
                      <p className="text-xs text-gray-400">
                        {transaction.postDate.toLocaleDateString()}
                        {transaction.notes && ` • ${transaction.notes}`}
                    {transaction.allocations && transaction.allocations.length > 0 ? (
                      transaction.allocations.length === 1 ? (
                        <span className="text-gray-300">{transaction.allocations[0].subOrgName}</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Badge variant="info" size="sm">Split ({transaction.allocations.length})</Badge>
                        </div>
                      )
                    ) : transaction.subOrgName ? (
                      <span className="text-gray-300">{transaction.subOrgName}</span>
                    ) : (
                      <Badge variant="warning" size="sm">Unallocated</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">No transactions found</p>
                  <p className="text-gray-500 text-xs mt-1">
                    No spending recorded for this organization
                  </p>
                </div>
              )
            )}
            {selectedSubOrg !== 'all' && filteredTransactions.length > 6 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-400">
                  ${allTransactions.filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0)).reduce((sum, t) => sum + t.debitAmount, 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* PO Statistics or System Overview */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSubOrg === 'all' ? 'System Overview' : 'Purchase Order Statistics'}
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {selectedSubOrg === 'all' ? (
              // System overview for all organizations
              <div className="grid grid-cols-1 gap-6">
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
                  <h4 className="text-sm font-medium text-gray-200 mb-3">
                    {isSignedInUser ? 'Getting Started' : 'Budget Utilization'}
                  </h4>
                  {isSignedInUser ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <span className="bg-yellow-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                        <p className="text-gray-300">Contact your administrator to request role assignment</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="bg-yellow-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                        <p className="text-gray-300">Once roles are assigned, you'll have access to create POs, manage budgets, or handle purchases</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="bg-yellow-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                        <p className="text-gray-300">Available roles: Director (create POs), Admin (approve POs), Purchaser (buy items)</p>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            ) : (
              // PO statistics for selected organization
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">{pendingPOs}</p>
                    <p className="text-xs text-gray-400">Pending Approval</p>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{approvedPOs}</p>
                    <p className="text-xs text-gray-400">Approved</p>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-purple-400">{purchasedPOs}</p>
                    <p className="text-xs text-gray-400">Purchased</p>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded-lg">
                    <p className="text-2xl font-bold text-gray-400">{totalPOs}</p>
                    <p className="text-xs text-gray-400">Total POs</p>
                  </div>
                </div>

                {filteredPOs.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-200 mb-2">Recent POs</h5>
                    <div className="space-y-2">
                      {filteredPOs.slice(0, 4).map((po) => (
                        <div key={po.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-100 truncate">
                              {po.name || `PO #${po.id.slice(-6).toUpperCase()}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {po.createdAt ? new Date(po.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <Badge 
                              variant={
                                po.status === 'purchased' ? 'success' :
                                po.status === 'approved' ? 'info' :
                                po.status === 'pending_approval' ? 'warning' :
                                po.status === 'declined' ? 'danger' : 'default'
                              } 
                              size="sm"
                            >
                              {po.status.replace('_', ' ')}
                            </Badge>
                            <p className="text-xs text-gray-300 mt-1">${po.totalAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                      {filteredPOs.length > 4 && (
                        <div className="text-center pt-1">
                          <span className="text-xs text-gray-400">
                            +{filteredPOs.length - 4} more POs
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};