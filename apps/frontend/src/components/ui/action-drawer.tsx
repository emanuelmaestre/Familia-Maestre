'use client';

import { ReactNode, useEffect } from 'react';

interface ActionDrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  icon?: string;
}

export function ActionDrawer({ open, title, children, onClose, icon = 'edit_note' }: ActionDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(135deg, #e8eef8 0%, #f0f4fc 100%)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 py-4 md:px-8"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(195,198,215,0.4)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(0,87,217,0.08)' }}>
            <span className="material-symbols-outlined text-[20px] text-[#0057D9]">{icon}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0057D9]">Assistente</p>
            <h2 className="text-[17px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-xl flex items-center justify-center text-[#4c5e86] transition hover:bg-white/60 hover:text-[#041a3f]"
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </header>

      {/* ── Scrollable body ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-8">

          {/* Card */}
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(195,198,215,0.5)',
              boxShadow: '0 8px 32px rgba(4,26,63,0.08)',
            }}
          >
            <p className="text-[13px] text-[#4c5e86] mb-6">
              Preencha as informações e salve para concluir.
            </p>
            {children}
          </div>

        </div>
      </main>
    </div>
  );
}
