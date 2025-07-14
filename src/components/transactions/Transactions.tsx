import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal, AlertModal } from '../ui/Modal';
import { 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  FileText,
  DollarSign,
  Calendar,
  Building,
  Link,
  Search,
  Eye,
  Split,
  Plus,
  Minus
} from 'lucide-react';
import { Transaction, SubOrganization, PurchaseOrder, TransactionAllocation } from '../../types';
import { 
  getAllTransactions, 
  updateTransaction, 
  deleteTransaction, 
  uploadReceiptFile, 
  deleteReceiptFile,
  processExcelData,
  recalculateAllBudgets
} from '../../services/transactionService';
import { getSubOrganizations } from '../../services/subOrgService';
import { getPOsByStatus, getPOById } from '../../services/poService';
import { useAuth } from '../../contexts/AuthContext';
import { PODetailsModal } from '../po/PODetailsModal';
import { GuestTransactions } from './GuestTransactions';
import { useModal } from '../../hooks/useModal';
import * as XLSX from 'xlsx';

export const Transactions: React.FC = () => {
  const { userProfile, isGuest } = useAuth();
  const { confirmModal, alertModal, showConfirm, showAlert, closeConfirm, closeAlert, setConfirmLoading } = useModal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [purchasedPOs, setPurchasedPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [editAllocations, setEditAllocations] = useState<TransactionAllocation[]>([]);
  const [isSplitMode, setIsSplitMode] = useState<{ [key: string]: boolean }>({});
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [processingExcel, setProcessingExcel] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [subOrgFilter, setSubOrgFilter] = useState<string>('all');
  
  // PO Selection Modal State
  const [showPOModal, setShowPOModal] = useState<string | null>(null);
  const [poSearchTerm, setPOSearchTerm] = useState('');
  const [linkingPO, setLinkingPO] = useState(false);

  // PO Details Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPODetailsModalOpen, setIsPODetailsModalOpen] = useState(false);
  const [loadingPODetails, setLoadingPODetails] = useState(false);

  // If user is a guest, show the guest version
  if (isGuest) {
    return <GuestTransactions />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply sub-organization filter
    let filtered = transactions;

    if (subOrgFilter !== 'all') {
      if (subOrgFilter === 'unallocated') {
        filtered = filtered.filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0));
      } else {
        filtered = filtered.filter(t => 
          t.subOrgId === subOrgFilter || 
          (t.allocations && t.allocations.some(a => a.subOrgId === subOrgFilter))
        );
      }
    }

    setFilteredTransactions(filtered);
  }, [transactions, subOrgFilter]);

  const fetchData = async () => {
    try {
      const [transactionsData, subOrgsData, purchasedPOsData] = await Promise.all([
        getAllTransactions(),
        getSubOrganizations(),
        getPOsByStatus('purchased')
      ]);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
      setSubOrgs(subOrgsData);
      setPurchasedPOs(purchasedPOsData);
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

  const triggerFileUpload = () => {
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const triggerReceiptUpload = (transactionId: string) => {
    const fileInput = document.getElementById(`receipt-upload-${transactionId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true }); // Enable automatic date parsing
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false, // This helps with date formatting
        dateNF: 'mm/dd/yyyy' // Specify date format
      });
      
      // Convert to objects with proper headers
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '');
          obj[key] = (row as any[])[index];
        });
        return obj;
      });

      console.log('Sample row for debugging:', rows[0]);

      const result = await processExcelData(rows);
      
      await showAlert({
        title: 'Excel Processing Complete',
        message: `Excel processed successfully!\nProcessed: ${result.processed}\nSkipped: ${result.skipped}\nErrors: ${result.errors.length}`,
        variant: 'success'
      });
      
      if (result.errors.length > 0) {
        console.error('Processing errors:', result.errors);
      }

      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error processing Excel:', error);
      await showAlert({
        title: 'Error',
        message: 'Error processing Excel file. Please check the format.',
        variant: 'error'
      });
    } finally {
      setProcessingExcel(false);
      event.target.value = ''; // Reset file input
    }
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
        'Receipt': transaction.receiptUrl ? 'Yes' : 'No',
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
      showAlert({
        title: 'Error',
        message: 'Error exporting transactions. Please try again.',
        variant: 'error'
      });
    }
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    
    // Initialize allocations for split mode
    if (transaction.allocations && transaction.allocations.length > 0) {
      setEditAllocations([...transaction.allocations]);
      setIsSplitMode(prev => ({ ...prev, [transaction.id]: true }));
    } else if (transaction.subOrgId) {
      // Convert single allocation to split format
      setEditAllocations([{
        id: '1',
        subOrgId: transaction.subOrgId,
        subOrgName: transaction.subOrgName || '',
        amount: transaction.debitAmount,
        percentage: 100
      }]);
      setIsSplitMode(prev => ({ ...prev, [transaction.id]: false }));
    } else {
      // Unallocated transaction
      setEditAllocations([]);
      setIsSplitMode(prev => ({ ...prev, [transaction.id]: false }));
    }
    
    setEditData({
      subOrgId: transaction.subOrgId,
      subOrgName: transaction.subOrgName,
      notes: transaction.notes || '', // Default to empty string if undefined
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setEditAllocations([]);
    setIsSplitMode(prev => {
      const newState = { ...prev };
      if (editingId) {
        delete newState[editingId];
      }
      return newState;
    });
  };

  const toggleSplitMode = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const currentSplitMode = isSplitMode[transactionId];
    
    if (!currentSplitMode) {
      // Switching to split mode
      if (editAllocations.length === 0) {
        // Start with one allocation for the full amount
        setEditAllocations([{
          id: '1',
          subOrgId: '',
          subOrgName: '',
          amount: transaction.debitAmount,
          percentage: 100
        }]);
      }
    } else {
      // Switching to single mode - keep only the first allocation
      if (editAllocations.length > 0) {
        const firstAllocation = editAllocations[0];
        setEditData({
          ...editData,
          subOrgId: firstAllocation.subOrgId,
          subOrgName: firstAllocation.subOrgName
        });
        setEditAllocations([firstAllocation]);
      }
    }
    
    setIsSplitMode(prev => ({ ...prev, [transactionId]: !currentSplitMode }));
  };

  const addAllocation = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const usedAmount = editAllocations.reduce((sum, a) => sum + a.amount, 0);
    const remainingAmount = transaction.debitAmount - usedAmount;
    
    if (remainingAmount > 0) {
      const newAllocation: TransactionAllocation = {
        id: Date.now().toString(),
        subOrgId: '',
        subOrgName: '',
        amount: remainingAmount,
        percentage: (remainingAmount / transaction.debitAmount) * 100
      };
      
      setEditAllocations(prev => [...prev, newAllocation]);
    }
  };

  const removeAllocation = (allocationId: string) => {
    setEditAllocations(prev => prev.filter(a => a.id !== allocationId));
  };

  const updateAllocation = (allocationId: string, field: keyof TransactionAllocation, value: string | number) => {
    const transaction = transactions.find(t => t.id === editingId);
    if (!transaction) return;
    
    setEditAllocations(prev => prev.map(allocation => {
      if (allocation.id === allocationId) {
        const updated = { ...allocation, [field]: value };
        
        // Update sub-org name when sub-org ID changes
        if (field === 'subOrgId') {
          const selectedSubOrg = subOrgs.find(org => org.id === value);
          updated.subOrgName = selectedSubOrg?.name || '';
        }
        
        // Recalculate percentage when amount changes
        if (field === 'amount') {
          updated.percentage = transaction.debitAmount > 0 ? ((value as number) / transaction.debitAmount) * 100 : 0;
        }
        
        return updated;
      }
      return allocation;
    }));
  };

  const saveEdit = async (transactionId: string) => {
    setSavingEdit(true);
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;
      
      // Clean the update data to remove undefined values
      const updateData: Partial<Transaction> = {};
      
      if (isSplitMode[transactionId]) {
        // Split mode - save allocations
        const validAllocations = editAllocations.filter(a => a.subOrgId && a.amount > 0);
        
        if (validAllocations.length === 0) {
          // No valid allocations - clear everything
          updateData.allocations = null;
          updateData.subOrgId = null;
          updateData.subOrgName = null;
        } else {
          updateData.allocations = validAllocations;
          // Clear legacy fields when using allocations
          updateData.subOrgId = null;
          updateData.subOrgName = null;
        }
      } else {
        // Single mode - use legacy fields
        const selectedSubOrg = subOrgs.find(org => org.id === editData.subOrgId);
        
        if (editData.subOrgId !== undefined) {
          updateData.subOrgId = editData.subOrgId || null;
        }
        
        if (selectedSubOrg?.name) {
          updateData.subOrgName = selectedSubOrg.name;
        } else if (editData.subOrgId === '') {
          updateData.subOrgName = null;
        }
        
        // Clear allocations when using single mode
        updateData.allocations = null;
      }
      
      if (editData.notes !== undefined) {
        updateData.notes = editData.notes;
      }

      // Update transaction (this will automatically trigger budget recalculation)
      await updateTransaction(transactionId, updateData);
      
      // Wait a moment for the budget recalculation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh data to show updated budgets
      await fetchData();
      
      setEditingId(null);
      setEditData({});
      setEditAllocations([]);
      setIsSplitMode(prev => {
        const newState = { ...prev };
        delete newState[transactionId];
        return newState;
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      await showAlert({
        title: 'Error',
        message: 'Error updating transaction. Please try again.',
        variant: 'error'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReceiptUpload = async (transactionId: string, file: File) => {
    setUploadingReceipt(transactionId);
    try {
      const receiptUrl = await uploadReceiptFile(file, transactionId);
      
      await updateTransaction(transactionId, {
        receiptUrl,
        receiptFileName: file.name,
      });

      await fetchData();
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

  const handleReceiptFileChange = (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleReceiptUpload(transactionId, file);
    }
    // Reset the input value to allow re-uploading the same file
    event.target.value = '';
  };

  const handleReceiptDelete = async (transactionId: string, receiptUrl: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Receipt',
      message: 'Are you sure you want to delete this receipt?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      await deleteReceiptFile(receiptUrl);
      await updateTransaction(transactionId, {
        receiptUrl: null,
        receiptFileName: null,
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      await showAlert({
        title: 'Error',
        message: 'Error deleting receipt. Please try again.',
        variant: 'error'
      });
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
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

  const handleRecalculateBudgets = async () => {
    const confirmed = await showConfirm({
      title: 'Recalculate Budgets',
      message: 'This will recalculate all budget spent amounts based on current transactions. Continue?',
      confirmText: 'Recalculate',
      cancelText: 'Cancel',
      variant: 'info'
    });

    if (!confirmed) return;

    setConfirmLoading(true);
    try {
      setLoading(true);
      await recalculateAllBudgets();
      await fetchData();
      await showAlert({
        title: 'Success',
        message: 'Budget recalculation completed successfully!',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error recalculating budgets:', error);
      await showAlert({
        title: 'Error',
        message: 'Error recalculating budgets. Please try again.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
      setConfirmLoading(false);
    }
  };

  const handleSelectPO = (transactionId: string) => {
    setShowPOModal(transactionId);
    setPOSearchTerm('');
  };

  const handleLinkPO = async (transactionId: string, poId: string) => {
    setLinkingPO(true);
    try {
      const selectedPO = purchasedPOs.find(po => po.id === poId);
      await updateTransaction(transactionId, {
        linkedPOId: poId,
        linkedPOName: selectedPO?.name || `PO #${poId.slice(-6).toUpperCase()}`
      });

      await fetchData();
      setShowPOModal(null);
    } catch (error) {
      console.error('Error linking PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Error linking PO. Please try again.',
        variant: 'error'
      });
    } finally {
      setLinkingPO(false);
    }
  };

  const handleUnlinkPO = async (transactionId: string) => {
    const confirmed = await showConfirm({
      title: 'Unlink Purchase Order',
      message: 'Are you sure you want to unlink this PO?',
      confirmText: 'Unlink',
      cancelText: 'Cancel',
      variant: 'warning'
    });

    if (!confirmed) return;

    try {
      await updateTransaction(transactionId, {
        linkedPOId: null,
        linkedPOName: null
      });

      await fetchData();
    } catch (error) {
      console.error('Error unlinking PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Error unlinking PO. Please try again.',
        variant: 'error'
      });
    }
  };

  const filteredPOs = purchasedPOs.filter(po => {
    if (!poSearchTerm) return true;
    const searchLower = poSearchTerm.toLowerCase();
    return (
      po.name?.toLowerCase().includes(searchLower) ||
      po.id.toLowerCase().includes(searchLower) ||
      po.creatorName.toLowerCase().includes(searchLower) ||
      po.subOrgName.toLowerCase().includes(searchLower)
    );
  });

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.debitAmount, 0);
  const allocatedTransactions = filteredTransactions.filter(t => 
    t.subOrgId || (t.allocations && t.allocations.length > 0)
  ).length;
  const unallocatedAmount = filteredTransactions
    .filter(t => !t.subOrgId && (!t.allocations || t.allocations.length === 0))
    .reduce((sum, t) => sum + t.debitAmount, 0);

  const getTransactionAllocationDisplay = (transaction: Transaction) => {
    if (transaction.allocations && transaction.allocations.length > 0) {
      if (transaction.allocations.length === 1) {
        const allocation = transaction.allocations[0];
        return (
          <div className="flex items-center space-x-2">
            <span className="text-gray-300">{allocation.subOrgName}</span>
            <Badge variant="info" size="sm">
              ${allocation.amount.toFixed(2)}
            </Badge>
          </div>
        );
      } else {
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Split className="h-3 w-3 text-blue-400" />
              <Badge variant="info" size="sm">Split ({transaction.allocations.length})</Badge>
            </div>
            {transaction.allocations.map((allocation, index) => (
              <div key={index} className="text-xs text-gray-400 ml-4">
                {allocation.subOrgName}: ${allocation.amount.toFixed(2)}
              </div>
            ))}
          </div>
        );
      }
    } else if (transaction.subOrgName) {
      return <span className="text-gray-300">{transaction.subOrgName}</span>;
    } else {
      return <Badge variant="warning" size="sm">Unallocated</Badge>;
    }
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
        <h1 className="text-3xl font-bold text-gray-100">Transactions</h1>
        <div className="flex space-x-3">
          {/* Hidden file input */}
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
            disabled={processingExcel}
          />
          
          {/* Visible upload button */}
          <Button 
            onClick={triggerFileUpload}
            disabled={processingExcel} 
            loading={processingExcel}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" onClick={handleRecalculateBudgets}>
            <Building className="h-4 w-4 mr-2" />
            Recalculate Budgets
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
                <th className="text-left py-3 px-4 font-medium text-gray-200">Receipt</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Notes</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Linked PO</th>
                <th className="text-center py-3 px-4 font-medium text-gray-200">Actions</th>
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
                      {isEditing ? (
                        <div className="space-y-2">
                          {/* Split Mode Toggle */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={isSplitMode[transaction.id] ? "primary" : "outline"}
                              size="sm"
                              onClick={() => toggleSplitMode(transaction.id)}
                              disabled={savingEdit}
                            >
                              <Split className="h-3 w-3 mr-1" />
                              {isSplitMode[transaction.id] ? 'Split Mode' : 'Single Mode'}
                            </Button>
                            {isSplitMode[transaction.id] && (
                              <span className="text-xs text-gray-400">
                                Total: ${editAllocations.reduce((sum, a) => sum + a.amount, 0).toFixed(2)} / ${transaction.debitAmount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Single Mode */}
                          {!isSplitMode[transaction.id] && (
                            <select
                              value={editData.subOrgId || ''}
                              onChange={(e) => setEditData({ ...editData, subOrgId: e.target.value })}
                              className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                              disabled={savingEdit}
                            >
                              <option value="" className="text-gray-100 bg-gray-700">Select organization</option>
                              {subOrgs.map(org => (
                                <option key={org.id} value={org.id} className="text-gray-100 bg-gray-700">
                                  {org.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Split Mode */}
                          {isSplitMode[transaction.id] && (
                            <div className="space-y-2">
                              {editAllocations.map((allocation, index) => (
                                <div key={allocation.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                                  <select
                                    value={allocation.subOrgId}
                                    onChange={(e) => updateAllocation(allocation.id, 'subOrgId', e.target.value)}
                                    className="flex-1 px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                                    disabled={savingEdit}
                                  >
                                    <option value="">Select org</option>
                                    {subOrgs.map(org => (
                                      <option key={org.id} value={org.id}>
                                        {org.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    value={allocation.amount}
                                    onChange={(e) => updateAllocation(allocation.id, 'amount', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                                    placeholder="Amount"
                                    min="0"
                                    max={transaction.debitAmount}
                                    step="0.01"
                                    disabled={savingEdit}
                                  />
                                  <span className="text-xs text-gray-400 w-12">
                                    {allocation.percentage.toFixed(0)}%
                                  </span>
                                  {editAllocations.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAllocation(allocation.id)}
                                      disabled={savingEdit}
                                      className="p-1 text-red-400 hover:text-red-300"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              
                              {/* Add Allocation Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addAllocation(transaction.id)}
                                disabled={savingEdit || editAllocations.reduce((sum, a) => sum + a.amount, 0) >= transaction.debitAmount}
                                className="w-full"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Allocation
                              </Button>
                              
                              {/* Validation Message */}
                              {editAllocations.reduce((sum, a) => sum + a.amount, 0) > transaction.debitAmount && (
                                <div className="text-xs text-red-400">
                                  Total allocations exceed transaction amount!
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        getTransactionAllocationDisplay(transaction)
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {/* Hidden file input for each transaction */}
                      <input
                        id={`receipt-upload-${transaction.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleReceiptFileChange(transaction.id, e)}
                        className="hidden"
                        disabled={uploadingReceipt === transaction.id}
                      />
                      
                      {transaction.receiptUrl ? (
                        <div className="flex items-center space-x-2">
                          <a
                            href={transaction.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                            title="View Receipt"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleReceiptDelete(transaction.id, transaction.receiptUrl!)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Receipt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerReceiptUpload(transaction.id)}
                          disabled={uploadingReceipt === transaction.id}
                          loading={uploadingReceipt === transaction.id}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.notes || ''}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                          placeholder="Add notes..."
                          disabled={savingEdit}
                        />
                      ) : (
                        <span className="text-gray-300 text-sm">
                          {transaction.notes || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {transaction.linkedPOId ? (
                        <div className="flex items-center space-x-2">
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
                          <button
                            onClick={() => handleUnlinkPO(transaction.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Unlink PO"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectPO(transaction.id)}
                        >
                          <Link className="h-3 w-3 mr-1" />
                          Select PO
                        </Button>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(transaction.id)}
                            loading={savingEdit}
                            disabled={savingEdit}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            disabled={savingEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {subOrgFilter !== 'all' ? 'No transactions found for the selected organization' : 'No transactions found'}
            </p>
            <p className="text-gray-500 mt-2">
              {subOrgFilter !== 'all' ? 'Try selecting a different organization or clear the filter' : 'Upload an Excel file to get started'}
            </p>
          </div>
        )}
      </Card>

      {/* PO Selection Modal */}
      {showPOModal && createPortal(
        <div 
          className="bg-black bg-opacity-75 flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 50,
            margin: 0,
            padding: '16px'
          }}
        >
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-100">Select Purchase Order</h3>
                <button
                  onClick={() => setShowPOModal(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO name, ID, creator, or sub-organization..."
                  value={poSearchTerm}
                  onChange={(e) => setPOSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-6">
              {filteredPOs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No purchased POs found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {poSearchTerm ? 'Try adjusting your search terms' : 'No POs have been marked as purchased yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPOs.map((po) => (
                    <div
                      key={po.id}
                      className="flex justify-between items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-100">
                            {po.name || `PO #${po.id.slice(-6).toUpperCase()}`}
                          </h4>
                          <Badge variant="success" size="sm">Purchased</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                          <div>
                            <span className="font-medium text-gray-200">Creator:</span> {po.creatorName}
                          </div>
                          <div>
                            <span className="font-medium text-gray-200">Sub-Org:</span> {po.subOrgName}
                          </div>
                          <div>
                            <span className="font-medium text-gray-200">Amount:</span> ${po.totalAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleLinkPO(showPOModal, po.id)}
                        loading={linkingPO}
                        disabled={linkingPO}
                        size="sm"
                      >
                        <Link className="h-4 w-4 mr-1" />
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
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

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Excel Upload Instructions</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-gray-300">
          <p><strong className="text-gray-200">Required Columns:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Post Date:</strong> Transaction date (will be parsed from spreadsheet)</li>
            <li><strong>Description:</strong> Transaction description</li>
            <li><strong>Debit:</strong> Transaction amount (must be positive)</li>
            <li><strong>Status:</strong> Must be "Posted" to be processed</li>
          </ul>
          <p className="mt-4"><strong className="text-gray-200">Processing Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Only transactions with status "Posted" are imported</li>
            <li>Only transactions with positive debit amounts are imported</li>
            <li>Duplicate descriptions are automatically skipped</li>
            <li>Transaction dates are parsed from the spreadsheet, not the upload date</li>
            <li>After import, assign transactions to sub-organizations for budget tracking</li>
            <li>Budget spent amounts are automatically recalculated when transactions are allocated</li>
            <li>Link transactions to purchased POs for better tracking and reporting</li>
            <li>Click on linked PO badges to view detailed purchase order information</li>
          </ul>
        </div>
      </Card>

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