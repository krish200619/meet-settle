import { nanoid } from "./utils";

export interface Member {
  id: string;
  name: string;
  upiId?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // member id
  splitAmong: string[]; // member ids
  createdAt: string;
}

export interface Settlement {
  from: string; // member id
  to: string; // member id
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
}

const STORAGE_KEY = "meetsplit_groups";

export function getGroups(): Group[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveGroups(groups: Group[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function getGroup(id: string): Group | undefined {
  return getGroups().find((g) => g.id === id);
}

export function createGroup(name: string): Group {
  const group: Group = {
    id: nanoid(),
    name,
    members: [],
    expenses: [],
    createdAt: new Date().toISOString(),
  };
  const groups = getGroups();
  groups.push(group);
  saveGroups(groups);
  return group;
}

export function updateGroup(group: Group) {
  const groups = getGroups().map((g) => (g.id === group.id ? group : g));
  saveGroups(groups);
}

export function deleteGroup(id: string) {
  saveGroups(getGroups().filter((g) => g.id !== id));
}

export function addMember(groupId: string, name: string, upiId?: string): Member {
  const group = getGroup(groupId)!;
  const member: Member = { id: nanoid(), name, upiId };
  group.members.push(member);
  updateGroup(group);
  return member;
}

export function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  splitAmong: string[]
): Expense {
  const group = getGroup(groupId)!;
  const expense: Expense = {
    id: nanoid(),
    description,
    amount,
    paidBy,
    splitAmong,
    createdAt: new Date().toISOString(),
  };
  group.expenses.push(expense);
  updateGroup(group);
  return expense;
}

export function deleteExpense(groupId: string, expenseId: string) {
  const group = getGroup(groupId)!;
  group.expenses = group.expenses.filter((e) => e.id !== expenseId);
  updateGroup(group);
}

export function computeBalances(group: Group): Map<string, number> {
  const balances = new Map<string, number>();
  group.members.forEach((m) => balances.set(m.id, 0));

  group.expenses.forEach((exp) => {
    const share = exp.amount / exp.splitAmong.length;
    balances.set(exp.paidBy, (balances.get(exp.paidBy) || 0) + exp.amount);
    exp.splitAmong.forEach((mid) => {
      balances.set(mid, (balances.get(mid) || 0) - share);
    });
  });

  return balances;
}

export function simplifyDebts(group: Group): Settlement[] {
  const balances = computeBalances(group);
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  balances.forEach((bal, id) => {
    if (bal < -0.01) debtors.push({ id, amount: -bal });
    else if (bal > 0.01) creditors.push({ id, amount: bal });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amount, creditors[j].amount);
    if (amt > 0.01) {
      settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(amt * 100) / 100 });
    }
    debtors[i].amount -= amt;
    creditors[j].amount -= amt;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

export function getUpiLink(upiId: string, name: string, amount: number): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
}
