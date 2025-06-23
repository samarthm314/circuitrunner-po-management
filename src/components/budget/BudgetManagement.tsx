import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Edit, Save, X, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { getSubOrganizations, updateSubOrgBudget } from '../../services/subOrgService';
import { SubOrganization } from '../../types';

export const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<SubOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const subOrgs = await getSubOrganizations();
        setBudgets(subOrgs);
      } catch (error) {
        console.error('Error fetching budgets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const startEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(currentValue.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    try {
      await updateSubOrgBudget(id, newValue);
      setBudgets(budgets.map(budget => 
        budget.id === id 
          ? { ...budget, budgetAllocated: newValue }
          : budget
      ));
      
      setEditingId(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Error updating budget. Please try again.');
    }
  };

  const totalAllocated = budgets.reduce((sum, budget) => sum + budget.budgetAllocated, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.budgetSpent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  const getBudgetStatus = (budget: SubOrganization) => {
    const utilization = budget.budgetAllocated > 0 ? (budget.budgetSpent / budget.budgetAllocated) * 100 : 0;
    
    if (utilization > 100) return { status: 'over', color: 'red', label: 'Over Budget' };
    if (utilization > 90) return { status: 'critical', color: 'red', label: 'Critical' };
    if (utilization > 75) return { status: 'warning', color: 'yellow', label: 'Warning' };
    return { status: 'good', color: 'green', label: 'Good' };
  };

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
        <h1 className="text-3xl font-bold text-gray-100">Budget Management</h1>
        <Button variant="outline">
          Export Budget Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-900/50 rounded-lg border border-blue-700">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalAllocated.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-red-900/50 rounded-lg border border-red-700">
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-900/50 rounded-lg border border-green-700">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Organization Budgets</CardTitle>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 font-medium text-gray-200">Sub-Organization</th>
                <th className="text-right py-3 px-4 font-medium text-gray-200">Allocated Budget</th>
                <th className="text-right py-3 px-4 font-medium text-gray-200">Spent</th>
                <th className="text-right py-3 px-4 font-medium text-gray-200">Remaining</th>
                <th className="text-center py-3 px-4 font-medium text-gray-200">Utilization</th>
                <th className="text-center py-3 px-4 font-medium text-gray-200">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => {
                const status = getBudgetStatus(budget);
                const utilization = budget.budgetAllocated > 0 ? (budget.budgetSpent / budget.budgetAllocated) * 100 : 0;
                const remaining = budget.budgetAllocated - budget.budgetSpent;
                const isEditing = editingId === budget.id;

                return (
                  <tr key={budget.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-100">{budget.name}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                            min="0"
                            step="100"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveEdit(budget.id)}
                            className="p-1"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            className="p-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-100">${budget.budgetAllocated.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      ${budget.budgetSpent.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={remaining < 0 ? 'text-red-400 font-medium' : 'text-gray-100'}>
                        ${remaining.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-600 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              status.status === 'over' || status.status === 'critical'
                                ? 'bg-red-500'
                                : status.status === 'warning'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-300 min-w-[3rem]">
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge 
                        variant={
                          status.status === 'over' || status.status === 'critical' 
                            ? 'danger' 
                            : status.status === 'warning' 
                              ? 'warning' 
                              : 'success'
                        }
                        size="sm"
                      >
                        {status.status === 'over' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(budget.id, budget.budgetAllocated)}
                          className="p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-gray-100">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            Budget Alerts
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {budgets
            .filter(budget => {
              const utilization = budget.budgetAllocated > 0 ? (budget.budgetSpent / budget.budgetAllocated) * 100 : 0;
              return utilization > 75;
            })
            .map(budget => {
              const utilization = budget.budgetAllocated > 0 ? (budget.budgetSpent / budget.budgetAllocated) * 100 : 0;
              const remaining = budget.budgetAllocated - budget.budgetSpent;
              
              return (
                <div key={budget.id} className="flex items-center justify-between p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
                    <span className="font-medium text-yellow-200">{budget.name}</span>
                    <span className="text-yellow-300 ml-2">
                      {utilization > 100 
                        ? `Over budget by $${Math.abs(remaining).toLocaleString()}`
                        : `${utilization.toFixed(0)}% of budget used`
                      }
                    </span>
                  </div>
                  <Badge variant={utilization > 100 ? 'danger' : 'warning'} size="sm">
                    {utilization > 100 ? 'Over Budget' : 'High Usage'}
                  </Badge>
                </div>
              );
            })}
          {budgets.filter(budget => {
            const utilization = budget.budgetAllocated > 0 ? (budget.budgetSpent / budget.budgetAllocated) * 100 : 0;
            return utilization > 75;
          }).length === 0 && (
            <div className="text-center py-4 text-gray-400">
              No budget alerts at this time
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};