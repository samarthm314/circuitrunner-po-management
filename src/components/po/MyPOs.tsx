import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExternalLink, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPOsByUser, deletePO } from '../../services/poService';
import { PurchaseOrder } from '../../types';
import { format } from 'date-fns';
import { PODetailsModal } from './PODetailsModal';
import { useNavigate } from 'react-router-dom';

export const MyPOs: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPOs();
  }, [currentUser]);

  const fetchPOs = async () => {
    if (!currentUser) return;
    
    try {
      const userPOs = await getPOsByUser(currentUser.uid);
      setPOs(userPOs);
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = async (poId: string, poName: string) => {
    if (!confirm(`Are you sure you want to delete "${poName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(poId);
    try {
      await deletePO(poId);
      await fetchPOs(); // Refresh the list
      alert('Purchase Order deleted successfully');
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Error deleting Purchase Order. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditPO = (poId: string) => {
    navigate(`/create-po?edit=${poId}`);
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const variants = {
      draft: 'default',
      pending_approval: 'warning',
      approved: 'info',
      declined: 'danger',
      pending_purchase: 'info',
      purchased: 'success',
    } as const;

    const labels = {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      declined: 'Declined',
      pending_purchase: 'Pending Purchase',
      purchased: 'Purchased',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
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
    fetchPOs();
  };

  const canEditPO = (po: PurchaseOrder) => {
    return po.status === 'draft' || po.status === 'declined';
  };

  const getEditButtonText = (po: PurchaseOrder) => {
    if (po.status === 'draft') return 'Edit';
    if (po.status === 'declined') return 'Edit & Resubmit';
    return 'Edit';
  };

  const getEditButtonIcon = (po: PurchaseOrder) => {
    if (po.status === 'declined') return RefreshCw;
    return Edit;
  };

  // Group and sort POs by status
  const groupPOsByStatus = (pos: PurchaseOrder[]) => {
    const statusOrder = ['draft', 'pending_approval', 'approved', 'pending_purchase', 'declined', 'purchased'];
    const statusLabels = {
      draft: 'Drafts',
      pending_approval: 'Pending Approval',
      approved: 'Approved',
      pending_purchase: 'Pending Purchase',
      declined: 'Declined',
      purchased: 'Purchased',
    };

    const grouped: { [key: string]: PurchaseOrder[] } = {};
    
    // Group POs by status
    pos.forEach(po => {
      if (!grouped[po.status]) {
        grouped[po.status] = [];
      }
      grouped[po.status].push(po);
    });

    // Sort within each group by newest first
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    });

    // Return in the desired order
    return statusOrder
      .filter(status => grouped[status] && grouped[status].length > 0)
      .map(status => ({
        status,
        label: statusLabels[status as keyof typeof statusLabels],
        pos: grouped[status],
        count: grouped[status].length
      }));
  };

  const groupedPOs = groupPOsByStatus(pos);

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
        <h1 className="text-3xl font-bold text-gray-100">My Purchase Orders</h1>
        <Button onClick={() => navigate('/create-po')}>
          Create New PO
        </Button>
      </div>

      {pos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No purchase orders found</p>
            <p className="text-gray-500 mt-2">Create your first PO to get started</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedPOs.map(({ status, label, pos: statusPOs, count }) => (
            <div key={status} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-semibold text-gray-100">{label}</h2>
                  <Badge variant="info" size="md">
                    {count} PO{count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Sorted by newest first
                </div>
              </div>

              {/* POs in this category */}
              <div className="space-y-4">
                {statusPOs.map((po) => {
                  const EditIcon = getEditButtonIcon(po);
                  
                  return (
                    <Card key={po.id}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-100">
                              {po.name || `PO #${po.id.slice(-6).toUpperCase()}`}
                            </h3>
                            {getStatusBadge(po.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                            <div>
                              <span className="font-medium text-gray-200">Sub-Organization:</span> {po.subOrgName}
                            </div>
                            <div>
                              <span className="font-medium text-gray-200">Total Amount:</span> ${po.totalAmount.toFixed(2)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-200">
                                {po.status === 'draft' ? 'Last Updated:' : 'Created:'}
                              </span> {
                                po.updatedAt && po.status === 'draft' 
                                  ? format(new Date(po.updatedAt.seconds * 1000), 'MMM dd, yyyy')
                                  : po.createdAt 
                                    ? format(new Date(po.createdAt.seconds * 1000), 'MMM dd, yyyy') 
                                    : 'N/A'
                              }
                            </div>
                          </div>

                          {po.specialRequest && (
                            <div className="mt-3">
                              <span className="text-sm font-medium text-gray-200">Special Request:</span>
                              <p className="text-sm text-gray-300 mt-1">{po.specialRequest}</p>
                            </div>
                          )}

                          {/* Show admin comments only for approved POs */}
                          {po.status === 'approved' && po.adminComments && (
                            <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                              <span className="text-sm font-medium text-green-300">Admin Comments:</span>
                              <p className="text-sm text-green-200 mt-1">{po.adminComments}</p>
                            </div>
                          )}

                          {/* Show decline reason only for declined POs */}
                          {po.status === 'declined' && po.adminComments && (
                            <div className="mt-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                              <div>
                                <span className="text-sm font-medium text-red-300">Reason for Decline:</span>
                                <p className="text-sm text-red-200 mt-1">{po.adminComments}</p>
                                <p className="text-xs text-red-300 mt-2 italic">
                                  You can edit this PO to address the concerns and resubmit for approval.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-200 mb-2">Line Items:</h4>
                            <div className="space-y-2">
                              {po.lineItems.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded">
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-100">{item.itemName}</span>
                                    <span className="text-gray-400 ml-2">from {item.vendor}</span>
                                    {item.sku && (
                                      <span className="text-gray-400 ml-2">SKU: {item.sku}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-300">{item.quantity} × ${item.unitPrice.toFixed(2)}</span>
                                    <span className="font-medium text-gray-100">${item.totalPrice.toFixed(2)}</span>
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
                                <div className="text-sm text-gray-400 text-center py-1">
                                  +{po.lineItems.length - 3} more items
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(po)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {canEditPO(po) && (
                            <Button 
                              variant={po.status === 'declined' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleEditPO(po.id)}
                            >
                              <EditIcon className="h-4 w-4 mr-1" />
                              {getEditButtonText(po)}
                            </Button>
                          )}
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleDeletePO(po.id, po.name || `PO #${po.id.slice(-6).toUpperCase()}`)}
                            loading={deleteLoading === po.id}
                            disabled={deleteLoading !== null}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
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