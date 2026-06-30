'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ShaderBackground } from '@/components/ui/shader-background';
import { useAuthStore } from '@/store/auth.store';

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/compras':      'Compras',
  '/lista':        'Lista de Compras',
  '/financeiro':   'Financeiro',
  '/agenda':       'Agenda Familiar',
  '/whatsapp':     'WhatsApp Bot',
  '/ia':           'IA Center',
  '/notificacoes': 'Notificações',
  '/relatorios':   'Relatórios',
  '/integracoes':  'Integrações',
  '/configuracoes':'Configurações',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const title    = pageTitles[pathname] ?? 'Família Maestre';

  useEffect(() => {
    fetchMe().catch(() => router.push('/login'));
  }, []);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#f7f9fb' }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Animated logo */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #0057D9, #38BDF8)',
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            <span
              className="material-symbols-outlined text-white text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              home
            </span>
          </div>
          {/* Shimmer bars */}
          <div className="space-y-2 w-48">
            <div className="shimmer h-3 rounded-full w-full" />
            <div className="shimmer h-3 rounded-full w-3/4 mx-auto" />
          </div>
          <p
            className="text-[13px] font-semibold text-[#4c5e86]"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      {/* WebGL animated background */}
      <ShaderBackground />

      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="orb orb-blue"   style={{ width: 500, height: 500, top: '-10%',  left: '-5%'  }} />
        <div className="orb orb-ice"    style={{ width: 400, height: 400, top: '40%',   right: '-8%' }} />
        <div className="orb orb-ai"     style={{ width: 300, height: 300, bottom: '5%', left: '30%'  }} />
      </div>

      <div className="relative flex min-h-screen" style={{ zIndex: 1 }}>
        <Sidebar />

        <div className="flex-1 flex flex-col md:ml-64 min-w-0">
          <Header title={title} />
          <main className="flex-1 overflow-auto p-4 pb-28 md:p-6 md:pb-6 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
