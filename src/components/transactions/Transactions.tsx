import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
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
  Building
} from 'lucide-react';
import { Transaction, SubOrganization } from '../../types';
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
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

export const Transactions: React.FC = () => {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const [processingExcel, setProcessingExcel] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transactionsData, subOrgsData] = await Promise.all([
        getAllTransactions(),
        getSubOrganizations()
      ]);
      setTransactions(transactionsData);
      setSubOrgs(subOrgsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
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

      const result = await processExcelData(rows);
      
      alert(`Excel processed successfully!\nProcessed: ${result.processed}\nSkipped: ${result.skipped}\nErrors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.error('Processing errors:', result.errors);
      }

      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error processing Excel:', error);
      alert('Error processing Excel file. Please check the format.');
    } finally {
      setProcessingExcel(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = transactions.map(transaction => ({
        'Post Date': transaction.postDate.toLocaleDateString(),
        'Description': transaction.description,
        'Amount': transaction.debitAmount,
        'Sub-Organization': transaction.subOrgName || 'Unallocated',
        'Status': transaction.status,
        'Notes': transaction.notes || '',
        'Receipt': transaction.receiptUrl ? 'Yes' : 'No',
        'Created At': transaction.createdAt.toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `transactions_export_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Error exporting transactions. Please try again.');
    }
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditData({
      subOrgId: transaction.subOrgId,
      subOrgName: transaction.subOrgName,
      notes: transaction.notes || '', // Default to empty string if undefined
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (transactionId: string) => {
    setSavingEdit(true);
    try {
      const selectedSubOrg = subOrgs.find(org => org.id === editData.subOrgId);
      
      // Clean the update data to remove undefined values
      const updateData: Partial<Transaction> = {};
      
      if (editData.subOrgId !== undefined) {
        updateData.subOrgId = editData.subOrgId || null; // Use null instead of empty string
      }
      
      if (selectedSubOrg?.name) {
        updateData.subOrgName = selectedSubOrg.name;
      } else if (editData.subOrgId === '') {
        updateData.subOrgName = null; // Clear sub-org name if unassigned
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
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
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
      alert('Error uploading receipt. Please try again.');
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
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      await deleteReceiptFile(receiptUrl);
      await updateTransaction(transactionId, {
        receiptUrl: null,
        receiptFileName: null,
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error deleting receipt. Please try again.');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await deleteTransaction(transactionId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    }
  };

  const handleRecalculateBudgets = async () => {
    if (!confirm('This will recalculate all budget spent amounts based on current transactions. Continue?')) return;

    try {
      setLoading(true);
      await recalculateAllBudgets();
      await fetchData();
      alert('Budget recalculation completed successfully!');
    } catch (error) {
      console.error('Error recalculating budgets:', error);
      alert('Error recalculating budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = transactions.reduce((sum, t) => sum + t.debitAmount, 0);
  const allocatedTransactions = transactions.filter(t => t.subOrgId).length;
  const unallocatedAmount = transactions
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
              <p className="text-sm font-medium text-gray-400">Total Spent</p>
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
              <p className="text-sm font-medium text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-100">{transactions.length}</p>
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
          <CardTitle>Transaction History</CardTitle>
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
                <th className="text-center py-3 px-4 font-medium text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
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
                      ) : (
                        <span className="text-gray-300">
                          {transaction.subOrgName || (
                            <Badge variant="warning" size="sm">Unallocated</Badge>
                          )}
                        </span>
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

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 mt-2">Upload an Excel file to get started</p>
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Excel Upload Instructions</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-gray-300">
          <p><strong className="text-gray-200">Required Columns:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Post Date:</strong> Transaction date</li>
            <li><strong>Description:</strong> Transaction description</li>
            <li><strong>Debit:</strong> Transaction amount (must be positive)</li>
            <li><strong>Status:</strong> Must be "Posted" to be processed</li>
          </ul>
          <p className="mt-4"><strong className="text-gray-200">Processing Rules:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Only transactions with status "Posted" are imported</li>
            <li>Only transactions with positive debit amounts are imported</li>
            <li>Duplicate descriptions are automatically skipped</li>
            <li>After import, assign transactions to sub-organizations for budget tracking</li>
            <li>Budget spent amounts are automatically recalculated when transactions are allocated</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};