'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, Check, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

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

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<FinanceView>('PAYABLE');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '', supplierName: '', tradeName: '', documentNumber: '', paymentMethod: '', amount: '', type: 'EXPENSE', categoryId: '', dueDate: '', isRecurring: false, recurringDay: '',
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

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount);
        if (!tx.isPaid && tx.type === 'EXPENSE') acc.payable += amount;
        if (!tx.isPaid && tx.type === 'INCOME') acc.receivable += amount;
        if (tx.isPaid && tx.type === 'EXPENSE') acc.paid += amount;
        if (tx.isPaid && tx.type === 'INCOME') acc.received += amount;
        return acc;
      },
      { payable: 0, receivable: 0, paid: 0, received: 0 },
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (view === 'PAYABLE') return transactions.filter((tx) => tx.type === 'EXPENSE' && !tx.isPaid);
    if (view === 'RECEIVABLE') return transactions.filter((tx) => tx.type === 'INCOME' && !tx.isPaid);
    if (view === 'SETTLED') return transactions.filter((tx) => tx.isPaid);
    return transactions;
  }, [transactions, view]);

  const chartData = Object.entries(summary?.byCategory ?? {}).map(([name, value]) => ({ name, value }));
  const summaryCards = [
    { label: 'Débito', value: totals.payable, tone: 'red', icon: TrendingDown },
    { label: 'Crédito', value: totals.receivable, tone: 'green', icon: TrendingUp },
    { label: 'Saldo previsto', value: totals.receivable - totals.payable, tone: totals.receivable - totals.payable >= 0 ? 'blue' : 'red', icon: Wallet },
  ];

  const viewLabels: Record<FinanceView, string> = {
    ALL: 'Todos',
    PAYABLE: 'Débito',
    RECEIVABLE: 'Crédito',
    SETTLED: 'Pagos / recebidos',
  };

  return (
    <div className="app-page space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input-control">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i, 1).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(+e.target.value)} className="input-control">
            {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => {
          const toneClass = {
            green: 'bg-green-50 text-green-700 border-green-100',
            red: 'bg-red-50 text-red-700 border-red-100',
            blue: 'bg-blue-50 text-blue-700 border-blue-100',
          }[card.tone];
          return (
            <div key={card.label} className={`interactive-card border p-5 ${toneClass}`}>
              <div className="mb-2 flex items-center gap-2">
                <card.icon className="h-4 w-4" />
                <span className="text-sm font-medium text-gray-600">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(card.value)}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(viewLabels) as FinanceView[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              view === key
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'border border-gray-200 bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            {viewLabels[key]}
          </button>
        ))}
      </div>

      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Novo Lançamento">
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
          <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700 sm:col-span-2">
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
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>

      {chartData.length > 0 && (
        <div className="surface p-5">
          <h3 className="mb-4 font-semibold text-gray-900">Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fornecedor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome Fantasia</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">CPF/CNPJ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Pagamento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Vencimento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTransactions.map((tx) => {
              const isReceivable = tx.type === 'INCOME';
              return (
                <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tx.description}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.supplierName || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.tradeName || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.documentNumber || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.paymentMethod ? PAYMENT_METHOD_LABELS[tx.paymentMethod] : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.category?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.dueDate ? formatDate(tx.dueDate) : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${isReceivable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isReceivable ? 'Crédito' : 'Débito'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${tx.isPaid ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tx.isPaid ? (isReceivable ? 'Recebido' : 'Pago') : 'Pendente'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isReceivable ? 'text-green-600' : 'text-red-600'}`}>
                    {isReceivable ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {!tx.isPaid && (
                        <button
                          type="button"
                          onClick={() => markPaid.mutate(tx.id)}
                          className="rounded-lg p-1.5 text-green-600 transition hover:bg-green-50"
                          title={isReceivable ? 'Marcar como recebido' : 'Marcar como pago'}
                        >
                          <Check className="h-4 w-4" />
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
          <p className="py-8 text-center text-sm text-gray-400">
            Nenhum lançamento encontrado em {viewLabels[view].toLowerCase()}.
          </p>
        )}
      </div>
    </div>
  );
}
