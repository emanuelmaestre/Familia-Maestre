'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { useAuthStore } from '@/store/auth.store';

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
    <div className="app-page space-y-6 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fade-up">
        <p className="section-badge mb-2">
          <span className="material-symbols-outlined text-[12px]">settings</span>
          Configurações
        </p>
        <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Configurações do Sistema
        </h2>
      </div>

      {/* ── Change password ────────────────────────────────────── */}
      <div className="glass-card p-6 fade-up stagger-1">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,87,217,0.08)' }}>
            <span className="material-symbols-outlined text-[22px] text-[#0057D9]">lock</span>
          </div>
          <h3 className="text-[16px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Alterar Senha
          </h3>
        </div>
        <div className="max-w-sm space-y-3">
          <input type="password" placeholder="Senha atual" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="input-control" />
          <input type="password" placeholder="Nova senha" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="input-control" />
          <input type="password" placeholder="Confirmar nova senha" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="input-control" />
          {pwMsg && (
            <p className={`text-[13px] font-semibold ${pwMsg.includes('sucesso') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {pwMsg}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('As senhas não conferem.'); return; }
              changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            }}
            disabled={!pwForm.currentPassword || !pwForm.newPassword || changePassword.isPending}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {changePassword.isPending ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* ── Admin section ──────────────────────────────────────── */}
      {me?.role === 'ADMIN' && (
        <>
          {/* Integrations link */}
          <Link
            href="/integracoes"
            className="glass-card p-5 flex items-center justify-between gap-4 no-underline group transition-all hover:-translate-y-0.5 fade-up stagger-2"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-2xl flex-shrink-0" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <span className="material-symbols-outlined text-[24px] text-[#38BDF8]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>cable</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Integrações
                </h3>
                <p className="text-[12.5px] text-[#4c5e86] mt-0.5 leading-relaxed">
                  Configure WhatsApp, IA, notificações e rotinas automáticas.
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[#c3c6d7] group-hover:text-[#0057D9] transition-colors flex-shrink-0">
              arrow_forward
            </span>
          </Link>

          {/* Members section */}
          <div className="glass-card overflow-hidden fade-up stagger-3">
            <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid rgba(195,198,215,0.35)' }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#4c5e86]">group</span>
                <h3 className="text-[15px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Membros da Família
                </h3>
                <span className="text-[11px] font-bold text-[#737686]">{users.length}</span>
              </div>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary px-3 py-2 text-[12px]">
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                Adicionar
              </button>
            </div>

            <div className="p-4 space-y-2">
              {users.map((u) => (
                <div key={u.id}
                  className="flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-white/40"
                  style={{ background: 'rgba(255,255,255,0.35)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0 border-2 border-white shadow"
                    style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
                  >
                    {u.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-[#191c1e] truncate">{u.name}</p>
                      {u.id === me?.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(0,87,217,0.1)] text-[#0057D9]">Você</span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[#737686]">
                      {u.phone} · {u.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                    </p>
                  </div>

                  {/* Toggle active */}
                  {u.id !== me?.id && (
                    <button
                      type="button"
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`status-pill transition-colors cursor-pointer ${
                        u.isActive ? 'status-ok hover:status-alert' : 'status-alert hover:status-ok'
                      }`}
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

      {/* ── Add member drawer ──────────────────────────────────── */}
      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Adicionar Membro" icon="person_add">
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
          <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-semibold text-[#4c5e86] transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>
    </div>
  );
}
