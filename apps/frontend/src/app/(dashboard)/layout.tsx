'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth.store';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/compras': 'Compras',
  '/lista': 'Lista de Compras',
  '/financeiro': 'Financeiro',
  '/agenda': 'Agenda',
  '/notificacoes': 'Notificações',
  '/relatorios': 'Relatórios',
  '/integracoes': 'Integração',
  '/configuracoes': 'Configurações',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Família Maestre';

  useEffect(() => {
    fetchMe().catch(() => router.push('/login'));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-4 pb-28 sm:p-6 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
