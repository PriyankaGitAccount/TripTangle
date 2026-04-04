'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRealtimeExpenses } from '@/hooks/use-realtime-expenses';
import type { Expense, ExpenseCategory, Member } from '@/types';

/* ─── Constants ─── */

const CATEGORIES: { id: ExpenseCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'flights',      label: 'Flights',       emoji: '✈️', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  { id: 'hotel',        label: 'Hotel',          emoji: '🏨', color: 'text-purple-700', bg: 'bg-purple-50' },
  { id: 'food',         label: 'Food',           emoji: '🍽️', color: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'local_travel', label: 'Local Travel',   emoji: '🚗', color: 'text-teal-700',   bg: 'bg-teal-50'   },
  { id: 'activity',     label: 'Activity',       emoji: '🎯', color: 'text-green-700',  bg: 'bg-green-50'  },
  { id: 'shopping',     label: 'Shopping',       emoji: '🛍️', color: 'text-pink-700',   bg: 'bg-pink-50'   },
];

const MEMBER_COLORS = ['#EA580C', '#DC2626', '#16A34A', '#D97706', '#9B59B6', '#0D9488', '#2980B9'];

function memberColor(idx: number) {
  return MEMBER_COLORS[idx % MEMBER_COLORS.length];
}

function fmt(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function catInfo(id: ExpenseCategory) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/* ─── Settlement algorithm ─── */

interface Transaction { from: string; to: string; amount: number }

function calculateSettlement(expenses: Expense[], members: Member[]) {
  const balances = new Map<string, number>(members.map((m) => [m.id, 0]));

  for (const exp of expenses) {
    const n = exp.split_among.length;
    if (n === 0) continue;
    const share = exp.amount / n;
    balances.set(exp.paid_by_member_id, (balances.get(exp.paid_by_member_id) ?? 0) + exp.amount);
    for (const mid of exp.split_among) {
      balances.set(mid, (balances.get(mid) ?? 0) - share);
    }
  }

  // Greedy debt simplification
  const creditors: { id: string; amt: number }[] = [];
  const debtors:   { id: string; amt: number }[] = [];
  for (const [id, bal] of balances) {
    if (bal >  0.005) creditors.push({ id, amt:  bal });
    if (bal < -0.005) debtors.push({   id, amt: -bal });
  }
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const transactions: Transaction[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const amt = Math.min(d.amt, c.amt);
    if (amt > 0.005) transactions.push({ from: d.id, to: c.id, amount: Math.round(amt * 100) / 100 });
    d.amt -= amt; c.amt -= amt;
    if (d.amt < 0.005) i++;
    if (c.amt < 0.005) j++;
  }

  return { balances, transactions };
}

/* ─── Add Expense Form ─── */

function AddExpenseForm({
  members,
  currentMemberId,
  onSave,
  onCancel,
}: {
  members: Member[];
  currentMemberId: string | null;
  onSave: (data: Omit<Expense, 'id' | 'trip_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(currentMemberId ?? members[0]?.id ?? '');
  const [splitAmong, setSplitAmong] = useState<string[]>(members.map((m) => m.id));
  const [saving, setSaving] = useState(false);

  function toggleSplit(id: string) {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !description.trim() || splitAmong.length === 0) return;
    setSaving(true);
    await onSave({ paid_by_member_id: paidBy, amount: parsed, description: description.trim(), category, split_among: splitAmong });
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-card shadow-lg p-5 space-y-4 border border-border/50">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Expense</p>

      {/* Amount + Description */}
      <div className="flex gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-28 rounded-xl bg-background shadow-sm pl-7 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-bright"
          />
        </div>
        <input
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          maxLength={200}
          className="flex-1 rounded-xl bg-background shadow-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-bright"
        />
      </div>

      {/* Category */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                category === cat.id
                  ? `${cat.bg} ${cat.color} shadow-md ring-1 ring-current/20`
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Paid by</p>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => setPaidBy(m.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                paidBy === m.id ? 'text-white shadow-md' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
              style={paidBy === m.id ? { backgroundColor: memberColor(idx) } : undefined}
            >
              {m.id === currentMemberId ? 'You' : m.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* Split among */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Split among ({splitAmong.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m, idx) => {
            const selected = splitAmong.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleSplit(m.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all border ${
                  selected ? 'text-white border-transparent shadow-md' : 'bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40'
                }`}
                style={selected ? { backgroundColor: memberColor(idx) } : undefined}
              >
                {selected ? '✓ ' : ''}{m.id === currentMemberId ? 'You' : m.display_name}
              </button>
            );
          })}
        </div>
        {splitAmong.length === 0 && (
          <p className="text-[10px] text-red-500 mt-1">Select at least one person</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0 || !description.trim() || splitAmong.length === 0}
          className="flex-1 rounded-xl bg-brand-bright py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-bright/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Expense'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl bg-muted/30 shadow-sm px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Expense Row ─── */

function ExpenseRow({
  expense,
  members,
  currentMemberId,
  onDelete,
}: {
  expense: Expense;
  members: Member[];
  currentMemberId: string | null;
  onDelete: (id: string) => void;
}) {
  const cat = catInfo(expense.category);
  const payer = members.find((m) => m.id === expense.paid_by_member_id);
  const payerName = expense.paid_by_member_id === currentMemberId ? 'You' : (payer?.display_name ?? 'Someone');
  const payerIdx = members.findIndex((m) => m.id === expense.paid_by_member_id);
  const splitNames = expense.split_among
    .map((id) => id === currentMemberId ? 'you' : (members.find((m) => m.id === id)?.display_name ?? '?'))
    .join(', ');
  const isOwner = expense.paid_by_member_id === currentMemberId;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card shadow-sm px-4 py-3 hover:shadow-md transition-all">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${cat.bg}`}>
        {cat.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{expense.description}</p>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium" style={{ color: memberColor(payerIdx) }}>{payerName}</span>
          {' paid · split with '}
          <span className="truncate">{splitNames}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-foreground">₹{fmt(expense.amount)}</p>
        <p className="text-[10px] text-muted-foreground">
          ₹{fmt(expense.amount / expense.split_among.length)} each
        </p>
      </div>
      {isOwner && (
        <button
          onClick={() => onDelete(expense.id)}
          className="shrink-0 rounded-lg bg-red-50 shadow-sm px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-colors ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ─── Main component ─── */

interface BudgetTrackerProps {
  tripId: string;
  currentMemberId: string | null;
  members: Member[];
  initialExpenses: Expense[];
  tripIsOver: boolean; // locked_dates_end has passed
}

export function BudgetTracker({
  tripId,
  currentMemberId,
  members,
  initialExpenses,
  tripIsOver,
}: BudgetTrackerProps) {
  const { expenses, setExpenses } = useRealtimeExpenses(tripId, initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | 'all'>('all');

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const { balances, transactions } = calculateSettlement(expenses, members);

  // Per-category totals
  const categoryTotals = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  }));

  const filtered = activeCategory === 'all'
    ? expenses
    : expenses.filter((e) => e.category === activeCategory);

  async function addExpense(data: Omit<Expense, 'id' | 'trip_id' | 'created_at'>) {
    const res = await fetch(`/api/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error('Failed to add expense'); return; }
    const { expense } = await res.json();
    setExpenses((prev) => [...prev, expense]);
    setShowForm(false);
    toast.success('Expense added');
  }

  async function deleteExpense(expenseId: string) {
    const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: currentMemberId }),
    });
    if (!res.ok) { toast.error('Failed to delete expense'); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    toast.success('Expense removed');
  }

  function getName(memberId: string) {
    if (memberId === currentMemberId) return 'You';
    return members.find((m) => m.id === memberId)?.display_name ?? 'Someone';
  }

  function getMemberIdx(memberId: string) {
    return members.findIndex((m) => m.id === memberId);
  }

  return (
    <div className="space-y-5">

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-brand-deep text-white p-4 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Total Spent</p>
          <p className="text-2xl font-black mt-1">₹{fmt(totalSpend)}</p>
          <p className="text-[11px] text-white/50 mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        {categoryTotals.filter((c) => c.total > 0).slice(0, 3).map((cat) => (
          <div key={cat.id} className={`rounded-2xl p-4 shadow-sm ${cat.bg}`}>
            <p className="text-lg">{cat.emoji}</p>
            <p className={`text-xs font-bold mt-1 ${cat.color}`}>{cat.label}</p>
            <p className={`text-base font-black ${cat.color}`}>₹{fmt(cat.total)}</p>
          </div>
        ))}
      </div>

      {/* ── Add expense button / form ── */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border-2 border-dashed border-border/50 py-4 text-sm font-semibold text-muted-foreground hover:border-brand-bright/50 hover:text-brand-bright hover:bg-brand-bright/5 transition-all"
        >
          + Add Expense
        </button>
      ) : (
        <AddExpenseForm
          members={members}
          currentMemberId={currentMemberId}
          onSave={addExpense}
          onCancel={() => setShowForm(false)}
        />
      )}

      {expenses.length > 0 && (
        <>
          {/* ── Category filter ── */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'bg-brand-bright text-white shadow-md'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              All ({expenses.length})
            </button>
            {CATEGORIES.filter((c) => expenses.some((e) => e.category === c.id)).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? `${cat.bg} ${cat.color} shadow-md`
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* ── Expense list ── */}
          <div className="space-y-2">
            {filtered.map((exp) => (
              <ExpenseRow
                key={exp.id}
                expense={exp}
                members={members}
                currentMemberId={currentMemberId}
                onDelete={deleteExpense}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No expenses in this category</p>
            )}
          </div>

          {/* ── Balances ── */}
          <div className="rounded-2xl overflow-hidden bg-card shadow-md">
            <div className="bg-gradient-to-r from-brand-deep to-brand-bright px-5 py-3">
              <h3 className="text-sm font-bold text-white">💰 Balances</h3>
              <p className="text-[10px] text-white/70 mt-0.5">
                {tripIsOver ? 'Final balances — trip is over' : 'Running tally so far'}
              </p>
            </div>
            <div className="p-4 space-y-2">
              {members.map((m, idx) => {
                const bal = balances.get(m.id) ?? 0;
                const isPositive = bal > 0.005;
                const isNegative = bal < -0.005;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: memberColor(idx) }}
                    >
                      {m.display_name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1">
                      {m.id === currentMemberId ? 'You' : m.display_name}
                    </span>
                    <span className={`text-sm font-bold ${
                      isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {isPositive ? '+' : ''}{fmt(bal)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isPositive ? 'bg-green-50 text-green-700' :
                      isNegative ? 'bg-red-50 text-red-600' :
                      'bg-muted/30 text-muted-foreground'
                    }`}>
                      {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Settle Up ── */}
          <div className="rounded-2xl overflow-hidden bg-card shadow-md">
            <div className={`px-5 py-3 ${tripIsOver
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
              <h3 className="text-sm font-bold text-white">
                {tripIsOver ? '✅ Settle Up' : '🧾 Estimated Settlements'}
              </h3>
              <p className="text-[10px] text-white/70 mt-0.5">
                {tripIsOver
                  ? 'Minimum transactions to clear all debts'
                  : 'Based on expenses added so far — will update as more are added'}
              </p>
            </div>
            <div className="p-4 space-y-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  🎉 Everyone is settled up!
                </p>
              ) : (
                transactions.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-3">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: memberColor(getMemberIdx(t.from)) }}
                    >
                      {getName(t.from)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground">{getName(t.from)}</span>
                      <span className="text-sm text-muted-foreground"> pays </span>
                      <span className="text-sm font-semibold text-foreground">{getName(t.to)}</span>
                    </div>
                    <span className="text-sm font-black text-brand-deep shrink-0">₹{fmt(t.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {expenses.length === 0 && !showForm && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">💸</div>
          <p className="text-sm font-semibold text-foreground">No expenses yet</p>
          <p className="text-xs text-muted-foreground">Add the first expense to start tracking</p>
        </div>
      )}
    </div>
  );
}
