'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatDate } from '@/lib/utils';
import { Plus, AlertTriangle, Package } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  location?: string;
  category: { name: string; icon?: string };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

export default function EstoquePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'unidade', categoryId: '', minQuantity: 1, location: '' });
  const [entryForm, setEntryForm] = useState({ type: 'IN', quantity: 1, notes: '', expiresAt: '' });

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory-items'],
    queryFn: () => api.get('/inventory/items').then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get('/inventory/categories').then((r) => r.data),
  });

  const createItem = useMutation({
    mutationFn: (data: typeof form) => api.post('/inventory/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setShowForm(false);
      setForm({ name: '', unit: 'unidade', categoryId: '', minQuantity: 1, location: '' });
    },
  });

  const addEntry = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: typeof entryForm }) =>
      api.post(`/inventory/items/${itemId}/entries`, { ...data, quantity: +data.quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setShowEntryForm(null);
      setEntryForm({ type: 'IN', quantity: 1, notes: '', expiresAt: '' });
    },
  });

  const lowStock = items.filter((i) => i.quantity < i.minQuantity);

  return (
    <div>
      <Header title="Estoque" />
      <div className="p-6 space-y-4">
        {lowStock.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">Itens com estoque baixo</p>
              <p className="text-sm text-orange-700">{lowStock.map((i) => i.name).join(', ')}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Novo Item de Estoque</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Nome *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma categoria *</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input
                placeholder="Unidade (kg, un, L...)"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="text-xs text-gray-500 block mb-1">Quantidade mínima</label>
                <input
                  type="number"
                  min={0}
                  value={form.minQuantity}
                  onChange={(e) => setForm({ ...form, minQuantity: +e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                placeholder="Localização (ex: despensa)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => createItem.mutate(form)}
                disabled={!form.name || !form.categoryId || createItem.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createItem.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum item no estoque</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isLow = item.quantity < item.minQuantity;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 ${isLow ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.category.icon ?? '📦'}</span>
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.category.name}{item.location ? ` · ${item.location}` : ''}</p>
                    </div>
                    {isLow && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                        {item.quantity}
                        <span className="text-sm font-normal text-gray-500 ml-1">{item.unit}</span>
                      </p>
                      <p className="text-xs text-gray-400">Mín: {item.minQuantity} {item.unit}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setShowEntryForm(item.id); setEntryForm({ ...entryForm, type: 'IN' }); }}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                      >
                        + Entrada
                      </button>
                      <button
                        onClick={() => { setShowEntryForm(item.id); setEntryForm({ ...entryForm, type: 'OUT' }); }}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                      >
                        - Saída
                      </button>
                    </div>
                  </div>

                  {showEntryForm === item.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={entryForm.quantity}
                          onChange={(e) => setEntryForm({ ...entryForm, quantity: +e.target.value })}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Quantidade"
                        />
                        {entryForm.type === 'IN' && (
                          <input
                            type="date"
                            value={entryForm.expiresAt}
                            onChange={(e) => setEntryForm({ ...entryForm, expiresAt: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                      <input
                        placeholder="Observação"
                        value={entryForm.notes}
                        onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => addEntry.mutate({ itemId: item.id, data: entryForm })}
                          disabled={addEntry.isPending}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setShowEntryForm(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
