import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PurchaseOrder } from '../types';

export const getDashboardStats = async () => {
  try {
    // Get all POs for statistics
    const allPOsSnapshot = await getDocs(collection(db, 'purchaseOrders'));
    const allPOs = allPOsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];

    // Calculate stats
    const totalPOs = allPOs.length;
    const pendingPOs = allPOs.filter(po => po.status === 'pending_approval').length;
    const approvedPOs = allPOs.filter(po => po.status === 'approved').length;
    const totalSpent = allPOs
      .filter(po => po.status === 'purchased')
      .reduce((sum, po) => sum + po.totalAmount, 0);

    return {
      totalPOs,
      pendingPOs,
      approvedPOs,
      totalSpent,
      allPOs: allPOs.slice(0, 5) // Recent 5 POs for activity
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default values if Firebase fails
    return {
      totalPOs: 0,
      pendingPOs: 0,
      approvedPOs: 0,
      totalSpent: 0,
      allPOs: []
    };
  }
};

export const getRecentActivity = async () => {
  try {
    // Try to get recent POs with fallback
    let recentPOs: PurchaseOrder[] = [];
    
    try {
      const q = query(
        collection(db, 'purchaseOrders'),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      recentPOs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
    } catch (indexError) {
      // Fallback: get all and sort in memory
      const allSnapshot = await getDocs(collection(db, 'purchaseOrders'));
      const allPOs = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      
      recentPOs = allPOs
        .sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
          const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5);
    }

    return recentPOs.map(po => ({
      id: po.id,
      action: getActivityAction(po),
      user: po.creatorName,
      time: getRelativeTime(po.updatedAt || po.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
};

const getActivityAction = (po: PurchaseOrder): string => {
  switch (po.status) {
    case 'pending_approval':
      return `PO #${po.id.slice(-6).toUpperCase()} submitted`;
    case 'approved':
      return `PO #${po.id.slice(-6).toUpperCase()} approved`;
    case 'declined':
      return `PO #${po.id.slice(-6).toUpperCase()} declined`;
    case 'purchased':
      return `PO #${po.id.slice(-6).toUpperCase()} purchased`;
    default:
      return `PO #${po.id.slice(-6).toUpperCase()} updated`;
  }
};

const getRelativeTime = (timestamp: any): string => {
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  const time = new Date(timestamp.seconds * 1000);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};