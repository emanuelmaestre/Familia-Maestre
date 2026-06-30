'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type FinanceView = 'ALL' | 'PAYABLE' | 'RECEIVABLE' | 'SETTLED';
type PaymentMethod = 'PIX' | 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD';

interface Transaction {
  id: string;
  description: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  paymentMethod?: PaymentMethod;
  amount: string;
  type: 'EXPENSE' | 'INCOME';
  isPaid: boolean;
  dueDate?: string;
  paidAt?: string;
  category?: { name: string; color?: string };
  user: { name: string };
}

interface Summary {
  income: number;
  expense: number;
  balance: number;
  byCategory: Record<string, number>;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
};

const viewLabels: Record<FinanceView, string> = {
  ALL: 'Todos',
  PAYABLE: 'Débito',
  RECEIVABLE: 'Crédito',
  SETTLED: 'Liquidados',
};

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<FinanceView>('PAYABLE');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '', supplierName: '', tradeName: '', documentNumber: '',
    paymentMethod: '', amount: '', type: 'EXPENSE', categoryId: '',
    dueDate: '', isRecurring: false, recurringDay: '',
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['finance-summary', month, year],
    queryFn: () => api.get(`/finance/summary?month=${month}&year=${year}`).then((r) => r.data),
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', month, year],
    queryFn: () => api.get(`/finance/transactions?month=${month}&year=${year}`).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<{ id: string; name: string; type: string }[]>({
    queryKey: ['finance-categories'],
    queryFn: () => api.get('/finance/categories').then((r) => r.data),
  });

  const createTx = useMutation({
    mutationFn: (data: typeof form) => api.post('/finance/transactions', {
      ...data,
      paymentMethod: data.paymentMethod || undefined,
      amount: parseFloat(data.amount),
      recurringDay: data.recurringDay ? parseInt(data.recurringDay) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setShowForm(false);
      setForm({ description: '', supplierName: '', tradeName: '', documentNumber: '', paymentMethod: '', amount: '', type: 'EXPENSE', categoryId: '', dueDate: '', isRecurring: false, recurringDay: '' });
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/finance/transactions/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const totals = useMemo(() => transactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount);
      if (!tx.isPaid && tx.type === 'EXPENSE') acc.payable += amount;
      if (!tx.isPaid && tx.type === 'INCOME')  acc.receivable += amount;
      if (tx.isPaid  && tx.type === 'EXPENSE') acc.paid += amount;
      if (tx.isPaid  && tx.type === 'INCOME')  acc.received += amount;
      return acc;
    },
    { payable: 0, receivable: 0, paid: 0, received: 0 },
  ), [transactions]);

  const filteredTransactions = useMemo(() => {
    if (view === 'PAYABLE')    return transactions.filter((tx) => tx.type === 'EXPENSE' && !tx.isPaid);
    if (view === 'RECEIVABLE') return transactions.filter((tx) => tx.type === 'INCOME'  && !tx.isPaid);
    if (view === 'SETTLED')    return transactions.filter((tx) => tx.isPaid);
    return transactions;
  }, [transactions, view]);

  const chartData = Object.entries(summary?.byCategory ?? {}).map(([name, value]) => ({ name, value }));

  const summaryCards = [
    { label: 'Débito pendente',  value: totals.payable,                           icon: 'trending_down', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)'   },
    { label: 'Crédito pendente', value: totals.receivable,                         icon: 'trending_up',   color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.18)'  },
    { label: 'Saldo previsto',   value: totals.receivable - totals.payable,        icon: 'account_balance_wallet', color: '#0057D9', bg: 'rgba(0,87,217,0.08)', border: 'rgba(0,87,217,0.18)' },
  ];

  return (
    <div className="app-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fade-up">
        <div>
          <p className="section-badge mb-2">
            <span className="material-symbols-outlined text-[12px]">payments</span>
            Módulo Financeiro
          </p>
          <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Controle Financeiro
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input-control w-auto">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="input-control w-auto">
            {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up stagger-1">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <span className="material-symbols-outlined text-[22px]" style={{ color: card.color }}
                  >{card.icon}</span>
              </div>
              <span className="text-[11px] font-bold text-[#4c5e86] uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-[28px] font-bold" style={{ color: card.color, fontFamily: 'Plus Jakarta Sans' }}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="glass-card p-6 fade-up stagger-2">
          <h3 className="text-[15px] font-bold text-[#041a3f] mb-5" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Gastos por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(195,198,215,0.4)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4c5e86', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#737686', fontFamily: 'Plus Jakarta Sans' }} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(195,198,215,0.5)', borderRadius: '12px', fontFamily: 'Plus Jakarta Sans' }}
              />
              <Bar dataKey="value" fill="#0057D9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Filter tabs ────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1 fade-up stagger-3">
        {(Object.keys(viewLabels) as FinanceView[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 min-h-[44px] ${
              view === key
                ? 'bg-[#0057D9] text-white shadow-[0_4px_14px_rgba(0,87,217,0.3)]'
                : 'glass-card text-[#4c5e86] hover:text-[#041a3f]'
            }`}
          >
            {viewLabels[key]}
          </button>
        ))}
      </div>

      {/* ── Transactions table ─────────────────────────────────── */}
      <div className="glass-card fade-up stagger-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead style={{ borderBottom: '1px solid rgba(195,198,215,0.4)' }}>
              <tr>
                {['Descrição','Fornecedor','Pagamento','Categoria','Vencimento','Tipo','Status','Valor','Ações'].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#4c5e86] ${i === 8 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <tr key={tx.id} className="hover:bg-white/50 transition-colors" style={{ borderBottom: '1px solid rgba(195,198,215,0.2)' }}>
                    <td className="px-4 py-3.5 font-semibold text-[#191c1e]">{tx.description}</td>
                    <td className="px-4 py-3.5 text-[#4c5e86]">{tx.supplierName || tx.tradeName || '-'}</td>
                    <td className="px-4 py-3.5 text-[#4c5e86]">{tx.paymentMethod ? PAYMENT_METHOD_LABELS[tx.paymentMethod] : '-'}</td>
                    <td className="px-4 py-3.5 text-[#4c5e86]">{tx.category?.name ?? '-'}</td>
                    <td className="px-4 py-3.5 text-[#4c5e86]">{tx.dueDate ? formatDate(tx.dueDate) : '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`status-pill ${isIncome ? 'status-ok' : 'status-alert'}`}>
                        {isIncome ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`status-pill ${tx.isPaid ? 'status-info' : 'status-neutral'}`}>
                        {tx.isPaid ? (isIncome ? 'Recebido' : 'Pago') : 'Pendente'}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-bold text-[15px] ${isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        {!tx.isPaid && (
                          <button
                            type="button"
                            onClick={() => markPaid.mutate(tx.id)}
                            className="rounded-xl p-2.5 text-[#10B981] transition hover:bg-emerald-50"
                            title={isIncome ? 'Marcar como recebido' : 'Marcar como pago'}
                          >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-[#c3c6d7] block mb-3">receipt_long</span>
              <p className="text-[13px] font-medium text-[#737686]">
                Nenhum lançamento em {viewLabels[view].toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Form drawer ────────────────────────────────────────── */}
      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Novo Lançamento" icon="payments">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input placeholder="Descrição *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-control sm:col-span-2" />
          <input placeholder="Fornecedor" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="input-control" />
          <input placeholder="Nome Fantasia" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} className="input-control" />
          <input placeholder="CPF/CNPJ" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className="input-control" />
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-control">
            <option value="">Forma de pagamento</option>
            <option value="PIX">PIX</option>
            <option value="CASH">Dinheiro</option>
            <option value="DEBIT_CARD">Cartão de Débito</option>
            <option value="CREDIT_CARD">Cartão de Crédito</option>
          </select>
          <input type="number" placeholder="Valor (R$) *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-control" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-control">
            <option value="EXPENSE">Débito</option>
            <option value="INCOME">Crédito</option>
          </select>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-control">
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.type === form.type).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-control" />
          <label className="flex flex-wrap items-center gap-2 text-[13px] text-[#4c5e86] sm:col-span-2">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded" />
            Recorrente mensal
            {form.isRecurring && (
              <input type="number" placeholder="Dia do mês" min={1} max={31} value={form.recurringDay} onChange={(e) => setForm({ ...form, recurringDay: e.target.value })} className="input-control w-28" />
            )}
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => createTx.mutate(form)} disabled={!form.description || !form.amount || createTx.isPending} className="btn-primary">
            {createTx.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-semibold text-[#4c5e86] transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>
    </div>
  );
}
