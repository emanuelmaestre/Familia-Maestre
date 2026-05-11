'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/use-socket';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS } from '@/lib/utils';
import { Plus, Check, X, Trash2 } from 'lucide-react';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  priority: string;
  status: string;
  notes?: string;
  requestedBy: { id: string; name: string };
}

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export default function ListaPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', quantity: 1, unit: '', category: '', priority: 'MEDIUM', notes: '',
  });

  useSocket((event) => {
    if (event.startsWith('shopping:')) {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    }
  });

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ['shopping', statusFilter],
    queryFn: () => api.get(`/shopping${statusFilter ? `?status=${statusFilter}` : ''}`).then((r) => r.data),
  });

  const addItem = useMutation({
    mutationFn: (data: typeof form) => api.post('/shopping', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
      setShowForm(false);
      setForm({ name: '', quantity: 1, unit: '', category: '', priority: 'MEDIUM', notes: '' });
    },
  });

  const purchaseItem = useMutation({
    mutationFn: (id: string) => api.patch(`/shopping/${id}/purchase`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const cancelItem = useMutation({
    mutationFn: (id: string) => api.patch(`/shopping/${id}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/shopping/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  return (
    <div>
      <Header title="Lista de Compras" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            {['', 'PENDING', 'PURCHASED', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s === '' ? 'Todos' : STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Novo Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Nome do produto *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                type="number"
                placeholder="Quantidade"
                value={form.quantity}
                min={1}
                onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Unidade (kg, un, L...)"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Categoria"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
              <input
                placeholder="Observação"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addItem.mutate(form)}
                disabled={!form.name || addItem.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {addItem.isPending ? 'Salvando...' : 'Salvar'}
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCartEmpty />
            <p className="mt-3 text-sm">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Quantidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prioridade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Solicitante</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.requestedBy.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'PURCHASED' ? 'bg-green-100 text-green-700' :
                        item.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => purchaseItem.mutate(item.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Marcar como comprado"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button
                                onClick={() => cancelItem.mutate(item.id)}
                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => deleteItem.mutate(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
  );
}
