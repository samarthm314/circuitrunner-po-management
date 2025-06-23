import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LineItem, SubOrganization } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { createPO } from '../../services/poService';
import { getSubOrganizations } from '../../services/subOrgService';
import { useNavigate } from 'react-router-dom';

export const CreatePO: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [subOrganizations, setSubOrganizations] = useState<SubOrganization[]>([]);
  const [selectedSubOrg, setSelectedSubOrg] = useState<string>('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [overBudgetJustification, setOverBudgetJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', vendor: '', itemName: '', sku: '', quantity: 1, unitPrice: 0, link: '', totalPrice: 0 }
  ]);
  // Track the raw input values for price fields
  const [priceInputs, setPriceInputs] = useState<{ [key: string]: string }>({
    '1': ''
  });

  useEffect(() => {
    const fetchSubOrganizations = async () => {
      try {
        const orgs = await getSubOrganizations();
        setSubOrganizations(orgs);
      } catch (error) {
        console.error('Error fetching sub-organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchSubOrganizations();
  }, []);

  const addLineItem = () => {
    const newId = Date.now().toString();
    const newItem: LineItem = {
      id: newId,
      vendor: '',
      itemName: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      link: '',
      totalPrice: 0
    };
    setLineItems([...lineItems, newItem]);
    setPriceInputs(prev => ({ ...prev, [newId]: '' }));
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
      setPriceInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[id];
        return newInputs;
      });
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
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

  const handlePriceChange = (id: string, value: string) => {
    // Store the raw input value
    setPriceInputs(prev => ({ ...prev, [id]: value }));
    
    // Clean the value for numeric conversion
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = cleanValue.split('.');
    let formattedValue = parts[0];
    if (parts.length > 1) {
      formattedValue += '.' + parts.slice(1).join('').substring(0, 2);
    }
    
    // Convert to number for storage
    const numericValue = parseFloat(formattedValue) || 0;
    updateLineItem(id, 'unitPrice', numericValue);
  };

  const handlePriceBlur = (id: string) => {
    // Format the price when the user leaves the field
    const item = lineItems.find(item => item.id === id);
    if (item && item.unitPrice > 0) {
      setPriceInputs(prev => ({ ...prev, [id]: item.unitPrice.toFixed(2) }));
    }
  };

  const handlePriceFocus = (id: string) => {
    // When focusing, show the raw numeric value without formatting
    const item = lineItems.find(item => item.id === id);
    if (item && item.unitPrice > 0) {
      setPriceInputs(prev => ({ ...prev, [id]: item.unitPrice.toString() }));
    }
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const selectedOrg = subOrganizations.find(org => org.id === selectedSubOrg);
  const remainingBudget = selectedOrg ? selectedOrg.budgetAllocated - selectedOrg.budgetSpent : 0;
  const isOverBudget = totalAmount > remainingBudget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userProfile || !selectedOrg) return;

    // Validate line items
    const validLineItems = lineItems.filter(item => 
      item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
    );

    if (validLineItems.length === 0) {
      alert('Please add at least one valid line item');
      return;
    }

    if (isOverBudget && !overBudgetJustification.trim()) {
      alert('Please provide justification for exceeding the budget');
      return;
    }

    setLoading(true);

    try {
      const poData: any = {
        creatorId: currentUser.uid,
        creatorName: userProfile.displayName,
        subOrgId: selectedSubOrg,
        subOrgName: selectedOrg.name,
        lineItems: validLineItems,
        totalAmount,
      };

      // Only add optional fields if they have values
      if (specialRequest.trim()) {
        poData.specialRequest = specialRequest.trim();
      }

      if (isOverBudget && overBudgetJustification.trim()) {
        poData.overBudgetJustification = overBudgetJustification.trim();
      }

      await createPO(poData);

      alert('Purchase Order submitted successfully!');
      navigate('/my-pos');
    } catch (error) {
      console.error('Error submitting PO:', error);
      alert('Error submitting Purchase Order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrgs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-100">Create Purchase Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sub-Organization Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Sub-Organization & Budget</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Sub-Organization
              </label>
              <select
                value={selectedSubOrg}
                onChange={(e) => setSelectedSubOrg(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100"
                required
              >
                <option value="" className="text-gray-300">Select a sub-organization</option>
                {subOrganizations.map(org => (
                  <option key={org.id} value={org.id} className="text-gray-100 bg-gray-700">{org.name}</option>
                ))}
              </select>
            </div>

            {selectedOrg && (
              <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-100">{selectedOrg.name} Budget</span>
                  <Badge variant={remainingBudget > 0 ? 'success' : 'danger'}>
                    ${remainingBudget.toLocaleString()} remaining
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min((selectedOrg.budgetSpent / selectedOrg.budgetAllocated) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-300">
                  ${selectedOrg.budgetSpent.toLocaleString()} of ${selectedOrg.budgetAllocated.toLocaleString()} allocated
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" onClick={addLineItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border border-gray-600 rounded-lg bg-gray-700">
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={item.vendor}
                    onChange={(e) => updateLineItem(item.id, 'vendor', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                    placeholder="Vendor name"
                    required
                  />
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => updateLineItem(item.id, 'itemName', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                    placeholder="Item description"
                    required
                  />
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={item.sku || ''}
                    onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                    placeholder="SKU/Part #"
                  />
                </div>
                <div className="col-span-6 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                    required
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Unit Price</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      value={priceInputs[item.id] || ''}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      onFocus={() => handlePriceFocus(item.id)}
                      onBlur={() => handlePriceBlur(item.id)}
                      className="w-full pl-6 pr-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="col-span-10 sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Link (Optional)</label>
                  <div className="flex">
                    <input
                      type="url"
                      value={item.link}
                      onChange={(e) => updateLineItem(item.id, 'link', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded-l focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                      placeholder="Product URL"
                    />
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-gray-600 border border-l-0 border-gray-500 rounded-r hover:bg-gray-500"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-300" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="col-span-12 text-right">
                  <span className="text-lg font-semibold text-gray-100">
                    Total: ${item.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Special Request */}
        <Card>
          <CardHeader>
            <CardTitle>Special Request</CardTitle>
          </CardHeader>
          <textarea
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
            rows={3}
            placeholder="Any special instructions or requests..."
          />
        </Card>

        {/* Over Budget Justification */}
        {isOverBudget && (
          <Card className="border-yellow-600 bg-yellow-900/30">
            <CardHeader>
              <CardTitle className="text-yellow-300">Over Budget Justification Required</CardTitle>
            </CardHeader>
            <div className="mb-4">
              <p className="text-sm text-yellow-200 mb-2">
                This PO exceeds the remaining budget by ${(totalAmount - remainingBudget).toFixed(2)}
              </p>
              <textarea
                value={overBudgetJustification}
                onChange={(e) => setOverBudgetJustification(e.target.value)}
                className="w-full px-3 py-2 bg-yellow-900/50 border border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-yellow-100 placeholder-yellow-300"
                rows={3}
                placeholder="Please provide justification for exceeding the budget..."
                required
              />
            </div>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">PO Summary</h3>
              <p className="text-sm text-gray-300">{lineItems.length} line items</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-100">${totalAmount.toFixed(2)}</p>
              {isOverBudget && (
                <Badge variant="warning" size="sm">Over Budget</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" disabled={loading}>
            Save as Draft
          </Button>
          <Button type="submit" loading={loading}>
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>
  );
};