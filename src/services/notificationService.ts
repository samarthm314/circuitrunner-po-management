import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PurchaseOrder, SubOrganization, Transaction } from '../types';

export interface Notification {
  id: string;
  type: 'po_status' | 'budget_alert' | 'system' | 'transaction';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  icon: string;
}

export const getNotificationsForUser = async (userRole: string): Promise<Notification[]> => {
  const notifications: Notification[] = [];
  
  try {
    // Get recent POs for status notifications
    const recentPOs = await getRecentPOs();
    
    // Get sub-organizations for budget alerts
    const subOrgs = await getSubOrganizations();
    
    // Get recent transactions
    const recentTransactions = await getRecentTransactions();

    // Generate role-based notifications
    switch (userRole) {
      case 'director':
        notifications.push(...generateDirectorNotifications(recentPOs, subOrgs));
        break;
      case 'admin':
        notifications.push(...generateAdminNotifications(recentPOs, subOrgs, recentTransactions));
        break;
      case 'purchaser':
        notifications.push(...generatePurchaserNotifications(recentPOs, recentTransactions));
        break;
    }

    // Sort by priority and timestamp
    return notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

const getRecentPOs = async (): Promise<PurchaseOrder[]> => {
  try {
    const q = query(
      collection(db, 'purchaseOrders'),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    // Fallback without orderBy if index doesn't exist
    const querySnapshot = await getDocs(collection(db, 'purchaseOrders'));
    const pos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    
    return pos
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, 20);
  }
};

const getSubOrganizations = async (): Promise<SubOrganization[]> => {
  const querySnapshot = await getDocs(collection(db, 'subOrganizations'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as SubOrganization[];
};

const getRecentTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      postDate: doc.data().postDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Transaction[];
  } catch (error) {
    return [];
  }
};

const generateDirectorNotifications = (pos: PurchaseOrder[], subOrgs: SubOrganization[]): Notification[] => {
  const notifications: Notification[] = [];
  
  // PO status updates for director's own POs
  const recentPOUpdates = pos.filter(po => 
    po.status === 'approved' || po.status === 'declined' || po.status === 'purchased'
  ).slice(0, 5);

  recentPOUpdates.forEach(po => {
    const timestamp = po.updatedAt ? new Date(po.updatedAt.seconds * 1000) : new Date();
    const isRecent = (Date.now() - timestamp.getTime()) < (24 * 60 * 60 * 1000); // 24 hours
    
    if (isRecent) {
      notifications.push({
        id: `po-${po.id}`,
        type: 'po_status',
        title: `PO ${po.status.charAt(0).toUpperCase() + po.status.slice(1)}`,
        message: `PO #${po.id.slice(-6).toUpperCase()} has been ${po.status}`,
        timestamp,
        isRead: false,
        priority: po.status === 'declined' ? 'high' : 'medium',
        actionUrl: '/my-pos',
        icon: po.status === 'approved' ? 'CheckCircle' : po.status === 'declined' ? 'XCircle' : 'ShoppingCart'
      });
    }
  });

  // Budget alerts
  const budgetAlerts = generateBudgetAlerts(subOrgs);
  notifications.push(...budgetAlerts);

  return notifications;
};

const generateAdminNotifications = (pos: PurchaseOrder[], subOrgs: SubOrganization[], transactions: Transaction[]): Notification[] => {
  const notifications: Notification[] = [];
  
  // Pending approval notifications
  const pendingPOs = pos.filter(po => po.status === 'pending_approval');
  if (pendingPOs.length > 0) {
    notifications.push({
      id: 'pending-approval',
      type: 'po_status',
      title: 'POs Pending Approval',
      message: `${pendingPOs.length} purchase order${pendingPOs.length > 1 ? 's' : ''} awaiting your approval`,
      timestamp: new Date(),
      isRead: false,
      priority: 'high',
      actionUrl: '/pending-approval',
      icon: 'Clock'
    });
  }

  // Budget alerts
  const budgetAlerts = generateBudgetAlerts(subOrgs);
  notifications.push(...budgetAlerts);

  // Recent transaction uploads
  const recentTransactionUploads = transactions.filter(t => {
    const uploadTime = t.createdAt.getTime();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return uploadTime > oneDayAgo;
  });

  if (recentTransactionUploads.length > 0) {
    notifications.push({
      id: 'recent-transactions',
      type: 'transaction',
      title: 'New Transactions Uploaded',
      message: `${recentTransactionUploads.length} new transaction${recentTransactionUploads.length > 1 ? 's' : ''} uploaded`,
      timestamp: new Date(),
      isRead: false,
      priority: 'medium',
      actionUrl: '/transactions',
      icon: 'Upload'
    });
  }

  return notifications;
};

const generatePurchaserNotifications = (pos: PurchaseOrder[], transactions: Transaction[]): Notification[] => {
  const notifications: Notification[] = [];
  
  // Approved POs ready for purchase
  const readyForPurchase = pos.filter(po => po.status === 'approved');
  if (readyForPurchase.length > 0) {
    const totalValue = readyForPurchase.reduce((sum, po) => sum + po.totalAmount, 0);
    notifications.push({
      id: 'ready-for-purchase',
      type: 'po_status',
      title: 'POs Ready for Purchase',
      message: `${readyForPurchase.length} PO${readyForPurchase.length > 1 ? 's' : ''} ready for purchase (Total: $${totalValue.toLocaleString()})`,
      timestamp: new Date(),
      isRead: false,
      priority: 'high',
      actionUrl: '/pending-purchase',
      icon: 'ShoppingCart'
    });
  }

  // Recently purchased POs
  const recentlyPurchased = pos.filter(po => {
    if (po.status !== 'purchased' || !po.purchasedAt) return false;
    const purchaseTime = po.purchasedAt.seconds * 1000;
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    return purchaseTime > threeDaysAgo;
  });

  recentlyPurchased.forEach(po => {
    notifications.push({
      id: `purchased-${po.id}`,
      type: 'po_status',
      title: 'PO Purchased',
      message: `PO #${po.id.slice(-6).toUpperCase()} completed - Don't forget to upload receipts`,
      timestamp: new Date(po.purchasedAt!.seconds * 1000),
      isRead: false,
      priority: 'medium',
      actionUrl: '/transactions',
      icon: 'Receipt'
    });
  });

  return notifications;
};

const generateBudgetAlerts = (subOrgs: SubOrganization[]): Notification[] => {
  const notifications: Notification[] = [];
  
  subOrgs.forEach(org => {
    const utilization = org.budgetAllocated > 0 ? (org.budgetSpent / org.budgetAllocated) * 100 : 0;
    
    if (utilization > 100) {
      notifications.push({
        id: `budget-over-${org.id}`,
        type: 'budget_alert',
        title: 'Budget Exceeded',
        message: `${org.name} is over budget by $${(org.budgetSpent - org.budgetAllocated).toLocaleString()}`,
        timestamp: new Date(),
        isRead: false,
        priority: 'high',
        actionUrl: '/budget-management',
        icon: 'AlertTriangle'
      });
    } else if (utilization > 90) {
      notifications.push({
        id: `budget-critical-${org.id}`,
        type: 'budget_alert',
        title: 'Budget Critical',
        message: `${org.name} has used ${utilization.toFixed(0)}% of budget`,
        timestamp: new Date(),
        isRead: false,
        priority: 'high',
        actionUrl: '/budget-management',
        icon: 'AlertTriangle'
      });
    } else if (utilization > 75) {
      notifications.push({
        id: `budget-warning-${org.id}`,
        type: 'budget_alert',
        title: 'Budget Warning',
        message: `${org.name} has used ${utilization.toFixed(0)}% of budget`,
        timestamp: new Date(),
        isRead: false,
        priority: 'medium',
        actionUrl: '/budget-management',
        icon: 'AlertCircle'
      });
    }
  });

  return notifications;
};

export const getNotificationCount = async (userRole: string): Promise<number> => {
  const notifications = await getNotificationsForUser(userRole);
  return notifications.filter(n => !n.isRead).length;
};