import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal, AlertModal } from '../ui/Modal';
import { 
  Upload, 
  Download, 
  FileText,
  DollarSign,
  Calendar,
  Building,
  Search,
  Eye,
  Trash2,
  Edit,
  Save,
  X,
  Plus,
  Link as LinkIcon,
  Divide
} from 'lucide-react';
import { Transaction, SubOrganization, PurchaseOrder } from '../../types';
import { 
  getAllTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  processExcelData,
  uploadReceiptFile,
  recalculateAllBudgets
} from '../../services/transactionService';
import { getSubOrganizations } from '../../services/subOrgService';
import { getAllPOs, getPOById } from '../../services/poService';
import { PODetailsModal } from '../po/PODetailsModal';
import { POLinkingModal } from './POLinkingModal';
import { useAuth } from '../../contexts/AuthContext';
import { GuestTransactions } from './GuestTransactions';
import { useModal } from '../../hooks/useModal';
import * as XLSX from 'xlsx';

export const Transactions: React.FC = () => {
  const { isGuest, hasRole } = useAuth();
  const { confirmModal, alertModal, showConfirm, showAlert, closeConfirm, closeAlert, setConfirmLoading } = useModal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [subOrgFilter, setSubOrgFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [showSplitModal, setShowSplitModal] = useState<string | null>(null);
  const [splitAllocations, setSplitAllocations] = useState<{ subOrgId: string; amount: number }[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<string | null>(null);

  // PO Details Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPODetailsModalOpen, setIsPODetailsModalOpen] = useState(false);
  const [loadingPODetails, setLoadingPODetails] = useState(false);

  // PO Linking Modal State
  const [isPOLinkingModalOpen, setIsPOLinkingModalOpen] = useState(false);
  const [selectedTransactionForLinking, setSelectedTransactionForLinking] = useState<Transaction | null>(null);

  // If user is a guest, show the guest version
  if (isGuest) {
    return <GuestTransactions />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = transactions;

    if (subOrgFilter !== 'all') {
      if (subOrgFilter === 'unallocated') {
        // Only truly unallocated transactions (no subOrgId and no allocations)
        filtered = filtered.filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0));
      } else {
        // Include transactions where the org is either the primary allocation or part of a split
        filtered = filtered.filter(t => {
          // Check legacy single allocation
          if (t.subOrgId === subOrgFilter) return true;
          
          // Check split allocations
          if (t.allocations && t.allocations.length > 0) {
            return t.allocations.some(allocation => allocation.subOrgId === subOrgFilter);
          }
          
          return false;
        });
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.subOrgName && t.subOrgName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.allocations && t.allocations.some(alloc => 
          alloc.subOrgName.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, subOrgFilter, searchTerm]);

  const fetchData = async () => {
    try {
      const [transactionsData, subOrgsData, posData] = await Promise.all([
        getAllTransactions(),
        getSubOrganizations(),
        getAllPOs()
      ]);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
      setSubOrgs(subOrgsData);
      setPOs(posData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Convert to objects with proper headers
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      const processedData = rows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
          obj[normalizedHeader] = row[index];
        });
        return obj;
      });

      const result = await processExcelData(processedData);
      
      await fetchData(); // Refresh data
      
      await showAlert({
        title: 'Import Complete',
        message: `Successfully processed ${result.processed} transactions. ${result.skipped} skipped. ${result.errors.length} errors.`,
        variant: result.processed > 0 ? 'success' : 'warning'
      });

    } catch (error) {
      console.error('Error processing file:', error);
      await showAlert({
        title: 'Import Error',
        message: 'Error processing file. Please check the format and try again.',
        variant: 'error'
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleExport = () => {
    setExportLoading(true);
    try {
      // Prepare export data with proper split handling
      const exportData = filteredTransactions.map(transaction => {
        const baseData = {
          'Post Date': transaction.postDate.toLocaleDateString(),
          'Description': transaction.description,
          'Total Amount': transaction.debitAmount,
          'Status': transaction.status,
          'Notes': transaction.notes || '',
          'Linked POs': transaction.poLinks && transaction.poLinks.length > 0 
            ? transaction.poLinks.map(link => `${link.poName}: $${link.amount.toFixed(2)}`).join('; ')
            : transaction.linkedPOId 
            ? `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}` 
            : '',
          'PO Count': transaction.poLinks ? transaction.poLinks.length : (transaction.linkedPOId ? 1 : 0),
          'Receipt': transaction.receiptUrl ? (transaction.receiptFileName || 'Yes') : 'No',
          'Receipt URL': transaction.receiptUrl || '',
          'Created At': transaction.createdAt.toLocaleDateString()
        };

        // Handle split allocations vs single allocation
        if (transaction.allocations && transaction.allocations.length > 0) {
          if (transaction.allocations.length === 1) {
            // Single allocation from new system
            return {
              ...baseData,
              'Sub-Organization': transaction.allocations[0].subOrgName,
              'Allocated Amount': transaction.allocations[0].amount,
              'Allocation Type': 'Single',
              'Split Details': ''
            };
          } else {
            // Multiple allocations - create summary
            const splitDetails = transaction.allocations
              .map(alloc => `${alloc.subOrgName}: $${alloc.amount.toFixed(2)} (${alloc.percentage.toFixed(1)}%)`)
              .join('; ');
            
            return {
              ...baseData,
              'Sub-Organization': `Split (${transaction.allocations.length} orgs)`,
              'Allocated Amount': transaction.debitAmount, // Total amount
              'Allocation Type': 'Split',
              'Split Details': splitDetails
            };
          }
        } else if (transaction.subOrgName) {
          // Legacy single allocation
          return {
            ...baseData,
            'Sub-Organization': transaction.subOrgName,
            'Allocated Amount': transaction.debitAmount,
            'Allocation Type': 'Legacy Single',
            'Split Details': ''
          };
        } else {
          // Unallocated
          return {
            ...baseData,
            'Sub-Organization': 'Unallocated',
            'Allocated Amount': 0,
            'Allocation Type': 'Unallocated',
            'Split Details': ''
          };
        }
      });

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Main transactions sheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Post Date
        { wch: 40 }, // Description
        { wch: 12 }, // Total Amount
        { wch: 10 }, // Status
        { wch: 30 }, // Notes
        { wch: 25 }, // Sub-Organization
        { wch: 15 }, // Allocated Amount
        { wch: 15 }, // Allocation Type
        { wch: 60 }, // Split Details
        { wch: 15 }, // Linked PO
        { wch: 15 }, // Receipt
        { wch: 40 }, // Receipt URL
        { wch: 12 }  // Created At
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Create split details sheet for complex splits
      const splitTransactions = filteredTransactions.filter(t => 
        t.allocations && t.allocations.length > 1
      );

      if (splitTransactions.length > 0) {
        const splitData: any[] = [];
        
        splitTransactions.forEach(transaction => {
          transaction.allocations!.forEach((allocation, index) => {
            splitData.push({
              'Transaction Date': transaction.postDate.toLocaleDateString(),
              'Transaction Description': transaction.description,
              'Total Transaction Amount': transaction.debitAmount,
              'Split #': index + 1,
              'Organization': allocation.subOrgName,
              'Allocated Amount': allocation.amount,
              'Percentage': `${allocation.percentage.toFixed(1)}%`,
              'Notes': transaction.notes || '',
              'Receipt': transaction.receiptUrl ? (transaction.receiptFileName || 'Yes') : 'No'
            });
          });
        });

        const splitWs = XLSX.utils.json_to_sheet(splitData);
        splitWs['!cols'] = [
          { wch: 15 }, // Transaction Date
          { wch: 40 }, // Transaction Description
          { wch: 20 }, // Total Transaction Amount
          { wch: 8 },  // Split #
          { wch: 25 }, // Organization
          { wch: 15 }, // Allocated Amount
          { wch: 12 }, // Percentage
          { wch: 30 }, // Notes
          { wch: 15 }  // Receipt
        ];
        
        XLSX.utils.book_append_sheet(wb, splitWs, 'Split Details');
      }

      // Generate filename with current date and filter info
      const date = new Date().toISOString().split('T')[0];
      const filterSuffix = subOrgFilter !== 'all' ? `_${subOrgFilter === 'unallocated' ? 'unallocated' : subOrgs.find(org => org.id === subOrgFilter)?.name?.replace(/\s+/g, '_') || 'filtered'}` : '';
      const filename = `transactions_export${filterSuffix}_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      showAlert({
        title: 'Export Successful',
        message: `Transactions exported successfully as "${filename}". ${splitTransactions.length > 0 ? 'Split transaction details are included in a separate sheet.' : ''}`,
        variant: 'success'
      });

    } catch (error) {
      console.error('Error exporting transactions:', error);
      showAlert({
        title: 'Export Error',
        message: 'Error exporting transactions. Please try again.',
        variant: 'error'
      });
    } finally {
      setExportLoading(false);
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
        await showAlert({
          title: 'Error',
          message: 'PO not found',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      await showAlert({
        title: 'Error',
        message: 'Error loading PO details',
        variant: 'error'
      });
    } finally {
      setLoadingPODetails(false);
    }
  };

  const closePODetailsModal = () => {
    setIsPODetailsModalOpen(false);
    setSelectedPO(null);
  };

  const openPOLinkingModal = (transaction: Transaction) => {
    setSelectedTransactionForLinking(transaction);
    setIsPOLinkingModalOpen(true);
  };

  const closePOLinkingModal = () => {
    setIsPOLinkingModalOpen(false);
    setSelectedTransactionForLinking(null);
  };

  const handleSavePOLinks = async (poLinks: POLink[]) => {
    if (!selectedTransactionForLinking) return;

    try {
      await updateTransaction(selectedTransactionForLinking.id, {
        poLinks,
        // Clear legacy fields if we have new PO links
        ...(poLinks.length > 0 && {
          linkedPOId: null,
          linkedPOName: null
        })
      });
      
      await fetchData();
      closePOLinkingModal();
      
      await showAlert({
        title: 'Success',
        message: `Successfully linked ${poLinks.length} purchase order(s) to transaction`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Error saving PO links:', error);
      await showAlert({
        title: 'Error',
        message: 'Error saving PO links. Please try again.',
        variant: 'error'
      });
    }
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditData({
      notes: transaction.notes || '',
      linkedPOId: transaction.linkedPOId || '',
      linkedPOName: transaction.linkedPOName || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (transactionId: string) => {
    try {
      await updateTransaction(transactionId, editData);
      await fetchData();
      setEditingId(null);
      setEditData({});
      
      await showAlert({
        title: 'Success',
        message: 'Transaction updated successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      await showAlert({
        title: 'Error',
        message: 'Error updating transaction. Please try again.',
        variant: 'error'
      });
    }
  };

  const handleDelete = async (transactionId: string, description: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete the transaction "${description}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) return;

    setConfirmLoading(true);
    try {
      await deleteTransaction(transactionId);
      await fetchData();
      await showAlert({
        title: 'Success',
        message: 'Transaction deleted successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      await showAlert({
        title: 'Error',
        message: 'Error deleting transaction. Please try again.',
        variant: 'error'
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSplitTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Initialize with current allocation or empty
    if (transaction.allocations && transaction.allocations.length > 0) {
      setSplitAllocations(transaction.allocations.map(alloc => ({
        subOrgId: alloc.subOrgId,
        amount: alloc.amount
      })));
    } else if (transaction.subOrgId) {
      setSplitAllocations([{
        subOrgId: transaction.subOrgId,
        amount: transaction.debitAmount
      }]);
    } else {
      setSplitAllocations([{ subOrgId: '', amount: 0 }]);
    }
    
    setShowSplitModal(transactionId);
  };

  const addSplitAllocation = () => {
    setSplitAllocations([...splitAllocations, { subOrgId: '', amount: 0 }]);
  };

  const removeSplitAllocation = (index: number) => {
    if (splitAllocations.length > 1) {
      setSplitAllocations(splitAllocations.filter((_, i) => i !== index));
    }
  };

  const updateSplitAllocation = (index: number, field: 'subOrgId' | 'amount', value: string | number) => {
    const updated = [...splitAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setSplitAllocations(updated);
  };

  const distributeEvenly = () => {
    if (!showSplitModal) return;
    
    const transaction = transactions.find(t => t.id === showSplitModal);
    if (!transaction || splitAllocations.length === 0) return;

    const validAllocations = splitAllocations.filter(alloc => alloc.subOrgId);
    if (validAllocations.length === 0) return;

    const totalAmount = transaction.debitAmount;
    const amountPerAllocation = totalAmount / validAllocations.length;
    
    const updated = splitAllocations.map(alloc => {
      if (alloc.subOrgId) {
        return { ...alloc, amount: amountPerAllocation };
      }
      return alloc;
    });
    
    setSplitAllocations(updated);
  };

  const saveSplitTransaction = async () => {
    if (!showSplitModal) return;

    const transaction = transactions.find(t => t.id === showSplitModal);
    if (!transaction) return;

    // Validate allocations
    const validAllocations = splitAllocations.filter(alloc => alloc.subOrgId && alloc.amount > 0);
    if (validAllocations.length === 0) {
      await showAlert({
        title: 'Validation Error',
        message: 'Please add at least one valid allocation',
        variant: 'error'
      });
      return;
    }

    const totalAllocated = validAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    if (Math.abs(totalAllocated - transaction.debitAmount) > 0.01) {
      await showAlert({
        title: 'Validation Error',
        message: `Total allocated amount ($${totalAllocated.toFixed(2)}) must equal transaction amount ($${transaction.debitAmount.toFixed(2)})`,
        variant: 'error'
      });
      return;
    }

    try {
      // Create allocations with organization names and percentages
      const allocations = validAllocations.map((alloc, index) => {
        const subOrg = subOrgs.find(org => org.id === alloc.subOrgId);
        return {
          id: `${showSplitModal}-${index}`,
          subOrgId: alloc.subOrgId,
          subOrgName: subOrg?.name || 'Unknown',
          amount: alloc.amount,
          percentage: (alloc.amount / transaction.debitAmount) * 100
        };
      });

      await updateTransaction(showSplitModal, {
        allocations,
        subOrgId: null, // Clear legacy allocation
        subOrgName: null // Clear legacy allocation
      });

      await fetchData();
      setShowSplitModal(null);
      setSplitAllocations([]);

      await showAlert({
        title: 'Success',
        message: 'Transaction split successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error splitting transaction:', error);
      await showAlert({
        title: 'Error',
        message: 'Error splitting transaction. Please try again.',
        variant: 'error'
      });
    }
  };

  const handleReceiptUpload = async (transactionId: string, file: File) => {
    setUploadingReceipt(transactionId);
    try {
      const receiptUrl = await uploadReceiptFile(file, transactionId);
      await updateTransaction(transactionId, {
        receiptUrl,
        receiptFileName: file.name
      });
      
      await fetchData();
      await showAlert({
        title: 'Success',
        message: 'Receipt uploaded successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      await showAlert({
        title: 'Error',
        message: 'Error uploading receipt. Please try again.',
        variant: 'error'
      });
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handleReceiptDelete = async (transactionId: string, receiptUrl: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Receipt',
      message: 'Are you sure you want to remove this receipt reference? The file will remain in storage but will no longer be linked to this transaction.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) return;

    setDeletingReceipt(transactionId);
    try {
      // Update the transaction to remove receipt references
      await updateTransaction(transactionId, {
        receiptUrl: null,
        receiptFileName: null
      });
      
      await fetchData();
      await showAlert({
        title: 'Success',
        message: 'Receipt reference removed successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      await showAlert({
        title: 'Error',
        message: 'Error removing receipt reference. Please try again.',
        variant: 'error'
      });
    } finally {
      setDeletingReceipt(null);
    }
  };

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.debitAmount, 0);
  const allocatedTransactions = filteredTransactions.filter(t => 
    t.subOrgId || (t.allocations && t.allocations.length > 0)
  ).length;
  const unallocatedAmount = filteredTransactions
    .filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0))
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
        <div className="flex space-x-3">
          {hasRole('purchaser') && (
            <>
              <input
                id="transaction-import"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
              <Button 
                onClick={() => document.getElementById('transaction-import')?.click()}
                disabled={importing} 
                loading={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            onClick={handleExport}
            loading={exportLoading}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={subOrgFilter}
              onChange={(e) => setSubOrgFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
            >
              <option value="all" className="text-gray-100 bg-gray-700">All Organizations</option>
              <option value="unallocated" className="text-gray-100 bg-gray-700">Unallocated</option>
              {subOrgs.map(org => (
                <option key={org.id} value={org.id} className="text-gray-100 bg-gray-700">
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <div className="text-sm text-gray-400 mt-1">
                {filteredTransactions.length} transactions
                {subOrgFilter !== 'all' && subOrgFilter !== 'unallocated' && (
                  <div className="text-xs text-blue-400 mt-1">
                    Includes split transactions
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Icons Legend */}
            {hasRole('purchaser') && (
              <div className="text-right">
                <p className="text-xs font-medium text-gray-400 mb-2">Action Icons:</p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Building className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Assign Org</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <LinkIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Link POs</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Edit className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">Notes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trash2 className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-gray-500">Delete</span>
                  </div>
                </div>
              </div>
            )}
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
                <th className="text-left py-3 px-4 font-medium text-gray-200">Linked POs</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Receipt</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Notes</th>
                {hasRole('purchaser') && (
                  <th className="text-center py-3 px-4 font-medium text-gray-200">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const isEditing = editingId === transaction.id;
                
                return (
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
                      {transaction.allocations && transaction.allocations.length > 0 ? (
                        transaction.allocations.length === 1 ? (
                          <span className="text-gray-300">{transaction.allocations[0].subOrgName}</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="info" size="sm">Split ({transaction.allocations.length})</Badge>
                            </div>
                            <div className="space-y-1">
                              {transaction.allocations.map((allocation, index) => (
                                <div key={index} className="text-xs text-gray-400 flex justify-between items-center">
                                  <span className="truncate mr-2">{allocation.subOrgName}:</span>
                                  <span className="font-medium">${allocation.amount.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ) : transaction.subOrgName ? (
                        <span className="text-gray-300">{transaction.subOrgName}</span>
                      ) : (
                        <Badge variant="warning" size="sm">Unallocated</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {transaction.poLinks && transaction.poLinks.length > 0 ? (
                        <div className="space-y-1">
                          {transaction.poLinks.length === 1 ? (
                            <button
                              onClick={() => handleViewPODetails(transaction.poLinks![0].poId)}
                              disabled={loadingPODetails}
                              className="flex items-center space-x-1 hover:bg-gray-600 p-1 rounded transition-colors"
                            >
                              <Badge variant="info" size="sm">
                                {transaction.poLinks[0].poName}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                ${transaction.poLinks[0].amount.toFixed(2)}
                              </span>
                              <Eye className="h-3 w-3 text-gray-400" />
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="info" size="sm">
                                  {transaction.poLinks.length} POs
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  ${transaction.poLinks.reduce((sum, link) => sum + link.amount, 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {transaction.poLinks.map((link, index) => (
                                  <div key={index} className="text-xs text-gray-400 flex justify-between items-center">
                                    <button
                                      onClick={() => handleViewPODetails(link.poId)}
                                      className="hover:bg-gray-600 p-1 rounded transition-colors flex items-center space-x-1"
                                    >
                                      <span className="truncate mr-1">{link.poName}:</span>
                                      <span className="font-medium">${link.amount.toFixed(2)}</span>
                                      <Eye className="h-2 w-2" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : transaction.linkedPOId ? (
                        // Legacy single PO link
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
                    <td className="py-4 px-4">
                      {transaction.receiptUrl ? (
                        <div className="flex items-center space-x-2">
                          <a
                            href={transaction.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-green-400 hover:text-green-300"
                          >
                            <Badge variant="success" size="sm">
                              {transaction.receiptFileName || 'Receipt'}
                            </Badge>
                            <Eye className="h-3 w-3" />
                          </a>
                          {hasRole('purchaser') && (
                            <button
                              onClick={() => handleReceiptDelete(transaction.id, transaction.receiptUrl!)}
                              disabled={deletingReceipt === transaction.id}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                              title="Delete receipt reference"
                            >
                              {deletingReceipt === transaction.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : hasRole('purchaser') ? (
                        <div>
                          <input
                            id={`receipt-${transaction.id}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleReceiptUpload(transaction.id, file);
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`receipt-${transaction.id}`)?.click()}
                            loading={uploadingReceipt === transaction.id}
                            disabled={uploadingReceipt !== null}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No receipt</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.notes || ''}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                          placeholder="Add notes..."
                        />
                      ) : (
                        <span className="text-gray-300 text-sm">
                          {transaction.notes || '-'}
                        </span>
                      )}
                    </td>
                    {hasRole('purchaser') && (
                      <td className="py-4 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(transaction.id)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSplitTransaction(transaction.id)}
                              title="Split transaction"
                            >
                              <Building className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPOLinkingModal(transaction)}
                              title="Link purchase orders"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(transaction)}
                              title="Edit transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id, transaction.description)}
                              className="text-red-400 hover:text-red-300"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 mt-2">Import transactions or adjust your filters</p>
          </div>
        )}
      </Card>

      {/* Split Transaction Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-gray-100">Split Transaction</h2>
              <button
                onClick={() => setShowSplitModal(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-300">
                  Total Amount: <span className="font-bold text-green-400">
                    ${transactions.find(t => t.id === showSplitModal)?.debitAmount.toFixed(2)}
                  </span>
                </p>
              </div>
              
              {/* Allocation Summary */}
              {(() => {
                const transaction = transactions.find(t => t.id === showSplitModal);
                if (!transaction) return null;
                
                const validAllocations = splitAllocations.filter(alloc => alloc.subOrgId);
                const totalAllocated = validAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
                const remaining = transaction.debitAmount - totalAllocated;
                const isOverAllocated = totalAllocated > transaction.debitAmount;
                const isUnderAllocated = totalAllocated < transaction.debitAmount;
                
                return (
                  <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">Allocation Summary</span>
                      <span className={`text-sm font-medium ${
                        isOverAllocated ? 'text-red-400' : 
                        isUnderAllocated ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        {validAllocations.length} organization{validAllocations.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Total Allocated:</span>
                      <span className={`font-medium ${
                        isOverAllocated ? 'text-red-400' : 
                        isUnderAllocated ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        ${totalAllocated.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Remaining:</span>
                      <span className={`font-medium ${
                        isOverAllocated ? 'text-red-400' : 
                        isUnderAllocated ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        ${remaining.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverAllocated ? 'bg-red-500' : 
                          isUnderAllocated ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min((totalAllocated / transaction.debitAmount) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
              
              <div className="space-y-4">
                {splitAllocations.map((allocation, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={allocation.subOrgId}
                        onChange={(e) => updateSplitAllocation(index, 'subOrgId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
                      >
                        <option value="">Select organization</option>
                        {subOrgs.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={allocation.amount === 0 ? '' : allocation.amount}
                        onChange={(e) => updateSplitAllocation(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    {splitAllocations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSplitAllocation(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={addSplitAllocation}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Allocation
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={distributeEvenly}
                    disabled={splitAllocations.filter(alloc => alloc.subOrgId).length === 0}
                  >
                    <Divide className="h-4 w-4 mr-2" />
                    Distribute Evenly
                  </Button>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSplitModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveSplitTransaction}>
                    Save Split
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPO && (
        <PODetailsModal
          po={selectedPO}
          isOpen={isPODetailsModalOpen}
          onClose={closePODetailsModal}
          onPOUpdated={() => {}} // No updates needed from transactions page
        />
      )}

      {/* PO Linking Modal */}
      {selectedTransactionForLinking && (
        <POLinkingModal
          transaction={selectedTransactionForLinking}
          availablePOs={pos}
          isOpen={isPOLinkingModalOpen}
          onClose={closePOLinkingModal}
          onSave={handleSavePOLinks}
        />
      )}

      {/* Custom Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.options.title}
        message={confirmModal.options.message}
        confirmText={confirmModal.options.confirmText}
        cancelText={confirmModal.options.cancelText}
        variant={confirmModal.options.variant}
        loading={confirmModal.loading}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.options.title}
        message={alertModal.options.message}
        variant={alertModal.options.variant}
      />
    </div>
  );
};