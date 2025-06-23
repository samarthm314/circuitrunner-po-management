import React from 'react';
import { X, ExternalLink, Calendar, User, Building, DollarSign } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { format } from 'date-fns';

interface PODetailsModalProps {
  po: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export const PODetailsModal: React.FC<PODetailsModalProps> = ({ po, isOpen, onClose }) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-100">
              PO #{po.id.slice(-6).toUpperCase()}
            </h2>
            {getStatusBadge(po.status)}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-400">Created by</p>
                <p className="font-medium text-gray-200">{po.creatorName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-400">Sub-Organization</p>
                <p className="font-medium text-gray-200">{po.subOrgName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="font-medium text-lg text-green-400">
                  ${po.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="font-medium text-gray-200">
                  {po.createdAt ? format(new Date(po.createdAt.seconds * 1000), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Special Request */}
          {po.specialRequest && (
            <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
              <h3 className="font-medium text-blue-300 mb-2">Special Request</h3>
              <p className="text-blue-200">{po.specialRequest}</p>
            </div>
          )}

          {/* Over Budget Justification */}
          {po.overBudgetJustification && (
            <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-300 mb-2">Over Budget Justification</h3>
              <p className="text-yellow-200">{po.overBudgetJustification}</p>
            </div>
          )}

          {/* Admin Comments */}
          {po.adminComments && (
            <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg">
              <h3 className="font-medium text-gray-200 mb-2">Admin Comments</h3>
              <p className="text-gray-300">{po.adminComments}</p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-700 rounded-lg">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-200">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-200">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-200">SKU</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-200">Qty</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-200">Unit Price</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-200">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-200">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems.map((item, index) => (
                    <tr key={index} className="border-t border-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-100">{item.itemName}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{item.vendor}</td>
                      <td className="py-3 px-4 text-gray-300">{item.sku || 'N/A'}</td>
                      <td className="py-3 px-4 text-center text-gray-300">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-300">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-400">${item.totalPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-700">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-right font-medium text-gray-200">
                      Total Amount:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-lg text-green-400">
                      ${po.totalAmount.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-sm text-gray-400">Created At</p>
              <p className="font-medium text-gray-200">
                {po.createdAt ? format(new Date(po.createdAt.seconds * 1000), 'MMM dd, yyyy HH:mm') : 'N/A'}
              </p>
            </div>
            {po.approvedAt && (
              <div>
                <p className="text-sm text-gray-400">Approved At</p>
                <p className="font-medium text-gray-200">
                  {format(new Date(po.approvedAt.seconds * 1000), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            )}
            {po.purchasedAt && (
              <div>
                <p className="text-sm text-gray-400">Purchased At</p>
                <p className="font-medium text-gray-200">
                  {format(new Date(po.purchasedAt.seconds * 1000), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};