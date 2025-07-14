export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'director' | 'admin' | 'purchaser' | 'guest';
  roles?: ('director' | 'admin' | 'purchaser')[]; // New field for multiple roles
  createdAt: Date;
}

export interface SubOrganization {
  id: string;
  name: string;
  budgetAllocated: number;
  budgetSpent: number;
}

export interface LineItem {
  id: string;
  vendor: string;
  itemName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  link?: string;
  notes?: string; // Added optional notes field
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  name: string; // Added PO name field
  creatorId: string;
  creatorName: string;
  subOrgId?: string; // Keep for backward compatibility
  subOrgName?: string; // Keep for backward compatibility
  organizations: POOrganization[]; // New field for multiple organizations
  status: 'draft' | 'pending_approval' | 'approved' | 'declined' | 'pending_purchase' | 'purchased';
  specialRequest?: string;
  lineItems: LineItem[];
  totalAmount: number;
  organizationAllocations?: POAllocation[]; // Budget allocation across organizations
  adminComments?: string;
  purchaserComments?: string; // Added purchaser comments field
  overBudgetJustification?: string;
  // Approval tracking
  approvedById?: string;
  approvedByName?: string;
  // Purchase tracking
  purchasedById?: string;
  purchasedByName?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  purchasedAt?: Date;
  receiptUrl?: string;
}

export interface POOrganization {
  id: string;
  subOrgId: string;
  subOrgName: string;
  allocatedAmount: number;
  percentage: number;
}

export interface POAllocation {
  subOrgId: string;
  subOrgName: string;
  allocatedAmount: number;
  percentage: number;
}
export interface Transaction {
  id: string;
  postDate: Date;
  description: string;
  debitAmount: number;
  status: string;
  subOrgId?: string; // Keep for backward compatibility
  subOrgName?: string; // Keep for backward compatibility
  allocations?: TransactionAllocation[]; // New field for split allocations
  receiptUrl?: string;
  receiptFileName?: string;
  notes?: string;
  linkedPOId?: string; // Added linked PO ID field
  linkedPOName?: string; // Added linked PO name field
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionAllocation {
  id: string;
  subOrgId: string;
  subOrgName: string;
  amount: number;
  percentage: number; // Calculated percentage of total transaction
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userEmail: string;
  timestamp: Date;
  details: string;
}