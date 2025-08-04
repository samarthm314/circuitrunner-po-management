import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Transaction, POLink, PurchaseOrder } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface POLinkingModalProps {
  transaction: Transaction;
  availablePOs: PurchaseOrder[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (poLinks: POLink[]) => void;
}

export const POLinkingModal: React.FC<POLinkingModalProps> = ({
  transaction,
  availablePOs,
  isOpen,
  onClose,
  onSave
}) => {
  const [poLinks, setPOLinks] = useState<POLink[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize with existing PO links or legacy single PO link
  useEffect(() => {
    if (transaction.poLinks && transaction.poLinks.length > 0) {
      setPOLinks(transaction.poLinks);
    } else if (transaction.linkedPOId) {
      // Migrate legacy single PO link
      setPOLinks([{
        id: `legacy-${transaction.linkedPOId}`,
        poId: transaction.linkedPOId,
        poName: transaction.linkedPOName || `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}`,
        amount: transaction.debitAmount,
        percentage: 100
      }]);
    } else {
      setPOLinks([]);
    }
  }, [transaction]);

  // Calculate total allocated amount
  useEffect(() => {
    const total = poLinks.reduce((sum, link) => sum + link.amount, 0);
    setTotalAllocated(total);
    
    // Validate allocations
    const newErrors: string[] = [];
    if (total > transaction.debitAmount) {
      newErrors.push(`Total allocated amount ($${total.toFixed(2)}) exceeds transaction amount ($${transaction.debitAmount.toFixed(2)})`);
    }
    
    // Check for duplicate PO links
    const poIds = poLinks.map(link => link.poId).filter(id => id);
    const uniquePoIds = new Set(poIds);
    if (poIds.length !== uniquePoIds.size) {
      newErrors.push('Duplicate PO links detected');
    }
    
    setErrors(newErrors);
  }, [poLinks, transaction.debitAmount]);

  const addPOLink = () => {
    setPOLinks([...poLinks, {
      id: `temp-${Date.now()}`,
      poId: '',
      poName: '',
      amount: 0,
      percentage: 0
    }]);
  };

  const removePOLink = (index: number) => {
    setPOLinks(poLinks.filter((_, i) => i !== index));
  };

  const updatePOLink = (index: number, field: keyof POLink, value: string | number) => {
    const updated = [...poLinks];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating PO ID, also update PO name
    if (field === 'poId') {
      const selectedPO = availablePOs.find(po => po.id === value);
      updated[index].poName = selectedPO?.name || '';
    }
    
    // If updating amount, recalculate percentage
    if (field === 'amount') {
      const amount = typeof value === 'number' ? value : 0;
      updated[index].amount = amount;
      updated[index].percentage = transaction.debitAmount > 0 ? (amount / transaction.debitAmount) * 100 : 0;
    }
    
    setPOLinks(updated);
  };

  const distributeEvenly = () => {
    if (poLinks.length === 0) return;
    
    const evenAmount = transaction.debitAmount / poLinks.length;
    const updated = poLinks.map(link => ({
      ...link,
      amount: evenAmount,
      percentage: (evenAmount / transaction.debitAmount) * 100
    }));
    setPOLinks(updated);
  };

  const handleSave = () => {
    if (errors.length > 0) return;
    if (Math.abs(totalAllocated - transaction.debitAmount) > 0.01) return;
    
    // Filter out empty PO links
    const validLinks = poLinks.filter(link => link.poId && link.amount > 0);
    onSave(validLinks);
  };

  const getAvailablePOsForSelection = () => {
    // Filter out POs that are already selected (except for the current link being edited)
    return availablePOs.filter(po => {
      const isSelected = poLinks.some(link => link.poId === po.id);
      return !isSelected;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">Link Purchase Orders</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Transaction Summary */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium text-gray-100 mb-2">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Description:</span>
                <p className="text-gray-100 font-medium">{transaction.description}</p>
              </div>
              <div>
                <span className="text-gray-400">Total Amount:</span>
                <p className="text-gray-100 font-medium">${transaction.debitAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Date:</span>
                <p className="text-gray-100 font-medium">{transaction.postDate.toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Allocation Summary */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-100">Allocation Summary</h3>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400">
                  Allocated: <span className={`font-bold ${totalAllocated > transaction.debitAmount ? 'text-red-400' : 'text-green-400'}`}>
                    ${totalAllocated.toFixed(2)}
                  </span>
                </span>
                <span className="text-gray-400">
                  Remaining: <span className={`font-bold ${transaction.debitAmount - totalAllocated < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    ${(transaction.debitAmount - totalAllocated).toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  totalAllocated > transaction.debitAmount 
                    ? 'bg-red-500' 
                    : totalAllocated === transaction.debitAmount 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((totalAllocated / transaction.debitAmount) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h4 className="text-red-400 font-medium">Validation Errors</h4>
              </div>
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* PO Links */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-100">Purchase Order Links</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={distributeEvenly}
                  disabled={poLinks.length === 0}
                >
                  Distribute Evenly
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPOLink}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add PO Link
                </Button>
              </div>
            </div>

            {poLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No PO links added yet.</p>
                <p className="text-sm mt-1">Click "Add PO Link" to start linking purchase orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {poLinks.map((link, index) => (
                  <div key={link.id} className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={link.poId}
                        onChange={(e) => updatePOLink(index, 'poId', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
                      >
                        <option value="">Select Purchase Order</option>
                        {getAvailablePOsForSelection().map(po => (
                          <option key={po.id} value={po.id}>
                            {po.name || `PO #${po.id.slice(-6).toUpperCase()}`} - ${po.totalAmount.toFixed(2)}
                          </option>
                        ))}
                        {/* Show currently selected PO even if it's in the list */}
                        {link.poId && (
                          <option value={link.poId}>
                            {link.poName} - ${availablePOs.find(po => po.id === link.poId)?.totalAmount.toFixed(2) || '0.00'}
                          </option>
                        )}
                      </select>
                    </div>
                    
                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={transaction.debitAmount}
                        value={link.amount === 0 ? '' : link.amount}
                        onChange={(e) => updatePOLink(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="w-20 text-center">
                      <span className="text-sm text-gray-400">
                        {link.percentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <button
                      onClick={() => removePOLink(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                      title="Remove PO link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={errors.length > 0 || Math.abs(totalAllocated - transaction.debitAmount) > 0.01 || poLinks.length === 0}
            >
              Save PO Links
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 