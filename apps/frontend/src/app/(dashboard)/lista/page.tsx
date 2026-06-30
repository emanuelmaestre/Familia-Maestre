'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { useAuthStore } from '@/store/auth.store';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS } from '@/lib/utils';
// icons via Material Symbols (globals.css)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['', 'PENDING', 'PURCHASED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-[#0057D9] text-white shadow-[0_4px_14px_rgba(0,87,217,0.3)]'
                  : 'glass-card text-[#4c5e86] hover:text-[#041a3f]'
              }`}
            >
              {s === '' ? 'Todos' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span>
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
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0057D9]" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-3"
            style={{ background: 'rgba(0,87,217,0.08)' }}>
            <span className="material-symbols-outlined text-[32px] text-[#0057D9]">shopping_cart</span>
          </div>
          <p className="text-[13px] text-[#737686] font-medium">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="glass-card">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead style={{ borderBottom: '1px solid rgba(195,198,215,0.4)' }}>
              <tr>
                {['Produto','Quantidade','Categoria','Prioridade','Solicitante','Status','Ações'].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#4c5e86] ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-white/50" style={{ borderBottom: '1px solid rgba(195,198,215,0.25)' }}>
                  <td className="px-4 py-3.5 font-semibold text-[#191c1e]">{item.name}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{item.category ?? '-'}</td>
                  <td className="px-4 py-3.5"><span className={`status-pill ${PRIORITY_COLORS[item.priority]}`}>{PRIORITY_LABELS[item.priority]}</span></td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{item.requestedBy.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`status-pill ${
                      item.status === 'PURCHASED' ? 'status-ok'      :
                      item.status === 'CANCELLED' ? 'status-neutral' :
                      'status-info'
                    }`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      {item.status === 'PENDING' && (
                        <>
                          <button type="button" onClick={() => purchaseItem.mutate(item.id)} className="rounded-xl p-2.5 text-[#10B981] transition hover:bg-emerald-50" title="Marcar como comprado">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button type="button" onClick={() => cancelItem.mutate(item.id)} className="rounded-xl p-2.5 text-[#F59E0B] transition hover:bg-amber-50" title="Cancelar">
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                          )}
                        </>
                      )}
                      {user?.role === 'ADMIN' && (
                        <button type="button" onClick={() => deleteItem.mutate(item.id)} className="rounded-xl p-2.5 text-[#EF4444] transition hover:bg-red-50" title="Excluir">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
