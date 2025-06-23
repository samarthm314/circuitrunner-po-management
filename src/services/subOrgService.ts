import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SubOrganization } from '../types';

// Complete list of CircuitRunners sub-organizations
const defaultSubOrganizations: Omit<SubOrganization, 'id'>[] = [
  { name: 'Outreach', budgetAllocated: 8000, budgetSpent: 0 },
  { name: 'Marketing', budgetAllocated: 6000, budgetSpent: 0 },
  { name: 'FTC 1002', budgetAllocated: 12000, budgetSpent: 0 },
  { name: 'FTC 11347', budgetAllocated: 10000, budgetSpent: 0 },
  { name: 'FRC', budgetAllocated: 15000, budgetSpent: 0 },
  { name: 'Operations', budgetAllocated: 9000, budgetSpent: 0 },
  { name: 'Fundraising', budgetAllocated: 4000, budgetSpent: 0 },
  { name: 'Miscellaneous', budgetAllocated: 3000, budgetSpent: 0 },
  { name: 'Equipment', budgetAllocated: 7500, budgetSpent: 0 },
  { name: 'Travel', budgetAllocated: 5000, budgetSpent: 0 },
  { name: 'Training', budgetAllocated: 2500, budgetSpent: 0 },
  { name: 'Community Events', budgetAllocated: 4500, budgetSpent: 0 }
];

export const getSubOrganizations = async (): Promise<SubOrganization[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'subOrganizations'));
    
    if (querySnapshot.empty) {
      // Initialize with default organizations if none exist
      console.log('No sub-organizations found, initializing with defaults...');
      await initializeSubOrganizations();
      return await getSubOrganizations(); // Recursive call after initialization
    }
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SubOrganization[];
  } catch (error) {
    console.error('Error fetching sub-organizations:', error);
    // Return default organizations with generated IDs as fallback
    return defaultSubOrganizations.map((org, index) => ({
      id: `default-${index}`,
      ...org
    }));
  }
};

export const initializeSubOrganizations = async () => {
  try {
    const batch = defaultSubOrganizations.map(async (org) => {
      await addDoc(collection(db, 'subOrganizations'), {
        ...org,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    await Promise.all(batch);
    console.log('Sub-organizations initialized successfully');
  } catch (error) {
    console.error('Error initializing sub-organizations:', error);
    throw error;
  }
};

export const updateSubOrgBudget = async (subOrgId: string, newBudget: number, newSpent?: number) => {
  try {
    const updateData: any = {
      budgetAllocated: newBudget,
      updatedAt: serverTimestamp()
    };

    if (newSpent !== undefined) {
      updateData.budgetSpent = newSpent;
    }

    await updateDoc(doc(db, 'subOrganizations', subOrgId), updateData);
  } catch (error) {
    console.error('Error updating sub-organization budget:', error);
    throw error;
  }
};

export const getSubOrgById = async (subOrgId: string): Promise<SubOrganization | null> => {
  try {
    const docRef = doc(db, 'subOrganizations', subOrgId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as SubOrganization;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching sub-organization:', error);
    return null;
  }
};