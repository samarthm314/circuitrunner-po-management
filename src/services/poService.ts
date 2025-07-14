import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PurchaseOrder, LineItem } from '../types';

export const createPO = async (poData: {
  creatorId: string;
  creatorName: string;
  organizations: any[];
  subOrgId?: string; // Keep for backward compatibility
  subOrgName?: string; // Keep for backward compatibility
  specialRequest?: string;
  lineItems: LineItem[];
  totalAmount: number;
  overBudgetJustification?: string;
  status?: 'draft' | 'pending_approval';
}) => {
  try {
    const docRef = await addDoc(collection(db, 'purchaseOrders'), {
      ...poData,
      status: poData.status || 'pending_approval',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating PO:', error);
    throw error;
  }
};

export const updatePO = async (poId: string, updates: Partial<PurchaseOrder>) => {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, 'purchaseOrders', poId), updateData);
  } catch (error) {
    console.error('Error updating PO:', error);
    throw error;
  }
};

export const updatePOStatus = async (
  poId: string, 
  status: PurchaseOrder['status'], 
  adminComments?: string,
  purchaserComments?: string,
  userId?: string,
  userName?: string
) => {
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (adminComments) {
      updateData.adminComments = adminComments;
    }

    if (purchaserComments) {
      updateData.purchaserComments = purchaserComments;
    }

    if (status === 'approved' && userId && userName) {
      updateData.approvedAt = serverTimestamp();
      updateData.approvedById = userId;
      updateData.approvedByName = userName;
    } else if (status === 'purchased' && userId && userName) {
      updateData.purchasedAt = serverTimestamp();
      updateData.purchasedById = userId;
      updateData.purchasedByName = userName;
    }

    await updateDoc(doc(db, 'purchaseOrders', poId), updateData);
  } catch (error) {
    console.error('Error updating PO status:', error);
    throw error;
  }
};

export const deletePO = async (poId: string) => {
  try {
    await deleteDoc(doc(db, 'purchaseOrders', poId));
  } catch (error) {
    console.error('Error deleting PO:', error);
    throw error;
  }
};

export const getPOsByUser = async (userId: string) => {
  try {
    // First try the optimized query with composite index
    const q = query(
      collection(db, 'purchaseOrders'),
      where('creatorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.warn('Composite index not available, falling back to simple query:', error);
    
    try {
      // Fallback: Query without orderBy to avoid index requirement
      const fallbackQuery = query(
        collection(db, 'purchaseOrders'),
        where('creatorId', '==', userId)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const pos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      
      // Sort in memory by createdAt (descending)
      return pos.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
    } catch (fallbackError) {
      console.error('Error fetching user POs with fallback:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getPOsByStatus = async (status: PurchaseOrder['status']) => {
  try {
    // First try the optimized query with composite index
    const q = query(
      collection(db, 'purchaseOrders'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.warn('Composite index not available, falling back to simple query:', error);
    
    try {
      // Fallback: Query without orderBy to avoid index requirement
      const fallbackQuery = query(
        collection(db, 'purchaseOrders'),
        where('status', '==', status)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const pos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      
      // Sort in memory by createdAt (descending)
      return pos.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
    } catch (fallbackError) {
      console.error('Error fetching POs by status with fallback:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getAllPOs = async () => {
  try {
    const q = query(
      collection(db, 'purchaseOrders'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.error('Error fetching all POs:', error);
    throw error;
  }
};

export const getPOById = async (poId: string): Promise<PurchaseOrder | null> => {
  try {
    const docRef = doc(db, 'purchaseOrders', poId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as PurchaseOrder;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching PO by ID:', error);
    return null;
  }
};