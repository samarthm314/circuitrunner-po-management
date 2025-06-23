import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Save, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LineItem, SubOrganization } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { createPO, updatePO, getPOById } from '../../services/poService';
import { getSubOrganizations } from '../../services/subOrgService';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const CreatePO: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [subOrganizations, setSubOrganizations] = useState<SubOrganization[]>([]);
  const [poName, setPOName] = useState('');
  const [selectedSubOrg, setSelectedSubOrg] = useState<string>('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [overBudgetJustification, setOverBudgetJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [originalPOStatus, setOriginalPOStatus] = useState<string | null>(null);
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

  useEffect(() => {
    // Check if we're editing an existing PO
    if (editId) {
      loadPOForEditing(editId);
    }
  }, [editId]);

  const loadPOForEditing = async (poId: string) => {
    try {
      setLoading(true);
      const po = await getPOById(poId);
      
      if (po && (po.status === 'draft' || po.status === 'declined')) {
        setIsEditing(true);
        setEditingPOId(poId);
        setOriginalPOStatus(po.status);
        setPOName(po.name || '');
        setSelectedSubOrg(po.subOrgId);
        setSpecialRequest(po.specialRequest || '');
        setOverBudgetJustification(po.overBudgetJustification || '');
        setLineItems(po.lineItems);
        
        // Set up price inputs for existing line items
        const newPriceInputs: { [key: string]: string } = {};
        po.lineItems.forEach(item => {
          newPriceInputs[item.id] = item.unitPrice > 0 ? item.unitPrice.toFixed(2) : '';
        });
        setPriceInputs(newPriceInputs);
      } else {
        alert('PO not found or cannot be edited');
        navigate('/my-pos');
      }
    } catch (error) {
      console.error('Error loading PO for editing:', error);
      alert('Error loading PO for editing');
      navigate('/my-pos');
    } finally {
      setLoading(false);
    }
  };

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

  const sortLineItemsByVendor = (items: LineItem[]): LineItem[] => {
    return [...items].sort((a, b) => {
      // Sort alphabetically by vendor name (case-insensitive)
      const vendorA = a.vendor.toLowerCase().trim();
      const vendorB = b.vendor.toLowerCase().trim();
      
      // Handle empty vendors - put them at the end
      if (!vendorA && !vendorB) return 0;
      if (!vendorA) return 1;
      if (!vendorB) return -1;
      
      return vendorA.localeCompare(vendorB);
    });
  };

  const validateForm = (isDraft: boolean = false) => {
    if (!poName.trim()) {
      alert('Please enter a name for this Purchase Order');
      return false;
    }

    if (!selectedOrg) {
      alert('Please select a sub-organization');
      return false;
    }

    if (!isDraft) {
      // For submission, require at least one valid line item
      const validLineItems = lineItems.filter(item => 
        item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (validLineItems.length === 0) {
        alert('Please add at least one valid line item');
        return false;
      }

      if (isOverBudget && !overBudgetJustification.trim()) {
        alert('Please provide justification for exceeding the budget');
        return false;
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!currentUser || !userProfile) return;

    if (!validateForm(true)) return;

    setLoading(true);

    try {
      const poData: any = {
        name: poName.trim(),
        creatorId: currentUser.uid,
        creatorName: userProfile.displayName,
        subOrgId: selectedSubOrg,
        subOrgName: selectedOrg!.name,
        lineItems: lineItems, // Don't filter or sort for drafts
        totalAmount,
        status: 'draft'
      };

      // Only add optional fields if they have values
      if (specialRequest.trim()) {
        poData.specialRequest = specialRequest.trim();
      }

      if (isOverBudget && overBudgetJustification.trim()) {
        poData.overBudgetJustification = overBudgetJustification.trim();
      }

      // Clear admin comments when saving as draft (especially for declined POs)
      if (originalPOStatus === 'declined') {
        poData.adminComments = null;
      }

      if (isEditing && editingPOId) {
        // Update existing draft
        await updatePO(editingPOId, poData);
        alert('Draft updated successfully!');
      } else {
        // Create new draft
        await createPO(poData);
        alert('Draft saved successfully!');
      }

      navigate('/my-pos');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userProfile || !selectedOrg) return;

    if (!validateForm(false)) return;

    setLoading(true);

    try {
      // Validate line items for submission
      const validLineItems = lineItems.filter(item => 
        item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      // Sort line items alphabetically by vendor before submitting
      const sortedLineItems = sortLineItemsByVendor(validLineItems);

      const poData: any = {
        name: poName.trim(),
        creatorId: currentUser.uid,
        creatorName: userProfile.displayName,
        subOrgId: selectedSubOrg,
        subOrgName: selectedOrg.name,
        lineItems: sortedLineItems, // Use sorted line items
        totalAmount,
        status: 'pending_approval'
      };

      // Only add optional fields if they have values
      if (specialRequest.trim()) {
        poData.specialRequest = specialRequest.trim();
      }

      if (isOverBudget && overBudgetJustification.trim()) {
        poData.overBudgetJustification = overBudgetJustification.trim();
      }

      // Clear admin comments when resubmitting (especially for declined POs)
      if (originalPOStatus === 'declined') {
        poData.adminComments = null;
      }

      if (isEditing && editingPOId) {
        // Update existing PO and submit
        await updatePO(editingPOId, poData);
        
        if (originalPOStatus === 'declined') {
          alert('Purchase Order updated and resubmitted successfully!\n\nYour PO has been sent back for admin review.\nLine items have been sorted alphabetically by vendor for easy review.');
        } else {
          alert('Purchase Order updated and submitted successfully!\n\nLine items have been sorted alphabetically by vendor for easy review.');
        }
      } else {
        // Create new PO
        await createPO(poData);
        alert('Purchase Order submitted successfully!\n\nLine items have been sorted alphabetically by vendor for easy review.');
      }

      navigate('/my-pos');
    } catch (error) {
      console.error('Error submitting PO:', error);
      alert('Error submitting Purchase Order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (!isEditing) return 'Create Purchase Order';
    if (originalPOStatus === 'declined') return 'Edit & Resubmit Purchase Order';
    return 'Edit Purchase Order';
  };

  const getBadgeInfo = () => {
    if (!isEditing) return null;
    if (originalPOStatus === 'declined') {
      return { variant: 'danger' as const, text: 'Resubmitting Declined PO' };
    }
    return { variant: 'warning' as const, text: 'Editing Draft' };
  };

  const getSubmitButtonText = () => {
    if (!isEditing) return 'Submit for Approval';
    if (originalPOStatus === 'declined') return 'Resubmit for Approval';
    return 'Update & Submit for Approval';
  };

  const getSubmitButtonIcon = () => {
    if (originalPOStatus === 'declined') return RefreshCw;
    return null;
  };

  if (loadingOrgs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const badgeInfo = getBadgeInfo();
  const SubmitIcon = getSubmitButtonIcon();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-100">
          {getPageTitle()}
        </h1>
        {badgeInfo && (
          <Badge variant={badgeInfo.variant} size="md">
            {badgeInfo.text}
          </Badge>
        )}
      </div>

      {/* Show decline notice for declined POs being edited */}
      {originalPOStatus === 'declined' && (
        <Card className="border-red-600 bg-red-900/30">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div>
              <h3 className="text-red-300 font-medium mb-2">This PO was previously declined</h3>
              <p className="text-red-200 text-sm mb-3">
                Please review the admin comments and make necessary changes before resubmitting.
                Once you resubmit, it will go back to the admin for review.
              </p>
              <div className="bg-red-800/50 border border-red-600 rounded p-3">
                <p className="text-red-200 text-sm font-medium">
                  💡 Tip: Address all concerns mentioned in the admin comments to improve approval chances.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PO Name and Sub-Organization */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Purchase Order Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={poName}
                onChange={(e) => setPOName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                placeholder="Enter a descriptive name for this PO (e.g., 'FTC Robot Parts Q1 2024', 'Marketing Materials Spring Campaign')"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Choose a clear, descriptive name that will help identify this PO later
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Sub-Organization <span className="text-red-400">*</span>
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
            <div>
              <CardTitle>Line Items</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Items will be sorted alphabetically by vendor when submitted
              </p>
            </div>
            <Button type="button" onClick={addLineItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="relative p-4 border border-gray-600 rounded-lg bg-gray-700">
                {/* Delete button positioned at bottom left */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(item.id)}
                  disabled={lineItems.length === 1}
                  className="absolute bottom-2 left-2 p-1 text-red-400 hover:text-red-300 z-10"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {/* Grid layout for form fields */}
                <div className="grid grid-cols-12 gap-4 pb-8">
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={item.vendor}
                      onChange={(e) => updateLineItem(item.id, 'vendor', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                      placeholder="Vendor name"
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
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-3">
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
                          className="px-4 py-1 bg-gray-600 border border-l-0 border-gray-500 rounded-r hover:bg-gray-500 flex items-center justify-center"
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-300" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total price display */}
                <div className="absolute bottom-2 right-4">
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
              {poName && (
                <p className="text-sm text-gray-400 mt-1">Name: {poName}</p>
              )}
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={loading}
            loading={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button type="submit" loading={loading}>
            {SubmitIcon && <SubmitIcon className="h-4 w-4 mr-2" />}
            {getSubmitButtonText()}
          </Button>
        </div>
      </form>
    </div>
  );
};