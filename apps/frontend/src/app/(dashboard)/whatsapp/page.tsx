'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface BotStatus {
  connected: boolean;
  phone?: string;
  instanceId?: string;
  lastActivity?: string;
}

interface PendingReceipt {
  phone: string;
  supplierName?: string;
  totalAmount?: number;
  itemCount?: number;
  createdAt: string;
}

const COMMANDS = [
  { cmd: '/ajuda',    desc: 'Lista todos os comandos disponíveis',      icon: 'help'           },
  { cmd: '/gastos',   desc: 'Resumo dos gastos do mês atual',           icon: 'receipt_long'   },
  { cmd: '/lista',    desc: 'Itens pendentes na lista de compras',      icon: 'checklist'      },
  { cmd: '/eventos',  desc: 'Próximos eventos da família',              icon: 'calendar_today' },
  { cmd: '📷 Foto',   desc: 'Envie uma foto da NF para importar automaticamente', icon: 'photo_camera' },
];

const HOW_TO = [
  { step: '1', text: 'Salve o número do bot na sua agenda', icon: 'contacts'     },
  { step: '2', text: 'Abra uma conversa no WhatsApp',       icon: 'chat'         },
  { step: '3', text: 'Envie /ajuda para ver os comandos',   icon: 'help_outline' },
  { step: '4', text: 'Tire uma foto da NF e envie direto',  icon: 'photo_camera' },
];

export default function WhatsAppBotPage() {
  const { data: status } = useQuery<BotStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/whatsapp/status').then((r) => r.data).catch(() => ({ connected: false })),
    refetchInterval: 30_000,
  });

  const { data: pending = [] } = useQuery<PendingReceipt[]>({
    queryKey: ['whatsapp-pending'],
    queryFn: () => api.get('/whatsapp/pending').then((r) => r.data).catch(() => []),
    refetchInterval: 15_000,
  });

  const isConnected = status?.connected ?? false;

  return (
    <div className="app-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fade-up">
        <p className="section-badge mb-2">
          <span className="material-symbols-outlined text-[12px]">chat</span>
          Automação via Mensagem
        </p>
        <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          WhatsApp Bot
        </h2>
        <p className="text-[13.5px] text-[#4c5e86] mt-1">
          Gerencie a família direto pelo WhatsApp — sem abrir o app.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Status card ──────────────────────────────────────── */}
        <div
          className="lg:col-span-1 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden fade-up stagger-1"
          style={{
            background: 'linear-gradient(135deg, #041a3f 0%, #0057D9 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(56,189,248,0.15)' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <span className="material-symbols-outlined text-white text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-200/60 uppercase tracking-widest">Status</p>
                <h3 className="text-[17px] font-bold text-white">Conexão Z-API</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isConnected
                  ? 'bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                  : 'bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.7)]'
              }`} />
              <span className="text-[14px] font-semibold text-white">
                {isConnected ? 'Conectado e ativo' : 'Desconectado'}
              </span>
            </div>

            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {[
                { label: 'Instância',     value: status?.instanceId  ?? '—' },
                { label: 'Número',        value: status?.phone       ?? '—' },
                { label: 'Última ativ.',  value: status?.lastActivity ? formatDate(status.lastActivity) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-[12px]">
                  <span className="text-blue-200/60 font-medium">{label}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending confirmations */}
          {pending.length > 0 && (
            <div className="relative z-10 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-[#F59E0B]">hourglass_empty</span>
                <p className="text-[12px] font-bold text-[#F59E0B]">{pending.length} NF(s) aguardando confirmação</p>
              </div>
              <p className="text-[11px] text-blue-200/60">Responda "sim" ou "não" no WhatsApp para confirmar o registro.</p>
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* How to use */}
          <div className="glass-card p-6 fade-up stagger-2">
            <h3 className="text-[15px] font-bold text-[#041a3f] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Como usar o Bot
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOW_TO.map(({ step, text, icon }) => (
                <div key={step} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #0057D9, #38BDF8)' }}
                  >
                    {step}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-[#4c5e86] flex-shrink-0">{icon}</span>
                    <p className="text-[12.5px] text-[#191c1e] font-medium leading-snug">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available commands */}
          <div className="glass-card p-6 fade-up stagger-3">
            <h3 className="text-[15px] font-bold text-[#041a3f] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Comandos Disponíveis
            </h3>
            <div className="space-y-2">
              {COMMANDS.map(({ cmd, desc, icon }) => (
                <div key={cmd}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all hover:bg-white/50"
                  style={{ border: '1px solid rgba(195,198,215,0.35)', background: 'rgba(255,255,255,0.3)' }}
                >
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(0,87,217,0.08)' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#0057D9]">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-[#041a3f]">{cmd}</p>
                    <p className="text-[12px] text-[#4c5e86]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NF import feature highlight */}
          <div
            className="rounded-3xl p-6 relative overflow-hidden fade-up stagger-4"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(0,87,217,0.08))',
              border: '1px solid rgba(56,189,248,0.25)',
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl flex-shrink-0" style={{ background: 'rgba(56,189,248,0.15)' }}>
                <span className="material-symbols-outlined text-[26px] text-[#38BDF8]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#041a3f] mb-1">Importação automática de NF</h4>
                <p className="text-[13px] text-[#4c5e86] leading-relaxed">
                  Tire uma foto da nota fiscal ou cupom e envie pelo WhatsApp. A IA processa a imagem, extrai os produtos automaticamente e pede sua confirmação antes de salvar.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['OCR automático', 'Normalização por IA', 'Confirmação por mensagem', 'Registro instantâneo'].map((tag) => (
                    <span key={tag} className="status-pill status-info text-[10px]">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
