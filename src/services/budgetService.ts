import firestore from '@react-native-firebase/firestore';
import { logActivity } from './activityService';

export interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  limit: number; // monthly limit in cents; 0 = no limit
  createdAt: number;
  createdBy: string;
}

export interface Transaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  amount: number; // in cents
  note: string;
  addedBy: string;
  addedByName: string;
  date: number; // timestamp
  month: string; // YYYY-MM
}

function categoriesRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('budgetCategories');
}

function transactionsRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('transactions');
}

export function subscribeToCategories(
  familyId: string,
  onUpdate: (cats: BudgetCategory[]) => void,
) {
  return categoriesRef(familyId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      onUpdate(
        snap?.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<BudgetCategory, 'id'>),
        })),
      );
    });
}

export function subscribeToTransactions(
  familyId: string,
  month: string,
  onUpdate: (txns: Transaction[]) => void,
) {
  return transactionsRef(familyId)
    .where('month', '==', month)
    .onSnapshot(snap => {
      const txns = (snap?.docs ?? [])
        .map(d => ({id: d.id, ...(d.data() as Omit<Transaction, 'id'>)}))
        .sort((a, b) => b.date - a.date);
      onUpdate(txns);
    });
}

export async function addCategory(
  familyId: string,
  cat: Omit<BudgetCategory, 'id' | 'createdAt'>,
) {
  await categoriesRef(familyId).add({ ...cat, createdAt: Date.now() });
}

export async function deleteCategory(familyId: string, categoryId: string) {
  await categoriesRef(familyId).doc(categoryId).delete();
}

export async function updateCategoryLimit(
  familyId: string,
  categoryId: string,
  limit: number,
) {
  await categoriesRef(familyId).doc(categoryId).update({ limit });
}

export async function addTransaction(
  familyId: string,
  txn: Omit<Transaction, 'id'>,
) {
  await transactionsRef(familyId).add(txn);
  logActivity(familyId, 'transaction_added', txn.addedBy, txn.addedByName, {
    amount: (txn.amount / 100).toFixed(2),
    categoryName: txn.categoryName,
  });
}

export async function deleteTransaction(familyId: string, txnId: string) {
  await transactionsRef(familyId).doc(txnId).delete();
}

export async function updateBudgetCurrency(familyId: string, code: string) {
  await firestore().collection('families').doc(familyId).update({ currencyCode: code });
}

export function subscribeToBudgetCurrency(
  familyId: string,
  onUpdate: (code: string | null) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .onSnapshot(snap => {
      onUpdate((snap?.data()?.currencyCode as string | undefined) ?? null);
    });
}
