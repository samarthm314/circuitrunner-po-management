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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Transaction } from '../types';
import { updateSubOrgBudget, getSubOrganizations } from './subOrgService';

export const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...transactionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
  try {
    // Filter out undefined values to prevent Firestore errors
    const cleanUpdates: any = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    cleanUpdates.updatedAt = serverTimestamp();

    await updateDoc(doc(db, 'transactions', transactionId), cleanUpdates);
    
    // After updating transaction, recalculate budgets
    await recalculateAllBudgets();
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId: string) => {
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
    
    // After deleting transaction, recalculate budgets
    await recalculateAllBudgets();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions'),
      orderBy('postDate', 'desc')
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
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransactionsBySubOrg = async (subOrgId: string): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('subOrgId', '==', subOrgId),
      orderBy('postDate', 'desc')
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
    console.error('Error fetching transactions by sub-org:', error);
    throw error;
  }
};

export const checkTransactionExists = async (description: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('description', '==', description)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking transaction existence:', error);
    return false;
  }
};

export const uploadReceiptFile = async (file: File, transactionId: string): Promise<string> => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `receipts/${transactionId}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};

export const deleteReceiptFile = async (receiptUrl: string): Promise<void> => {
  try {
    const storageRef = ref(storage, receiptUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting receipt:', error);
    throw error;
  }
};

export const processExcelData = async (data: any[]): Promise<{ processed: number; skipped: number; errors: string[] }> => {
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // Check required fields
      if (!row.status || row.status.toLowerCase() !== 'posted') {
        skipped++;
        continue;
      }

      if (!row.debit || parseFloat(row.debit) <= 0) {
        skipped++;
        continue;
      }

      if (!row.description || !row.description.trim()) {
        skipped++;
        continue;
      }

      // Check if transaction already exists
      const exists = await checkTransactionExists(row.description.trim());
      if (exists) {
        skipped++;
        continue;
      }

      // Create transaction
      await createTransaction({
        postDate: new Date(row.postDate || row['post date'] || Date.now()),
        description: row.description.trim(),
        debitAmount: parseFloat(row.debit),
        status: row.status,
      });

      processed++;
    } catch (error) {
      errors.push(`Error processing row with description "${row.description}": ${error}`);
    }
  }

  // After processing all transactions, recalculate budgets
  if (processed > 0) {
    await recalculateAllBudgets();
  }

  return { processed, skipped, errors };
};

// New function to recalculate all budget spent amounts
export const recalculateAllBudgets = async () => {
  try {
    console.log('Starting budget recalculation...');
    
    // Get all transactions and sub-organizations
    const [allTransactions, allSubOrgs] = await Promise.all([
      getAllTransactions(),
      getSubOrganizations()
    ]);

    // Calculate spent amounts for each sub-org
    const spentBySubOrg: { [key: string]: number } = {};
    
    allTransactions.forEach(transaction => {
      if (transaction.subOrgId) {
        spentBySubOrg[transaction.subOrgId] = (spentBySubOrg[transaction.subOrgId] || 0) + transaction.debitAmount;
      }
    });

    console.log('Calculated spending by sub-org:', spentBySubOrg);

    // Update each sub-org's budget spent
    const updatePromises = allSubOrgs.map(async (subOrg) => {
      const newSpent = spentBySubOrg[subOrg.id] || 0;
      console.log(`Updating ${subOrg.name}: spent ${newSpent} (was ${subOrg.budgetSpent})`);
      
      // Only update if the value has changed to avoid unnecessary writes
      if (Math.abs(newSpent - subOrg.budgetSpent) > 0.01) {
        await updateSubOrgBudget(subOrg.id, subOrg.budgetAllocated, newSpent);
      }
    });

    await Promise.all(updatePromises);
    console.log('Budget recalculation completed successfully');
    
  } catch (error) {
    console.error('Error recalculating budgets:', error);
    throw error;
  }
};