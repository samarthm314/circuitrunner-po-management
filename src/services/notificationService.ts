import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
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
  userId?: string; // Add userId to track which user this notification is for
  roles: string[]; // Roles this notification applies to
}

// Key for storing last notification check time
const LAST_CHECK_KEY = 'notifications_last_check';

export const getNotificationsForUser = async (userRoles: string[], userId?: string): Promise<Notification[]> => {
  const notifications: Notification[] = [];
  
  try {
    // Get recent POs for status notifications
    const recentPOs = await getRecentPOs();
    
    // Get sub-organizations for budget alerts
    const subOrgs = await getSubOrganizations();
    
    // Get recent transactions
    const recentTransactions = await getRecentTransactions();

    // Get user's notification preferences (read status)
    const userNotificationPrefs = userId ? await getUserNotificationPrefs(userId) : {};

    // Generate role-based notifications for each role the user has
    userRoles.forEach(role => {
      switch (role) {
        case 'director':
          notifications.push(...generateDirectorNotifications(recentPOs, subOrgs, userNotificationPrefs));
          break;
        case 'admin':
          notifications.push(...generateAdminNotifications(recentPOs, subOrgs, recentTransactions, userNotificationPrefs));
          break;
        case 'purchaser':
          notifications.push(...generatePurchaserNotifications(recentPOs, recentTransactions, userNotificationPrefs));
          break;
      }
    });

    // Remove duplicates based on notification ID
    const uniqueNotifications = notifications.filter((notification, index, self) =>
      index === self.findIndex(n => n.id === notification.id)
    );

    // Sort by priority and timestamp
    return uniqueNotifications.sort((a, b) => {
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

const getUserNotificationPrefs = async (userId: string): Promise<{ [key: string]: boolean }> => {
  try {
    const docRef = doc(db, 'userNotificationPrefs', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().readNotifications || {};
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching user notification preferences:', error);
    return {};
  }
};

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'userNotificationPrefs', userId);
    const docSnap = await getDoc(docRef);
    
    let currentPrefs = {};
    if (docSnap.exists()) {
      currentPrefs = docSnap.data().readNotifications || {};
    }
    
    const updatedPrefs = {
      ...currentPrefs,
      [notificationId]: true
    };
    
    await setDoc(docRef, {
      readNotifications: updatedPrefs,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (userId: string, notificationIds: string[]): Promise<void> => {
  try {
    const docRef = doc(db, 'userNotificationPrefs', userId);
    const docSnap = await getDoc(docRef);
    
    let currentPrefs = {};
    if (docSnap.exists()) {
      currentPrefs = docSnap.data().readNotifications || {};
    }
    
    const updatedPrefs = { ...currentPrefs };
    notificationIds.forEach(id => {
      updatedPrefs[id] = true;
    });
    
    await setDoc(docRef, {
      readNotifications: updatedPrefs,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
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

const generateDirectorNotifications = (pos: PurchaseOrder[], subOrgs: SubOrganization[], userPrefs: { [key: string]: boolean }): Notification[] => {
  const notifications: Notification[] = [];
  
  // Only show notifications for very recent PO updates (last 2 hours)
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  
  const recentPOUpdates = pos.filter(po => {
    if (po.status !== 'approved' && po.status !== 'declined' && po.status !== 'purchased') return false;
    const timestamp = po.updatedAt ? new Date(po.updatedAt.seconds * 1000) : new Date(0);
    return timestamp.getTime() > twoHoursAgo;
  }).slice(0, 3);

  recentPOUpdates.forEach(po => {
    const timestamp = po.updatedAt ? new Date(po.updatedAt.seconds * 1000) : new Date();
    const notificationId = `po-${po.id}-${po.status}`;
    
    notifications.push({
      id: notificationId,
      type: 'po_status',
      title: `PO ${po.status.charAt(0).toUpperCase() + po.status.slice(1)}`,
      message: `PO #${po.id.slice(-6).toUpperCase()} has been ${po.status}`,
      timestamp,
      isRead: userPrefs[notificationId] || false,
      priority: po.status === 'declined' ? 'high' : 'medium',
      actionUrl: '/my-pos',
      icon: po.status === 'approved' ? 'CheckCircle' : po.status === 'declined' ? 'XCircle' : 'ShoppingCart',
      roles: ['director']
    });
  });

  // Only show critical budget alerts (over 95% or over budget)
  const criticalBudgetAlerts = generateCriticalBudgetAlerts(subOrgs, userPrefs);
  notifications.push(...criticalBudgetAlerts);

  return notifications;
};

const generateAdminNotifications = (pos: PurchaseOrder[], subOrgs: SubOrganization[], transactions: Transaction[], userPrefs: { [key: string]: boolean }): Notification[] => {
  const notifications: Notification[] = [];
  
  // Pending approval notifications - only if there are actually pending POs
  const pendingPOs = pos.filter(po => po.status === 'pending_approval');
  if (pendingPOs.length > 0) {
    const notificationId = 'pending-approval';
    notifications.push({
      id: notificationId,
      type: 'po_status',
      title: 'POs Pending Approval',
      message: `${pendingPOs.length} purchase order${pendingPOs.length > 1 ? 's' : ''} awaiting your approval`,
      timestamp: new Date(),
      isRead: userPrefs[notificationId] || false,
      priority: 'high',
      actionUrl: '/pending-approval',
      icon: 'Clock',
      roles: ['admin']
    });
  }

  // Only show critical budget alerts
  const criticalBudgetAlerts = generateCriticalBudgetAlerts(subOrgs, userPrefs);
  notifications.push(...criticalBudgetAlerts);

  // Recent transaction uploads (only last 4 hours)
  const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
  const recentTransactionUploads = transactions.filter(t => {
    const uploadTime = t.createdAt.getTime();
    return uploadTime > fourHoursAgo;
  });

  if (recentTransactionUploads.length > 0) {
    const notificationId = 'recent-transactions';
    notifications.push({
      id: notificationId,
      type: 'transaction',
      title: 'New Transactions Uploaded',
      message: `${recentTransactionUploads.length} new transaction${recentTransactionUploads.length > 1 ? 's' : ''} uploaded`,
      timestamp: new Date(),
      isRead: userPrefs[notificationId] || false,
      priority: 'medium',
      actionUrl: '/transactions',
      icon: 'Upload',
      roles: ['admin']
    });
  }

  return notifications;
};

const generatePurchaserNotifications = (pos: PurchaseOrder[], transactions: Transaction[], userPrefs: { [key: string]: boolean }): Notification[] => {
  const notifications: Notification[] = [];
  
  // Approved POs ready for purchase
  const readyForPurchase = pos.filter(po => po.status === 'approved' || po.status === 'pending_purchase');
  if (readyForPurchase.length > 0) {
    const totalValue = readyForPurchase.reduce((sum, po) => sum + po.totalAmount, 0);
    const notificationId = 'ready-for-purchase';
    notifications.push({
      id: notificationId,
      type: 'po_status',
      title: 'POs Ready for Purchase',
      message: `${readyForPurchase.length} PO${readyForPurchase.length > 1 ? 's' : ''} ready for purchase (Total: $${totalValue.toLocaleString()})`,
      timestamp: new Date(),
      isRead: userPrefs[notificationId] || false,
      priority: readyForPurchase.length > 5 ? 'high' : 'medium',
      actionUrl: '/pending-purchase',
      icon: 'ShoppingCart',
      roles: ['purchaser']
    });
  }

  // Recently purchased POs that need receipts (only last 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentlyPurchased = pos.filter(po => {
    if (po.status !== 'purchased' || !po.purchasedAt) return false;
    const purchaseTime = po.purchasedAt.seconds * 1000;
    return purchaseTime > oneDayAgo;
  });

  if (recentlyPurchased.length > 0) {
    const notificationId = 'recent-purchases';
    notifications.push({
      id: notificationId,
      type: 'po_status',
      title: 'Upload Receipts',
      message: `${recentlyPurchased.length} recently purchased PO${recentlyPurchased.length > 1 ? 's' : ''} - upload receipts`,
      timestamp: new Date(),
      isRead: userPrefs[notificationId] || false,
      priority: 'medium',
      actionUrl: '/transactions',
      icon: 'Receipt',
      roles: ['purchaser']
    });
  }

  return notifications;
};

const generateCriticalBudgetAlerts = (subOrgs: SubOrganization[], userPrefs: { [key: string]: boolean }): Notification[] => {
  const notifications: Notification[] = [];
  
  subOrgs.forEach(org => {
    const utilization = org.budgetAllocated > 0 ? (org.budgetSpent / org.budgetAllocated) * 100 : 0;
    
    if (utilization > 100) {
      const notificationId = `budget-over-${org.id}`;
      notifications.push({
        id: notificationId,
        type: 'budget_alert',
        title: 'Budget Exceeded',
        message: `${org.name} is over budget by $${(org.budgetSpent - org.budgetAllocated).toLocaleString()}`,
        timestamp: new Date(),
        isRead: userPrefs[notificationId] || false,
        priority: 'high',
        actionUrl: '/budget-management',
        icon: 'AlertTriangle',
        roles: ['admin', 'director']
      });
    } else if (utilization > 95) {
      const notificationId = `budget-critical-${org.id}`;
      notifications.push({
        id: notificationId,
        type: 'budget_alert',
        title: 'Budget Critical',
        message: `${org.name} has used ${utilization.toFixed(0)}% of budget`,
        timestamp: new Date(),
        isRead: userPrefs[notificationId] || false,
        priority: 'high',
        actionUrl: '/budget-management',
        icon: 'AlertTriangle',
        roles: ['admin', 'director']
      });
    }
  });

  return notifications;
};

export const getNotificationCount = async (userRoles: string[], userId?: string): Promise<number> => {
  const notifications = await getNotificationsForUser(userRoles, userId);
  return notifications.filter(n => !n.isRead).length;
};