import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ExternalLink, Save, RefreshCw, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal, AlertModal } from '../ui/Modal';
import { LineItem, SubOrganization } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { createPO, updatePO, getPOById } from '../../services/poService';
import { getSubOrganizations } from '../../services/subOrgService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useModal } from '../../hooks/useModal';

export const CreatePO: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { confirmModal, alertModal, showConfirm, showAlert, closeConfirm, closeAlert, setConfirmLoading } = useModal();
  
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
  const [originalAdminComments, setOriginalAdminComments] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', vendor: '', itemName: '', sku: '', quantity: 1, unitPrice: 0, link: '', notes: '', totalPrice: 0 }
  ]);
  
  // Track the raw input values for price fields (in cents)
  const [priceInputs, setPriceInputs] = useState<{ [key: string]: string }>({
    '1': ''
  });

  // Refs for price inputs to control cursor position
  const priceInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
        setOriginalAdminComments(po.adminComments || null);
        setPOName(po.name || '');
        setSelectedSubOrg(po.subOrgId);
        setSpecialRequest(po.specialRequest || '');
        setOverBudgetJustification(po.overBudgetJustification || '');
        setLineItems(po.lineItems);
        
        // Set up price inputs for existing line items (convert to cents display)
        const newPriceInputs: { [key: string]: string } = {};
        po.lineItems.forEach(item => {
          if (item.unitPrice > 0) {
            // Convert dollars to cents for display
            const cents = Math.round(item.unitPrice * 100);
            newPriceInputs[item.id] = cents.toString();
          } else {
            newPriceInputs[item.id] = '';
          }
        });
        setPriceInputs(newPriceInputs);
      } else {
        await showAlert({
          title: 'Error',
          message: 'PO not found or cannot be edited',
          variant: 'error'
        });
        navigate('/my-pos');
      }
    } catch (error) {
      console.error('Error loading PO for editing:', error);
      await showAlert({
        title: 'Error',
        message: 'Error loading PO for editing',
        variant: 'error'
      });
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
      notes: '',
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
      // Clean up refs
      delete priceInputRefs.current[id];
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

  // Format cents as currency display
  const formatCentsAsCurrency = (cents: string): string => {
    if (!cents) return '$0.00';
    
    // Ensure we have at least 2 digits (pad with leading zeros)
    const paddedCents = cents.padStart(2, '0');
    
    // Split into dollars and cents
    const dollarsStr = paddedCents.slice(0, -2) || '0';
    const centsStr = paddedCents.slice(-2);
    
    // Format with commas for thousands
    const dollars = parseInt(dollarsStr).toLocaleString();
    
    return `$${dollars}.${centsStr}`;
  };

  const handlePriceChange = (id: string, value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/[^\d]/g, '');
    
    // Store the raw cents value
    setPriceInputs(prev => ({ ...prev, [id]: digitsOnly }));
    
    // Convert cents to dollars for storage
    const cents = parseInt(digitsOnly) || 0;
    const dollars = cents / 100;
    updateLineItem(id, 'unitPrice', dollars);
  };

  const handlePriceKeyDown = (id: string, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace') {
      const currentValue = priceInputs[id] || '';
      const newValue = currentValue.slice(0, -1);
      handlePriceChange(id, newValue);
      event.preventDefault();
    }
  };

  const handlePriceFocus = (id: string) => {
    const input = priceInputRefs.current[id];
    if (input) {
      // wait for the native focus to settle, then move caret to end
      setTimeout(() => {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }, 0);
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

  const validateForm = async (isDraft: boolean = false) => {
    if (!poName.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Please enter a name for this Purchase Order',
        variant: 'error'
      });
      return false;
    }

    if (!selectedOrg) {
      await showAlert({
        title: 'Validation Error',
        message: 'Please select a sub-organization',
        variant: 'error'
      });
      return false;
    }

    if (!isDraft) {
      // For submission, require at least one valid line item
      const validLineItems = lineItems.filter(item => 
        item.vendor.trim() && item.itemName.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (validLineItems.length === 0) {
        await showAlert({
          title: 'Validation Error',
          message: 'Please add at least one valid line item',
          variant: 'error'
        });
        return false;
      }

      if (isOverBudget && !overBudgetJustification.trim()) {
        await showAlert({
          title: 'Budget Justification Required',
          message: 'Please provide justification for exceeding the budget',
          variant: 'warning'
        });
        return false;
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!currentUser || !userProfile) return;

    if (!(await validateForm(true))) return;

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

      // Always include specialRequest field, even if empty (to clear it)
      poData.specialRequest = specialRequest.trim() || null;

      // Always include overBudgetJustification field, even if empty (to clear it)
      poData.overBudgetJustification = overBudgetJustification.trim() || null;

      // Clear admin comments when saving as draft (especially for declined POs)
      if (originalPOStatus === 'declined') {
        poData.adminComments = null;
      }

      if (isEditing && editingPOId) {
        // Update existing draft
        await updatePO(editingPOId, poData);
        await showAlert({
          title: 'Success',
          message: 'Draft updated successfully!',
          variant: 'success'
        });
      } else {
        // Create new draft
        await createPO(poData);
        await showAlert({
          title: 'Success',
          message: 'Draft saved successfully!',
          variant: 'success'
        });
      }

      navigate('/my-pos');
    } catch (error) {
      console.error('Error saving draft:', error);
      await showAlert({
        title: 'Error',
        message: 'Error saving draft. Please try again.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userProfile || !selectedOrg) return;

    if (!(await validateForm(false))) return;

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

      // Always include specialRequest field, even if empty (to clear it)
      poData.specialRequest = specialRequest.trim() || null;

      // Always include overBudgetJustification field, even if empty (to clear it)
      poData.overBudgetJustification = overBudgetJustification.trim() || null;

      // Clear admin comments when resubmitting (especially for declined POs)
      if (originalPOStatus === 'declined') {
        poData.adminComments = null;
      }

      if (isEditing && editingPOId) {
        // Update existing PO and submit
        await updatePO(editingPOId, poData);
        
        if (originalPOStatus === 'declined') {
          await showAlert({
            title: 'Success',
            message: 'Purchase Order updated and resubmitted successfully!\n\nYour PO has been sent back for admin review.\nLine items have been sorted alphabetically by vendor for easy review.',
            variant: 'success'
          });
        } else {
          await showAlert({
            title: 'Success',
            message: 'Purchase Order updated and submitted successfully!\n\nLine items have been sorted alphabetically by vendor for easy review.',
            variant: 'success'
          });
        }
      } else {
        // Create new PO
        await createPO(poData);
        await showAlert({
          title: 'Success',
          message: 'Purchase Order submitted successfully!\n\nLine items have been sorted alphabetically by vendor for easy review.',
          variant: 'success'
        });
      }

      navigate('/my-pos');
    } catch (error) {
      console.error('Error submitting PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Error submitting Purchase Order. Please try again.',
        variant: 'error'
      });
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">
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
            <div className="flex-1">
              <h3 className="text-red-300 font-medium mb-2">This PO was previously declined</h3>
              <p className="text-red-200 text-sm mb-3">
                Please review the admin comments below and make necessary changes before resubmitting.
                Once you resubmit, it will go back to the admin for review.
              </p>
              
              {/* Show the actual decline reason */}
              {originalAdminComments && (
                <div className="bg-red-800/50 border border-red-600 rounded p-4 mb-3">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-200 text-sm font-medium mb-1">Admin Comments (Reason for Decline):</p>
                      <p className="text-red-100 text-sm leading-relaxed">{originalAdminComments}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-red-800/50 border border-red-600 rounded p-3">
                <p className="text-red-200 text-sm font-medium">
                  💡 Tip: Address all concerns mentioned in the admin comments to improve approval chances.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* PO Name and Sub-Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Purchase Order Details</CardTitle>
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
                placeholder="Enter a descriptive name for this PO"
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Line Items</CardTitle>
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

                {/* Grid layout for form fields - responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 pb-8">
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
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Item Name<span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateLineItem(item.id, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                      placeholder="Item description"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1">SKU (Optional)</label>
                    <input
                      type="text"
                      value={item.sku || ''}
                      onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                      placeholder="SKU/Part #"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Qty<span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Unit Price<span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        ref={(el) => priceInputRefs.current[item.id] = el}
                        type="text"
                        value={formatCentsAsCurrency(priceInputs[item.id] || '')}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        onKeyDown={(e) => handlePriceKeyDown(item.id, e)}
                        onFocus={() => handlePriceFocus(item.id)}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                        placeholder="$0.00"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
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
                          className="px-3 py-1 bg-gray-600 border border-l-0 border-gray-500 rounded-r hover:bg-gray-500 flex items-center justify-center flex-shrink-0"
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-300" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes field - spans full width */}
                <div className="mb-8">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateLineItem(item.id, 'notes', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100 placeholder-gray-400"
                    placeholder="Additional notes or specifications..."
                  />
                </div>

                {/* Total price display */}
                <div className="absolute bottom-2 right-4">
                  <span className="text-base sm:text-lg font-semibold text-gray-100">
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
            <CardTitle className="text-base sm:text-lg">Special Request</CardTitle>
          </CardHeader>
          <textarea
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
            rows={3}
            placeholder="Any special instructions or requests..."
          />
          <p className="text-xs text-gray-400 mt-2">
            Leave blank if no special requests are needed. Clearing this field will remove any existing special request.
          </p>
        </Card>

        {/* Over Budget Justification */}
        {isOverBudget && (
          <Card className="border-yellow-600 bg-yellow-900/30">
            <CardHeader>
              <CardTitle className="text-yellow-300 text-base sm:text-lg">Over Budget Justification Required</CardTitle>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">PO Summary</h3>
              <p className="text-sm text-gray-300">{lineItems.length} line items</p>
              {poName && (
                <p className="text-sm text-gray-400 mt-1 truncate">Name: {poName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold text-gray-100">${totalAmount.toFixed(2)}</p>
              {isOverBudget && (
                <Badge variant="warning" size="sm">Over Budget</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={loading}
            loading={loading}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            {SubmitIcon && <SubmitIcon className="h-4 w-4 mr-2" />}
            {getSubmitButtonText()}
          </Button>
        </div>
      </form>

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