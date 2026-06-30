'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',      icon: 'dashboard',       fill: true  },
  { href: '/compras',      label: 'Compras',         icon: 'shopping_cart',   fill: false },
  { href: '/lista',        label: 'Lista',           icon: 'checklist',       fill: false },
  { href: '/financeiro',   label: 'Finanças',        icon: 'payments',        fill: false },
  { href: '/agenda',       label: 'Agenda',          icon: 'calendar_today',  fill: false },
  { href: '/whatsapp',     label: 'WhatsApp Bot',    icon: 'chat',            fill: false },
  { href: '/ia',           label: 'IA Center',       icon: 'smart_toy',       fill: false, ai: true },
  { href: '/relatorios',   label: 'Relatórios',      icon: 'analytics',       fill: false },
];

const bottomItems = [
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
];

function NavIcon({ icon, fill }: { icon: string; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined text-[22px] leading-none"
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
    >
      {icon}
    </span>
  );
}

// Short labels for the compact bottom nav
const mobileLabels: Record<string, string> = {
  '/dashboard':  'Início',
  '/compras':    'Compras',
  '/lista':      'Lista',
  '/financeiro': 'Finanças',
  '/agenda':     'Agenda',
  '/whatsapp':   'Bot',
  '/ia':         'IA',
  '/relatorios': 'Relatórios',
};

// First 4 primary + overflow drawer
const MOBILE_PRIMARY = 4;

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="sidebar-glass hidden md:flex flex-col h-[100dvh] w-64 fixed left-0 top-0 z-50 shadow-2xl">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-7 border-b border-white/8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
          >
            <span className="material-symbols-outlined text-white text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          </div>
          <div>
            <h1 className="font-bold text-[15px] leading-tight text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Família Maestre
            </h1>
            <p className="text-[11px] text-blue-200/60 font-medium">Gestão Familiar</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {navItems.map(({ href, label, icon, fill, ai }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-200',
                  active
                    ? 'text-white bg-[rgba(0,87,217,0.22)] border border-[rgba(0,87,217,0.35)] shadow-[0_0_18px_rgba(0,87,217,0.18)]'
                    : 'text-blue-100/65 hover:text-white hover:bg-white/6',
                  ai && !active && 'hover:text-[#38BDF8]'
                )}
              >
                <NavIcon icon={icon} fill={active || fill} />
                <span style={{ fontFamily: 'Plus Jakarta Sans' }}>{label}</span>
                {ai && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(56,189,248,0.2)] text-[#38BDF8] border border-[rgba(56,189,248,0.3)]">
                    IA
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 pb-4 pt-3 border-t border-white/8">
          {/* Quick action */}
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white mb-4
              shadow-[0_4px_20px_rgba(0,87,217,0.4)] transition-all duration-300 hover:shadow-[0_6px_28px_rgba(0,87,217,0.55)] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #0057D9, #0041a7)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Registro
          </button>

          {/* Config */}
          {bottomItems.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2 text-blue-100/45 hover:text-white text-[12.5px] font-medium transition-colors rounded-xl hover:bg-white/5">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </Link>
          ))}

          {/* User */}
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white border-2 border-[#0057D9] shadow-[0_0_12px_rgba(0,87,217,0.4)] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-blue-200/50">
                {user?.role === 'ADMIN' ? 'Administrador' : 'Membro'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className="text-blue-100/40 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden"
        style={{
          background: 'rgba(4, 26, 63, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.25rem',
          padding: '0.375rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="grid grid-cols-5 gap-0.5">
          {navItems.slice(0, MOBILE_PRIMARY).map(({ href, icon }) => {
            const active = isActive(href);
            const shortLabel = mobileLabels[href] ?? href.replace('/', '');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl py-3 px-1 transition-all min-h-[52px]',
                  active
                    ? 'bg-[rgba(0,87,217,0.25)] text-white border border-[rgba(0,87,217,0.3)]'
                    : 'text-blue-200/55 hover:text-white'
                )}
              >
                <span className="material-symbols-outlined text-[22px] leading-none"
                  style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
                  {icon}
                </span>
                <span className="text-[11px] font-semibold leading-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {shortLabel}
                </span>
              </Link>
            );
          })}

          {/* "Mais" button — opens a drawer with remaining items */}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-xl py-3 px-1 transition-all min-h-[52px]',
              moreOpen ? 'bg-[rgba(0,87,217,0.25)] text-white border border-[rgba(0,87,217,0.3)]' : 'text-blue-200/55 hover:text-white'
            )}
          >
            <span className="material-symbols-outlined text-[22px] leading-none">
              {moreOpen ? 'close' : 'more_horiz'}
            </span>
            <span className="text-[11px] font-semibold leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile "Mais" drawer ──────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="fixed bottom-24 inset-x-3 z-50 md:hidden rounded-2xl p-4"
            style={{
              background: 'rgba(4, 26, 63, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-[11px] font-bold text-blue-200/40 uppercase tracking-widest mb-3 px-1">Mais opções</p>
            <div className="grid grid-cols-2 gap-2">
              {[...navItems.slice(MOBILE_PRIMARY), ...bottomItems].map(({ href, label, icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all min-h-[44px]',
                      active
                        ? 'bg-[rgba(0,87,217,0.22)] text-white border border-[rgba(0,87,217,0.3)]'
                        : 'text-blue-100/65 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none"
                      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
                      {icon}
                    </span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans' }}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
