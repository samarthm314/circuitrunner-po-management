import { Transaction, POLink } from '../types';

/**
 * Migrates a transaction from legacy single PO linking to new multiple PO linking
 * This function ensures backward compatibility while enabling the new functionality
 */
export const migrateTransactionPOLinks = (transaction: Transaction): Transaction => {
  // If transaction already has poLinks, no migration needed
  if (transaction.poLinks && transaction.poLinks.length > 0) {
    return transaction;
  }

  // If transaction has legacy linkedPOId, migrate it
  if (transaction.linkedPOId) {
    const migratedLinks: POLink[] = [{
      id: `migrated-${transaction.linkedPOId}`,
      poId: transaction.linkedPOId,
      poName: transaction.linkedPOName || `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}`,
      amount: transaction.debitAmount,
      percentage: 100
    }];

    return {
      ...transaction,
      poLinks: migratedLinks
    };
  }

  // No PO links to migrate
  return transaction;
};

/**
 * Migrates an array of transactions
 */
export const migrateTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.map(migrateTransactionPOLinks);
};

/**
 * Checks if a transaction needs migration
 */
export const needsMigration = (transaction: Transaction): boolean => {
  return !transaction.poLinks && !!transaction.linkedPOId;
};

/**
 * Gets the display text for PO links in a transaction
 */
export const getPOLinksDisplayText = (transaction: Transaction): string => {
  if (transaction.poLinks && transaction.poLinks.length > 0) {
    return transaction.poLinks.map(link => `${link.poName}: $${link.amount.toFixed(2)}`).join('; ');
  }
  
  if (transaction.linkedPOId) {
    return `${transaction.linkedPOName || `PO #${transaction.linkedPOId.slice(-6).toUpperCase()}`}: $${transaction.debitAmount.toFixed(2)}`;
  }
  
  return 'None';
};

/**
 * Gets the count of PO links in a transaction
 */
export const getPOLinksCount = (transaction: Transaction): number => {
  if (transaction.poLinks && transaction.poLinks.length > 0) {
    return transaction.poLinks.length;
  }
  
  if (transaction.linkedPOId) {
    return 1;
  }
  
  return 0;
}; 