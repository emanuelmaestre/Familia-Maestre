'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Plus, Check, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
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

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '', amount: '', type: 'EXPENSE', categoryId: '', dueDate: '', isRecurring: false, recurringDay: '',
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
      ...data, amount: parseFloat(data.amount),
      recurringDay: data.recurringDay ? parseInt(data.recurringDay) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setShowForm(false);
      setForm({ description: '', amount: '', type: 'EXPENSE', categoryId: '', dueDate: '', isRecurring: false, recurringDay: '' });
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/finance/transactions/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const chartData = Object.entries(summary?.byCategory ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <Header title="Financeiro" />
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <select
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i, 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Receitas', value: summary?.income ?? 0, color: 'text-green-600 bg-green-50', icon: TrendingUp },
            { label: 'Despesas', value: summary?.expense ?? 0, color: 'text-red-600 bg-red-50', icon: TrendingDown },
            { label: 'Saldo', value: summary?.balance ?? 0, color: (summary?.balance ?? 0) >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50', icon: TrendingUp },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl p-5 ${card.color.split(' ')[1]} border border-${card.color.split('-')[1]}-100 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color.split(' ')[0]}`} />
                <span className="text-sm font-medium text-gray-600">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.color.split(' ')[0]}`}>{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Nova Transação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Descrição *"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="number"
                placeholder="Valor (R$) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem categoria</option>
                {categories.filter((c) => c.type === form.type).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 col-span-2">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="rounded"
                />
                Recorrente mensal
                {form.isRecurring && (
                  <input
                    type="number"
                    placeholder="Dia do mês"
                    min={1}
                    max={31}
                    value={form.recurringDay}
                    onChange={(e) => setForm({ ...form, recurringDay: e.target.value })}
                    className="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                )}
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => createTx.mutate(form)}
                disabled={!form.description || !form.amount || createTx.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createTx.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Gastos por Categoria</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {tx.description}
                    {tx.isPaid && <span className="ml-2 text-xs text-green-600">✓ Pago</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tx.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.dueDate ? formatDate(tx.dueDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {!tx.isPaid && tx.type === 'EXPENSE' && (
                        <button
                          onClick={() => markPaid.mutate(tx.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Marcar como pago"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Nenhuma transação neste período</p>
          )}
        </div>
      </div>
    </div>
  );
}
