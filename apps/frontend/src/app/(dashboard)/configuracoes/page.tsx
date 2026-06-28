'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { useAuthStore } from '@/store/auth.store';
import { ArrowRight, Plug, Plus, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export default function ConfiguracoesPage() {
  const { user: me } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'MEMBER' });
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
      setForm({ name: '', phone: '', password: '', role: 'MEMBER' });
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
    <div className="app-page max-w-3xl space-y-6">
      <div className="surface p-5">
        <h3 className="mb-4 font-semibold text-gray-900">Alterar Senha</h3>
        <div className="max-w-sm space-y-3">
          <input type="password" placeholder="Senha atual" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="input-control" />
          <input type="password" placeholder="Nova senha" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="input-control" />
          <input type="password" placeholder="Confirmar nova senha" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="input-control" />
          {pwMsg && <p className={`text-sm ${pwMsg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
          <button
            type="button"
            onClick={() => {
              if (pwForm.newPassword !== pwForm.confirm) {
                setPwMsg('As senhas não conferem.');
                return;
              }
              changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            }}
            disabled={!pwForm.currentPassword || !pwForm.newPassword || changePassword.isPending}
            className="btn-primary"
          >
            Alterar Senha
          </button>
        </div>
      </div>

      {me?.role === 'ADMIN' && (
        <>
          <Link href="/integracoes" className="interactive-card flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Plug className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-950">Integrações</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure e acompanhe WhatsApp, Correios, IA, notificações e rotinas automáticas.
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
          </Link>

          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Users className="h-4 w-4" /> Membros da Família
              </h3>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary px-3 py-1.5">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>

            <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Adicionar Membro">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-control" />
                <input placeholder="Telefone / WhatsApp *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-control" />
                <input type="password" placeholder="Senha *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-control" />
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-control">
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => createUser.mutate(form)} disabled={!form.name || !form.phone || !form.password || createUser.isPending} className="btn-primary">
                  {createUser.isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                  Cancelar
                </button>
              </div>
            </ActionDrawer>

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        WhatsApp: {u.phone} - {u.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                      </p>
                    </div>
                  </div>
                  {u.id !== me?.id && (
                    <button
                      type="button"
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`status-pill transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                    >
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
