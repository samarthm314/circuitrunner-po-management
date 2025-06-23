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
  subOrgId: string;
  subOrgName: string;
  specialRequest?: string;
  lineItems: LineItem[];
  totalAmount: number;
  overBudgetJustification?: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, 'purchaseOrders'), {
      ...poData,
      status: 'pending_approval',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating PO:', error);
    throw error;
  }
};

export const updatePOStatus = async (
  poId: string, 
  status: PurchaseOrder['status'], 
  adminComments?: string
) => {
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (adminComments) {
      updateData.adminComments = adminComments;
    }

    if (status === 'approved') {
      updateData.approvedAt = serverTimestamp();
    } else if (status === 'purchased') {
      updateData.purchasedAt = serverTimestamp();
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