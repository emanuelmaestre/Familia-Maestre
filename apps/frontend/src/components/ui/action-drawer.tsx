'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ActionDrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function ActionDrawer({ open, title, children, onClose }: ActionDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 text-gray-900 animate-in fade-in duration-200">
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 shadow-sm backdrop-blur-xl sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Assistente</p>
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <section className="mx-auto flex min-h-full w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-xl font-semibold text-gray-950">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">Preencha as informacoes e salve para concluir.</p>
          </div>
          <div className="flex-1">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
