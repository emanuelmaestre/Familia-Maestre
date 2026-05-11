'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Trash2, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  telegramId: string;
  telegramHandle?: string;
  role: string;
  isActive: boolean;
}

export default function ConfiguracoesPage() {
  const { user: me } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', telegramId: '', telegramHandle: '', password: '', role: 'MEMBER' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: me?.role === 'ADMIN',
  });

  const createUser = useMutation({
    mutationFn: (data: typeof form) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm({ name: '', telegramId: '', telegramHandle: '', password: '', role: 'MEMBER' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      setPwMsg('Senha alterada com sucesso!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: () => setPwMsg('Senha atual incorreta.'),
  });

  return (
    <div>
      <Header title="Configurações" />
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Alterar Senha</h3>
          <div className="space-y-3 max-w-sm">
            <input
              type="password"
              placeholder="Senha atual"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Nova senha"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pwMsg && <p className={`text-sm ${pwMsg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
            <button
              onClick={() => {
                if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('As senhas não conferem.'); return; }
                changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
              }}
              disabled={!pwForm.currentPassword || !pwForm.newPassword || changePassword.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Alterar Senha
            </button>
          </div>
        </div>

        {me?.role === 'ADMIN' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" /> Membros da Família
              </h3>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>

            {showForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Telegram ID *" value={form.telegramId} onChange={(e) => setForm({ ...form, telegramId: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="@handle (opcional)" value={form.telegramHandle} onChange={(e) => setForm({ ...form, telegramHandle: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="password" placeholder="Senha *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => createUser.mutate(form)}
                    disabled={!form.name || !form.telegramId || !form.password || createUser.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createUser.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 border border-gray-200">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">ID: {u.telegramId} · {u.role === 'ADMIN' ? 'Administrador' : 'Membro'}</p>
                    </div>
                  </div>
                  {u.id !== me?.id && (
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                    >
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
