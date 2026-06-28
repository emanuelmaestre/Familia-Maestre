'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { useAuthStore } from '@/store/auth.store';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS } from '@/lib/utils';
import { Plus, Check, X, Trash2, ShoppingCart } from 'lucide-react';

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
const UNIT_OPTIONS = [
  '', 'un', 'unidade', 'peça', 'par', 'kit', 'jogo', 'dúzia',
  'pacote', 'caixa', 'fardo', 'saco', 'sacola', 'embalagem', 'refil',
  'kg', 'g', 'mg', 'tonelada', 'arroba',
  'L', 'ml', 'm³', 'galão',
  'm', 'cm', 'mm', 'm²', 'cm²',
  'lata', 'garrafa', 'pote', 'frasco', 'vidro', 'bisnaga', 'tubo',
  'sachê', 'envelope', 'cartela', 'blister',
  'barra', 'tablete', 'rolo', 'bobina', 'folha',
  'maço', 'molho', 'ramo', 'cabeça', 'pé', 'bandeja',
  'comprimido', 'cápsula', 'ampola', 'dose',
  'porção', 'fatias', 'xícara', 'colher', 'pitada',
];

export default function ListaPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', quantity: 1, unit: '', category: '', priority: 'MEDIUM', notes: '',
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
    <div className="app-page space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['', 'PENDING', 'PURCHASED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'border border-gray-200 bg-white/80 text-gray-600 hover:bg-white'
              }`}
            >
              {s === '' ? 'Todos' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </button>
      </div>

      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Novo Item">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input placeholder="Nome do produto *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-control sm:col-span-2" />
          <input type="number" placeholder="Quantidade" value={form.quantity} min={0.01} step="any" onChange={(e) => setForm({ ...form, quantity: +e.target.value })} className="input-control" />
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-control">
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit || 'empty'} value={unit}>
                {unit || 'Sem unidade'}
              </option>
            ))}
          </select>
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-control" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-control">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
          <input placeholder="Observação" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-control sm:col-span-2" />
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => addItem.mutate(form)} disabled={!form.name || addItem.isPending} className="btn-primary">
            {addItem.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface-soft py-12 text-center text-gray-400">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Quantidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Solicitante</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category ?? '-'}</td>
                  <td className="px-4 py-3"><span className={`status-pill ${PRIORITY_COLORS[item.priority]}`}>{PRIORITY_LABELS[item.priority]}</span></td>
                  <td className="px-4 py-3 text-gray-500">{item.requestedBy.name}</td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${
                      item.status === 'PURCHASED' ? 'bg-green-100 text-green-700' :
                      item.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {item.status === 'PENDING' && (
                        <>
                          <button type="button" onClick={() => purchaseItem.mutate(item.id)} className="rounded-lg p-1.5 text-green-600 transition hover:bg-green-50" title="Marcar como comprado">
                            <Check className="h-4 w-4" />
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button type="button" onClick={() => cancelItem.mutate(item.id)} className="rounded-lg p-1.5 text-orange-500 transition hover:bg-orange-50" title="Cancelar">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      {user?.role === 'ADMIN' && (
                        <button type="button" onClick={() => deleteItem.mutate(item.id)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50" title="Excluir">
                          <Trash2 className="h-4 w-4" />
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
  );
}
