import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmModal, AlertModal } from '../ui/Modal';
import { ExternalLink, ShoppingCart, Eye, Receipt, Trash2, MessageSquare } from 'lucide-react';
import { getPOsByStatus, updatePOStatus, deletePO } from '../../services/poService';
import { PurchaseOrder } from '../../types';
import { format } from 'date-fns';
import { PODetailsModal } from './PODetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../hooks/useModal';

export const PendingPurchase: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { confirmModal, alertModal, showConfirm, showAlert, closeConfirm, closeAlert, setConfirmLoading } = useModal();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [purchaserComment, setPurchaserComment] = useState('');

  useEffect(() => {
    fetchPendingPurchasePOs();
  }, []);

  const fetchPendingPurchasePOs = async () => {
    try {
      // Get both approved and pending_purchase POs
      const [approvedPOs, pendingPurchasePOs] = await Promise.all([
        getPOsByStatus('approved'),
        getPOsByStatus('pending_purchase')
      ]);
      
      // Combine and sort by updated date
      const allPOs = [...approvedPOs, ...pendingPurchasePOs].sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setPOs(allPOs);
    } catch (error) {
      console.error('Error fetching pending purchase POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPurchased = async (poId: string) => {
    setShowCommentModal(poId);
    setPurchaserComment('');
  };

  const confirmMarkAsPurchased = async (poId: string) => {
    if (!currentUser || !userProfile) return;

    setActionLoading(poId);
    try {
      await updatePOStatus(
        poId, 
        'purchased', 
        undefined, // adminComments
        purchaserComment.trim() || 'Marked as purchased by purchaser',
        currentUser.uid,
        userProfile.displayName
      );
      await fetchPendingPurchasePOs();
      setShowCommentModal(null);
      setPurchaserComment('');
    } catch (error) {
      console.error('Error marking PO as purchased:', error);
      await showAlert({
        title: 'Error',
        message: 'Error marking PO as purchased. Please try again.',
        variant: 'error'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const cancelMarkAsPurchased = () => {
    setShowCommentModal(null);
    setPurchaserComment('');
  };

  const handleDeletePO = async (poId: string, poName: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Purchase Order',
      message: `Are you sure you want to delete "${poName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) return;

    setConfirmLoading(true);
    try {
      await deletePO(poId);
      await fetchPendingPurchasePOs(); // Refresh the list
      await showAlert({
        title: 'Success',
        message: 'Purchase Order deleted successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting PO:', error);
      await showAlert({
        title: 'Error',
        message: 'Error deleting Purchase Order. Please try again.',
        variant: 'error'
      });
    } finally {
      setConfirmLoading(false);
    }
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
    fetchPendingPurchasePOs();
  };

  const getTotalValue = () => {
    return pos.reduce((sum, po) => sum + po.totalAmount, 0);
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    if (status === 'approved') {
      return <Badge variant="info">Ready for Purchase</Badge>;
    } else if (status === 'pending_purchase') {
      return <Badge variant="warning">In Progress</Badge>;
    }
    return <Badge variant="info">{status}</Badge>;
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
        <h1 className="text-3xl font-bold text-gray-100">Pending Purchase</h1>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-2xl font-bold text-green-400">${getTotalValue().toLocaleString()}</p>
          </div>
          <Badge variant="info" size="md">
            {pos.length} PO{pos.length !== 1 ? 's' : ''} Ready
          </Badge>
        </div>
      </div>

      {pos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No purchase orders ready for purchase</p>
            <p className="text-gray-500 mt-2">Approved POs will appear here</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {pos.map((po) => (
            <Card key={po.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-100">
                        {po.name || `PO #${po.id.slice(-6).toUpperCase()}`}
                      </h3>
                      {getStatusBadge(po.status)}
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
                        disabled={actionLoading !== null}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-300 mb-4">
                      <div>
                        <span className="font-medium text-gray-200">Submitted by:</span> {po.creatorName}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Sub-Organization:</span> {po.subOrgName}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Total Amount:</span> 
                        <span className="text-green-400 font-bold ml-1">${po.totalAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">
                          {po.status === 'approved' ? 'Approved:' : 'Last Updated:'}
                        </span> {
                          po.approvedAt ? format(new Date(po.approvedAt.seconds * 1000), 'MMM dd, yyyy') : 
                          po.updatedAt ? format(new Date(po.updatedAt.seconds * 1000), 'MMM dd, yyyy') : 'N/A'
                        }
                      </div>
                    </div>

                    {po.specialRequest && (
                      <div className="bg-blue-900/30 border border-blue-700 p-3 rounded-lg mb-4">
                        <span className="text-sm font-medium text-blue-300">Special Request:</span>
                        <p className="text-sm text-blue-200 mt-1">{po.specialRequest}</p>
                      </div>
                    )}

                    {po.adminComments && (
                      <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg mb-4">
                        <span className="text-sm font-medium text-gray-200">Admin Comments:</span>
                        <p className="text-sm text-gray-300 mt-1">{po.adminComments}</p>
                      </div>
                    )}

                    {po.purchaserComments && (
                      <div className="bg-green-900/30 border border-green-700 p-3 rounded-lg mb-4">
                        <span className="text-sm font-medium text-green-300">Purchaser Comments:</span>
                        <p className="text-sm text-green-200 mt-1">{po.purchaserComments}</p>
                      </div>
                    )}

                    {/* Status indicator for pending_purchase */}
                    {po.status === 'pending_purchase' && (
                      <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg mb-4">
                        <span className="text-sm font-medium text-yellow-300">🛒 Purchase In Progress:</span>
                        <p className="text-sm text-yellow-200 mt-1">
                          This PO is currently being worked on. Check the details to see purchase progress.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Summary */}
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">Purchase Summary</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-gray-400 mb-2">Items to Purchase ({po.lineItems.length})</h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {po.lineItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm bg-gray-600 p-2 rounded">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-100 truncate">{item.itemName}</div>
                              <div className="text-gray-400 text-xs">
                                {item.vendor} • Qty: {item.quantity}
                                {item.sku && ` • SKU: ${item.sku}`}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                              <span className="text-green-400 font-medium">${item.totalPrice.toFixed(2)}</span>
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
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-gray-400 mb-2">Purchase Actions</h5>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-300 mb-2">
                            {po.status === 'approved' 
                              ? 'Click "View Details" to start purchasing and track progress.'
                              : 'Purchase is in progress. View details to see current status.'
                            }
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            Receipt tracking will be handled in the Transactions page.
                          </p>
                          <Button
                            onClick={() => handleMarkAsPurchased(po.id)}
                            loading={actionLoading === po.id}
                            disabled={actionLoading !== null}
                            className="w-full"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Mark as Purchased
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Total: <span className="text-green-400 font-bold text-lg">${po.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Receipt className="h-4 w-4 mr-1" />
                      Download Summary
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-gray-100">
            <ShoppingCart className="h-5 w-5 text-green-500 mr-2" />
            Purchase Instructions
          </CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start space-x-2">
            <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
            <p>Review the approved purchase order details and line items</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
            <p>Click "View Details" and check off items as you purchase them (this will update the PO status to "Pending Purchase")</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
            <p>Use the provided vendor links to purchase items or find alternative sources</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
            <p>Mark the PO as "Purchased" when all items are complete and add any relevant comments</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
            <p>Upload receipts and track transactions in the Transactions page</p>
          </div>
        </div>
      </Card>

      {/* Purchaser Comment Modal */}
      {showCommentModal && createPortal(
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
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <MessageSquare className="h-5 w-5 text-green-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-100">Mark as Purchased</h3>
              </div>
              
              <p className="text-gray-300 mb-4">
                Add any comments about the purchase process, delivery details, or other relevant information:
              </p>
              
              <textarea
                value={purchaserComment}
                onChange={(e) => setPurchaserComment(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                rows={4}
                placeholder="e.g., All items purchased from Amazon, delivery expected by Friday, substituted part XYZ with compatible alternative..."
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={cancelMarkAsPurchased}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => confirmMarkAsPurchased(showCommentModal)}
                  loading={actionLoading === showCommentModal}
                  disabled={actionLoading !== null}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Mark as Purchased
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
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