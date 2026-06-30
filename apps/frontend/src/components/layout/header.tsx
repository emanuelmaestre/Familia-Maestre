'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <header
      className="topnav-glass sticky top-0 z-40 flex h-14 md:h-[72px] shrink-0 items-center justify-between px-4 md:px-10"
    >
      {/* Left: mobile logo + page title */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
          >
            <span className="material-symbols-outlined text-white text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          </div>
          {/* Page title visible on mobile */}
          <h2
            className="text-[14px] font-bold text-[#041a3f] leading-tight truncate max-w-[160px]"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            {title ?? 'Família Maestre'}
          </h2>
        </div>

        <div className="hidden md:block">
          <h2
            className="text-[15px] font-bold text-[#041a3f] leading-tight"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            {title ?? 'Família Maestre'}
          </h2>
          <p className="text-[11.5px] text-[#4c5e86]">
            Bem-vindo de volta, {user?.name?.split(' ')[0]}
          </p>
        </div>

        {/* Search */}
        <div className="relative hidden lg:block ml-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737686] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar dados da família..."
            className="pl-10 pr-4 py-2 w-64 rounded-full text-[13px] transition-all"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              fontFamily: 'Plus Jakarta Sans',
              color: '#191c1e',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.border = '1px solid rgba(0,87,217,0.4)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,87,217,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.7)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Notifications */}
        <button
          type="button"
          onClick={() => router.push('/notificacoes')}
          title="Notificações"
          className="relative p-3 rounded-full transition-all"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            color: '#4c5e86',
          }}
        >
          <span className="material-symbols-outlined text-[22px] leading-none">notifications</span>
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{
                background: '#EF4444',
                boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              }}
            />
          )}
        </button>

        {/* User avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white border-2 border-white shadow-md cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
          title={user?.name}
        >
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Quick add */}
        <button
          type="button"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-[#0057D9] transition-all"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(0,87,217,0.2)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'Plus Jakarta Sans',
          }}
          onClick={() => {}}
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          Nova Tarefa
        </button>
      </div>
    </header>
  );
}
