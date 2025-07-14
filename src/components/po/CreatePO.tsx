import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Building, AlertCircle, X, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { createPO, updatePO, getPOById } from '../../services/poService';
import { getSubOrganizations } from '../../services/subOrgService';
import { useModal } from '../../hooks/useModal';
import { useNavigate, useParams } from 'react-router-dom';

interface LineItem {
  id: string;
  vendor: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  link: string;
  notes: string;
  totalPrice: number;
}

interface SubOrganization {
  id: string;
  name: string;
  budget: number;
  spent: number;
}

interface SelectedOrganization {
  subOrgId: string;
  name: string;
  allocation: number;
}

const PO_NAME_MAX_LENGTH = 100;

export const CreatePO: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { showAlert } = useModal();

  const [poName, setPOName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', vendor: '', itemName: '', sku: '', quantity: 1, unitPrice: 0, link: '', notes: '', totalPrice: 0 }
  ]);
  
  const [subOrganizations, setSubOrganizations] = useState<SubOrganization[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<SelectedOrganization[]>([]);
  const [allocationMode, setAllocationMode] = useState<'equal' | 'manual'>('equal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubOrganizations = async () => {
      try {
        const orgs = await getSubOrganizations();
        setSubOrganizations(orgs);
      } catch (error) {
        console.error('Error fetching sub-organizations:', error);
      }
    };

    fetchSubOrganizations();
  }, []);

  useEffect(() => {
    const fetchPO = async () => {
      if (!isEditing || !id) return;

      try {
        const po = await getPOById(id);
        setPOName(po.name);
        setLineItems(po.lineItems);
        
      } else {
        await showAlert({
          title: 'Error',
          message: 'Purchase Order not found.',
          type: 'error'
        });
        navigate('/my-pos');
      }
    } catch (error) {
      console.error('Error fetching PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Failed to load Purchase Order.',
        type: 'error'
      });
      navigate('/my-pos');
    }
  };

  fetchPO();
}, [isEditing, id, navigate, showAlert]);

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(item => parseInt(item.id))) + 1).toString();
    const newItem: LineItem = {
      id: newId,
      vendor: '',
      itemName: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      link: '',
      notes: '',
      totalPrice: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addOrganization = () => {
    const availableOrgs = subOrganizations.filter(org => 
      !selectedOrganizations.some(selected => selected.subOrgId === org.id)
    );
    
    if (availableOrgs.length > 0) {
      const newOrg = availableOrgs[0];
      setSelectedOrganizations([...selectedOrganizations, {
        subOrgId: newOrg.id,
        name: newOrg.name,
        allocation: 0
      }]);
    }
  };

  const removeOrganization = (subOrgId: string) => {
    setSelectedOrganizations(selectedOrganizations.filter(org => org.subOrgId !== subOrgId));
  };

  const updateOrganization = (subOrgId: string, field: 'subOrgId' | 'allocation', value: string | number) => {
    setSelectedOrganizations(selectedOrganizations.map(org => {
      if (org.subOrgId === subOrgId) {
        if (field === 'subOrgId') {
          const newSubOrg = subOrganizations.find(sub => sub.id === value);
          return {
            ...org,
            subOrgId: value as string,
            name: newSubOrg?.name || ''
          };
        }
        return { ...org, [field]: value };
      }
      return org;
    }));
  };

  const getTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getAllocatedTotal = () => {
    return selectedOrganizations.reduce((sum, org) => sum + org.allocation, 0);
  };

  const updateAllocations = () => {
    if (selectedOrganizations.length === 0) return;

    const totalAmount = getTotalAmount();
    
    if (allocationMode === 'equal') {
      const equalAmount = totalAmount / selectedOrganizations.length;
      setSelectedOrganizations(selectedOrganizations.map(org => ({
        ...org,
        allocation: Math.round(equalAmount * 100) / 100
      })));
    }
  };

  const handlePONameChange = (value: string) => {
    // Limit to maximum length
    if (value.length <= PO_NAME_MAX_LENGTH) {
      setPOName(value);
    }
  };

  const validateForm = () => {
    if (!poName.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a PO name.',
        type: 'error'
      });
      return false;
    }

    const hasValidLineItems = lineItems.some(item => 
      item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
    );

    if (!hasValidLineItems) {
      showAlert({
        title: 'Validation Error',
        message: 'Please add at least one complete line item with vendor, item name, quantity, and unit price.',
        type: 'error'
      });
      return false;
    }

    if (selectedOrganizations.length === 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Please select at least one organization for budget allocation.',
        type: 'error'
      });
      return false;
    }

    const totalAmount = getTotalAmount();
    const allocatedAmount = getAllocatedTotal();
    
    if (Math.abs(totalAmount - allocatedAmount) > 0.01) {
      showAlert({
        title: 'Validation Error',
        message: `Budget allocation (${allocatedAmount.toFixed(2)}) must equal the total amount (${totalAmount.toFixed(2)}).`,
        type: 'error'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    try {
      const poData = {
        name: poName.trim(),
        lineItems: lineItems.filter(item => 
          item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
        ),
        organizationAllocations: selectedOrganizations,
        totalAmount: getTotalAmount(),
        createdBy: user.uid,
        status: 'pending_approval' as const
      };

      if (isEditing && id) {
        await updatePO(id, poData);
        await showAlert({
          title: 'Success',
          message: 'Purchase Order updated successfully!',
          type: 'success'
        });
      } else {
        await createPO(poData);
        await showAlert({
          title: 'Success',
          message: 'Purchase Order created successfully!',
          type: 'success'
        });
      }
      
      navigate('/my-pos');
    } catch (error) {
      console.error('Error saving PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Failed to save Purchase Order. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    updateAllocations();
  }, [lineItems, allocationMode, selectedOrganizations.length]);

  const totalAmount = getTotalAmount();
  const allocatedAmount = getAllocatedTotal();
  const isBalanced = Math.abs(totalAmount - allocatedAmount) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">
          {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h1>
      </div>

      <Card>
        <div className="space-y-6">
          {/* PO Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PO Name<span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={poName}
                onChange={(e) => handlePONameChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-2 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                placeholder="Enter PO name..."
                maxLength={PO_NAME_MAX_LENGTH}
              />
              <div className="absolute right-3 top-2 text-xs text-gray-400">
                {poName.length}/{PO_NAME_MAX_LENGTH}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-200">Line Items</h3>
              <Button onClick={addLineItem} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Item #{index + 1}</span>
                    {lineItems.length > 1 && (
                      <Button
                        onClick={() => removeLineItem(item.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Vendor<span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={item.vendor}
                        onChange={(e) => updateLineItem(item.id, 'vendor', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="Vendor name"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Item Name<span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateLineItem(item.id, 'itemName', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">SKU</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="Product SKU"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Quantity<span className="text-red-400">*</span></label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mt-3">
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Unit Price<span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice === 0 ? '' : item.unitPrice.toString()}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string, numbers, and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            updateLineItem(item.id, 'unitPrice', value === '' ? 0 : parseFloat(value) || 0);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Link (Optional)</label>
                      <input
                        type="url"
                        value={item.link}
                        onChange={(e) => updateLineItem(item.id, 'link', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="Product URL"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Notes (Optional)</label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateLineItem(item.id, 'notes', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="Additional notes"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Total</label>
                      <div className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-gray-300">
                        ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Allocation */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-200">Budget Allocation</h3>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setAllocationMode(allocationMode === 'equal' ? 'manual' : 'equal')}
                  variant="outline"
                  size="sm"
                >
                  {allocationMode === 'equal' ? 'Switch To Manual Split' : 'Switch To Equal Split'}
                </Button>
                <Button onClick={addOrganization} variant="outline" size="sm">
                  <Building className="w-4 h-4 mr-2" />
                  Add Organization
                </Button>
              </div>
            </div>

            {selectedOrganizations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No organizations selected for budget allocation</p>
                <p className="text-sm">Click "Add Organization" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrganizations.map((org) => (
                  <div key={org.subOrgId} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Organization</label>
                          <select
                            value={org.subOrgId}
                            onChange={(e) => updateOrganization(org.subOrgId, 'subOrgId', e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                          >
                            {subOrganizations
                              .filter(subOrg => 
                                subOrg.id === org.subOrgId || 
                                !selectedOrganizations.some(selected => selected.subOrgId === subOrg.id)
                              )
                              .map(subOrg => (
                                <option key={subOrg.id} value={subOrg.id}>
                                  {subOrg.name}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Allocation Amount</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={org.allocation}
                            onChange={(e) => updateOrganization(org.subOrgId, 'allocation', parseFloat(e.target.value) || 0)}
                            disabled={allocationMode === 'equal'}
                            className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400 disabled:opacity-50"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Available Budget</label>
                          <div className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-gray-300">
                            ${(subOrganizations.find(s => s.id === org.subOrgId)?.budget || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeOrganization(org.subOrgId)}
                        variant="outline"
                        size="sm"
                        className="ml-4 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Allocation Summary */}
            {selectedOrganizations.length > 0 && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Total Amount:</span>
                  <span className="text-gray-100 font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-300">Allocated Amount:</span>
                  <span className={`font-medium ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                    ${allocatedAmount.toFixed(2)}
                  </span>
                </div>
                {!isBalanced && (
                  <div className="flex items-center mt-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <span>
                      {allocatedAmount > totalAmount ? 'Over-allocated' : 'Under-allocated'} by $
                      {Math.abs(totalAmount - allocatedAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                {isBalanced && (
                  <div className="flex items-center mt-2 text-sm text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    <span>Budget allocation is balanced</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              onClick={() => navigate('/my-pos')}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isBalanced}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update PO' : 'Create PO')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};