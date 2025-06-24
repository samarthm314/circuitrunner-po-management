import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Download, 
  FileText,
  DollarSign,
  Calendar,
  Building,
  Search,
  Eye,
  Info
} from 'lucide-react';
import { Transaction, SubOrganization, PurchaseOrder } from '../../types';
import { getAllTransactions } from '../../services/transactionService';
import { getSubOrganizations } from '../../services/subOrgService';
import { getPOById } from '../../services/poService';
import { PODetailsModal } from '../po/PODetailsModal';
import * as XLSX from 'xlsx';

export const GuestTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [subOrgFilter, setSubOrgFilter] = useState<string>('all');

  // PO Details Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPODetailsModalOpen, setIsPODetailsModalOpen] = useState(false);
  const [loadingPODetails, setLoadingPODetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply sub-organization filter
    let filtered = transactions;

    if (subOrgFilter !== 'all') {
      if (subOrgFilter === 'unallocated') {
        filtered = filtered.filter(t => !t.subOrgId);
      } else {
        filtered = filtered.filter(t => t.subOrgId === subOrgFilter);
      }
    }

    setFilteredTransactions(filtered);
  }, [transactions, subOrgFilter]);

  const fetchData = async () => {
    try {
      const [transactionsData, subOrgsData] = await Promise.all([
        getAllTransactions(),
        getSubOrganizations()
      ]);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
      setSubOrgs(subOrgsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPODetails = async (poId: string) => {
    setLoadingPODetails(true);
    try {
      const po = await getPOById(poId);
      if (po) {
        setSelectedPO(po);
        setIsPODetailsModalOpen(true);
      } else {
        alert('PO not found');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      alert('Error loading PO details');
    } finally {
      setLoadingPODetails(false);
    }
  };

  const closePODetailsModal = () => {
    setIsPODetailsModalOpen(false);
    setSelectedPO(null);
  };

  const handleExport = () => {
    try {
      // Use filtered transactions for export
      const exportData = filteredTransactions.map(transaction => ({
        'Post Date': transaction.postDate.toLocaleDateString(),
        'Description': transaction.description,
        'Amount': transaction.debitAmount,
        'Sub-Organization': transaction.subOrgName || 'Unallocated',
        'Status': transaction.status,
        'Notes': transaction.notes || '',
        'Linked PO': transaction.linkedPOId ? `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}` : 'None',
        'Created At': transaction.createdAt.toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Generate filename with current date and filter info
      const date = new Date().toISOString().split('T')[0];
      const filterSuffix = subOrgFilter !== 'all' ? `_${subOrgFilter === 'unallocated' ? 'unallocated' : subOrgs.find(org => org.id === subOrgFilter)?.name?.replace(/\s+/g, '_') || 'filtered'}` : '';
      const filename = `transactions_export${filterSuffix}_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Error exporting transactions. Please try again.');
    }
  };

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.debitAmount, 0);
  const allocatedTransactions = filteredTransactions.filter(t => t.subOrgId).length;
  const unallocatedAmount = filteredTransactions
    .filter(t => !t.subOrgId)
    .reduce((sum, t) => sum + t.debitAmount, 0);

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
        <h1 className="text-3xl font-bold text-gray-100">Transactions</h1>
        <div className="flex items-center space-x-3">
          <Badge variant="info" size="md">
            <Eye className="h-4 w-4 mr-1" />
            Guest View
          </Badge>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Guest Notice */}
      <Card className="border-blue-600 bg-blue-900/30">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-300 font-medium mb-1">Read-Only Transaction Access</h3>
            <p className="text-blue-200 text-sm">
              You're viewing transaction data in read-only mode. You can see spending patterns, 
              budget allocations, and linked purchase orders, but cannot make any changes.
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-red-900/50 rounded-lg border border-red-700">
              <DollarSign className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {subOrgFilter !== 'all' ? 'Filtered' : 'Total'} Spent
              </p>
              <p className="text-2xl font-bold text-gray-100">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-900/50 rounded-lg border border-blue-700">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {subOrgFilter !== 'all' ? 'Filtered' : 'Total'} Transactions
              </p>
              <p className="text-2xl font-bold text-gray-100">{filteredTransactions.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-900/50 rounded-lg border border-green-700">
              <Building className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Allocated</p>
              <p className="text-2xl font-bold text-gray-100">{allocatedTransactions}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
              <Calendar className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Unallocated</p>
              <p className="text-2xl font-bold text-gray-100">
                ${unallocatedAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex items-center space-x-4">
              <select
                value={subOrgFilter}
                onChange={(e) => setSubOrgFilter(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 text-sm"
              >
                <option value="all" className="text-gray-100 bg-gray-700">All Organizations</option>
                <option value="unallocated" className="text-gray-100 bg-gray-700">Unallocated</option>
                {subOrgs.map(org => (
                  <option key={org.id} value={org.id} className="text-gray-100 bg-gray-700">
                    {org.name}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-400">
                {filteredTransactions.length} rows
              </div>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 font-medium text-gray-200">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-200">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Sub-Organization</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Notes</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Linked PO</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-4 px-4 text-gray-300">
                    {transaction.postDate.toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-100">{transaction.description}</div>
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-red-400">
                    ${transaction.debitAmount.toFixed(2)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-300">
                      {transaction.subOrgName || (
                        <Badge variant="warning" size="sm">Unallocated</Badge>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-300 text-sm">
                      {transaction.notes || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {transaction.linkedPOId ? (
                      <button
                        onClick={() => handleViewPODetails(transaction.linkedPOId!)}
                        disabled={loadingPODetails}
                        className="flex items-center space-x-1 hover:bg-gray-600 p-1 rounded transition-colors"
                      >
                        <Badge variant="info" size="sm">
                          {transaction.linkedPOName || `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}`}
                        </Badge>
                        <Eye className="h-3 w-3 text-gray-400" />
                      </button>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {subOrgFilter !== 'all' ? 'No transactions found for the selected organization' : 'No transactions found'}
            </p>
            <p className="text-gray-500 mt-2">
              {subOrgFilter !== 'all' ? 'Try selecting a different organization or clear the filter' : 'No transaction data available'}
            </p>
          </div>
        )}
      </Card>

      {/* System Overview for Guests */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Overview</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-200 mb-3">Spending Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Transactions:</span>
                <span className="text-gray-100">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Spent:</span>
                <span className="text-red-400 font-medium">${transactions.reduce((sum, t) => sum + t.debitAmount, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Allocated Transactions:</span>
                <span className="text-green-400 font-medium">{transactions.filter(t => t.subOrgId).length}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2">
                <span className="text-gray-300 font-medium">Unallocated Amount:</span>
                <span className="text-yellow-400 font-bold">
                  ${transactions.filter(t => !t.subOrgId).reduce((sum, t) => sum + t.debitAmount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-200 mb-3">Organization Breakdown</h4>
            <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
              {subOrgs.map(org => {
                const orgTransactions = transactions.filter(t => t.subOrgId === org.id);
                const orgSpent = orgTransactions.reduce((sum, t) => sum + t.debitAmount, 0);
                
                if (orgSpent === 0) return null;
                
                return (
                  <div key={org.id} className="flex justify-between">
                    <span className="text-gray-400 truncate">{org.name}:</span>
                    <span className="text-gray-300 font-medium">${orgSpent.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* PO Details Modal - Guest Version */}
      {selectedPO && (
        <PODetailsModal
          po={selectedPO}
          isOpen={isPODetailsModalOpen}
          onClose={closePODetailsModal}
          onPOUpdated={() => {}} // No updates needed from transactions page
          isGuestView={true} // Pass guest flag to hide comments
        />
      )}
    </div>
  );
};