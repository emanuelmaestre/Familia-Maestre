'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  ShoppingCart, DollarSign, Calendar,
  BarChart3, Home, LogOut, Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <aside className="hidden min-h-screen w-64 flex-col border-r border-gray-200 bg-white/90 backdrop-blur-xl md:flex">
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl" style={{ animation: 'float-home 4s ease-in-out infinite' }}>🏠</span>
            <div>
              <h1 className="font-bold leading-tight text-gray-900">Família Maestre</h1>
              <p className="text-xs text-gray-500">Administração Familiar</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                  : 'text-gray-600 hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role === 'ADMIN' ? 'Administrador' : 'Membro'}</p>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <Link href="/configuracoes" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 transition-all hover:translate-x-0.5 hover:bg-gray-50">
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
          )}

          <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-2xl border border-gray-200 bg-white/92 p-2 shadow-2xl shadow-gray-900/10 backdrop-blur-xl md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-all',
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
