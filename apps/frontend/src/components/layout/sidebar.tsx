'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  ShoppingCart, Package, DollarSign, Calendar, CheckSquare,
  BarChart3, Home, LogOut, Settings, Bell,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/lista', label: 'Lista de Compras', icon: ShoppingCart },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏡</span>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Família Maestre</h1>
            <p className="text-xs text-gray-500">Administração Familiar</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role === 'ADMIN' ? 'Administrador' : 'Membro'}</p>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <Link
            href="/configuracoes"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mt-1"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
