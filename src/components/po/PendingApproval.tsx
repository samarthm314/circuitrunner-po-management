import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExternalLink, Check, X, MessageSquare, Eye, Trash2 } from 'lucide-react';
import { getPOsByStatus, updatePOStatus, deletePO } from '../../services/poService';
import { PurchaseOrder } from '../../types';
import { format } from 'date-fns';
import { PODetailsModal } from './PODetailsModal';
import { useAuth } from '../../contexts/AuthContext';

export const PendingApproval: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingPOs();
  }, []);

  const fetchPendingPOs = async () => {
    try {
      const pendingPOs = await getPOsByStatus('pending_approval');
      setPOs(pendingPOs);
    } catch (error) {
      console.error('Error fetching pending POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (poId: string) => {
    if (!currentUser || !userProfile) return;

    setActionLoading(poId);
    try {
      await updatePOStatus(
        poId, 
        'approved', 
        comments[poId], 
        undefined, // purchaserComments
        currentUser.uid,
        userProfile.displayName
      );
      await fetchPendingPOs();
      setComments(prev => ({ ...prev, [poId]: '' }));
    } catch (error) {
      console.error('Error approving PO:', error);
      alert('Error approving PO. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (poId: string) => {
    if (!comments[poId]?.trim()) {
      alert('Please provide a reason for declining this PO');
      return;
    }

    setActionLoading(poId);
    try {
      await updatePOStatus(poId, 'declined', comments[poId]);
      await fetchPendingPOs();
      setComments(prev => ({ ...prev, [poId]: '' }));
    } catch (error) {
      console.error('Error declining PO:', error);
      alert('Error declining PO. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePO = async (poId: string, poName: string) => {
    if (!confirm(`Are you sure you want to delete "${poName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(poId);
    try {
      await deletePO(poId);
      await fetchPendingPOs(); // Refresh the list
      alert('Purchase Order deleted successfully');
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Error deleting Purchase Order. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const updateComment = (poId: string, comment: string) => {
    setComments(prev => ({ ...prev, [poId]: comment }));
  };

  const handleViewDetails = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPO(null);
  };

  const handlePOUpdated = () => {
    // Refresh the PO list when a PO is updated from the modal
    fetchPendingPOs();
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
      <h1 className="text-3xl font-bold text-gray-100">Pending Approval</h1>

      {pos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No purchase orders pending approval</p>
            <p className="text-gray-500 mt-2">All caught up!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {pos.map((po) => (
            <Card key={po.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">
                        {po.name || `PO #${po.id.slice(-6).toUpperCase()}`}
                      </h3>
                      <Badge variant="warning">Pending Approval</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-300">
                      <div>
                        <span className="font-medium text-gray-200">Submitted by:</span> {po.creatorName}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Sub-Organization:</span> {po.subOrgName}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Total Amount:</span> ${po.totalAmount.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Submitted:</span> {
                          po.createdAt ? format(new Date(po.createdAt.seconds * 1000), 'MMM dd, yyyy') : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(po)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleDeletePO(po.id, po.name || `PO #${po.id.slice(-6).toUpperCase()}`)}
                      loading={deleteLoading === po.id}
                      disabled={deleteLoading !== null || actionLoading !== null}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                {po.specialRequest && (
                  <div className="bg-blue-900/30 border border-blue-700 p-3 rounded-lg">
                    <span className="text-sm font-medium text-blue-300">Special Request:</span>
                    <p className="text-sm text-blue-200 mt-1">{po.specialRequest}</p>
                  </div>
                )}

                {po.overBudgetJustification && (
                  <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg">
                    <span className="text-sm font-medium text-yellow-300">Over Budget Justification:</span>
                    <p className="text-sm text-yellow-200 mt-1">{po.overBudgetJustification}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-200 mb-2">Line Items Summary:</h4>
                  <div className="space-y-2">
                    {po.lineItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-gray-700 p-3 rounded">
                        <div className="flex-1">
                          <div className="font-medium text-gray-100">{item.itemName}</div>
                          <div className="text-gray-400">
                            Vendor: {item.vendor}
                            {item.sku && ` • SKU: ${item.sku}`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-300">Qty: {item.quantity}</span>
                          <span className="text-gray-300">Unit: ${item.unitPrice.toFixed(2)}</span>
                          <span className="font-medium text-gray-100">Total: ${item.totalPrice.toFixed(2)}</span>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {po.lineItems.length > 3 && (
                      <div className="text-sm text-gray-400 text-center py-2">
                        +{po.lineItems.length - 3} more items (view details to see all)
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Comments (optional for approval, required for decline)
                      </label>
                      <textarea
                        value={comments[po.id] || ''}
                        onChange={(e) => updateComment(po.id, e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                        rows={2}
                        placeholder="Add comments for the submitter..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="danger"
                        onClick={() => handleDecline(po.id)}
                        loading={actionLoading === po.id}
                        disabled={actionLoading !== null || deleteLoading !== null}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        onClick={() => handleApprove(po.id)}
                        loading={actionLoading === po.id}
                        disabled={actionLoading !== null || deleteLoading !== null}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPO && (
        <PODetailsModal
          po={selectedPO}
          isOpen={isModalOpen}
          onClose={closeModal}
          onPOUpdated={handlePOUpdated}
        />
      )}
    </div>
  );
};