'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface SummaryData { income: number; expense: number; balance: number; }
interface ShoppingItem { id: string; name: string; priority: string; requestedBy: { name: string }; }
interface FamilyEvent  { id: string; title: string; type: string; startsAt: string; location?: string; }

const PRIORITY_LABEL: Record<string, string> = { URGENT: 'Urgente', HIGH: 'Alta', MEDIUM: 'Normal', LOW: 'Baixa' };
const EVENT_TYPE_ICON: Record<string, string> = {
  MEDICAL: 'medical_services', SCHOOL: 'school', ROUTINE: 'repeat',
  APPOINTMENT: 'calendar_today', OTHER: 'event',
};

// Mini spark-line bars
function SparkBar({ values, color = '#0057D9' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[3px] h-8 mt-3">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[2px] transition-all"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.25 + (i / values.length) * 0.75 }}
        />
      ))}
    </div>
  );
}

// Quick action button
function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="btn-ghost flex items-center gap-2 text-[13px] no-underline whitespace-nowrap flex-shrink-0"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const year   = now.getFullYear();
  const hour   = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const { data: summary } = useQuery<SummaryData>({
    queryKey: ['finance-summary', month, year],
    queryFn: () => api.get(`/finance/summary?month=${month}&year=${year}`).then((r) => r.data),
  });

  const { data: shopping = [] } = useQuery<ShoppingItem[]>({
    queryKey: ['shopping-pending'],
    queryFn: () => api.get('/shopping?status=PENDING').then((r) => r.data),
  });

  const { data: events = [] } = useQuery<FamilyEvent[]>({
    queryKey: ['events-upcoming'],
    queryFn: () =>
      api.get(`/events?status=SCHEDULED&from=${now.toISOString()}`).then((r) => r.data.slice(0, 5)),
  });

  const spendRatio = summary ? Math.min((summary.expense / (summary.income || 1)) * 100, 100) : 0;

  return (
    <div className="app-page space-y-8">

      {/* ── Welcome header ─────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 fade-up">
        <div>
          <p className="section-badge mb-3">
            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
            {monthLabel}
          </p>
          <h2
            className="text-[28px] md:text-[36px] font-bold text-[#041a3f] leading-tight tracking-tight"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            {greeting}, Família Maestre 👋
          </h2>
          <p className="text-[15px] text-[#4c5e86] mt-1">
            Aqui está o resumo da sua família para hoje.
          </p>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 xl:flex-wrap xl:pb-0 xl:gap-3 scrollbar-hide">
          <QuickAction icon="receipt_long"      label="Importar NFe"    href="/compras" />
          <QuickAction icon="add_shopping_cart" label="Adicionar Item"  href="/lista" />
          <QuickAction icon="swap_horiz"        label="Transação"       href="/financeiro" />
          <QuickAction icon="event"             label="Novo Evento"     href="/agenda" />
        </div>
      </div>

      {/* ── Bento grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* Financial Overview — large card */}
        <div
          className="md:col-span-8 glass-card p-5 sm:p-7 flex flex-col justify-between group relative overflow-hidden fade-up stagger-1"
        >
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl transition-colors duration-700 pointer-events-none"
            style={{ background: 'rgba(0,87,217,0.07)' }} />

          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(0,87,217,0.1)', border: '1px solid rgba(0,87,217,0.15)' }}>
                <span className="material-symbols-outlined text-[#0057D9] text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
              <h3 className="text-[18px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Visão Financeira
              </h3>
            </div>
            <Link href="/financeiro" className="text-[12px] font-semibold text-[#0057D9] hover:underline">
              Ver tudo →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
            {/* Balance */}
            <div className="stat-card">
              <p className="text-[11px] font-bold text-[#4c5e86] uppercase tracking-wider mb-2">Saldo Total</p>
              <p className="text-[28px] font-bold text-[#0057D9]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {formatCurrency(summary?.balance ?? 0)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-[14px] text-[#10B981]">trending_up</span>
                <span className="text-[11px] font-semibold text-[#10B981]">Este mês</span>
              </div>
              <SparkBar values={[40, 55, 45, 70, 60, 100]} color="#0057D9" />
            </div>

            {/* Income */}
            <div className="stat-card">
              <p className="text-[11px] font-bold text-[#4c5e86] uppercase tracking-wider mb-2">Receitas</p>
              <p className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {formatCurrency(summary?.income ?? 0)}
              </p>
              <p className="text-[12px] text-[#4c5e86] mt-1">{monthLabel}</p>
              <SparkBar values={[60, 80, 70, 90, 85, 100]} color="#10B981" />
            </div>

            {/* Expenses */}
            <div className="stat-card">
              <p className="text-[11px] font-bold text-[#4c5e86] uppercase tracking-wider mb-2">Despesas</p>
              <p className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {formatCurrency(summary?.expense ?? 0)}
              </p>
              <div className="w-full rounded-full h-2 mt-3 overflow-hidden" style={{ background: 'rgba(71,70,84,0.12)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${spendRatio}%`,
                    background: spendRatio > 80
                      ? 'linear-gradient(to right, #F59E0B, #EF4444)'
                      : 'linear-gradient(to right, #F59E0B, #d97706)',
                  }}
                />
              </div>
              <p className="text-[11px] text-[#4c5e86] mt-1 text-right">{spendRatio.toFixed(0)}% da receita</p>
            </div>
          </div>
        </div>

        {/* AI Center — small card */}
        <div className="md:col-span-4 ai-glow p-7 flex flex-col group relative overflow-hidden fade-up stagger-2">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full blur-2xl transition-colors duration-700 pointer-events-none"
            style={{ background: 'rgba(56,189,248,0.18)' }} />

          <div className="flex items-center gap-3 mb-5 relative z-10">
            <div className="p-3 rounded-2xl ai-pulse" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)' }}>
              <span className="material-symbols-outlined text-[#38BDF8] text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </div>
            <h3 className="text-[18px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              IA Center
            </h3>
          </div>

          <p className="text-[13.5px] text-[#4c5e86] flex-1 relative z-10 leading-relaxed mb-5">
            Processamento inteligente de notas fiscais e categorização automática de gastos.
          </p>

          <div className="relative z-10 rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)' }}>
            {[
              { label: 'NFs processadas', value: '—' },
              { label: 'Produtos normalizados', value: '—' },
              { label: 'Custo IA (mês)', value: '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-[12.5px] border-b border-white/40 pb-2 last:border-0 last:pb-0">
                <span className="text-[#4c5e86] font-medium">{label}</span>
                <span className="font-bold text-[#041a3f]">{value}</span>
              </div>
            ))}
          </div>

          <Link href="/ia" className="btn-primary mt-5 justify-center text-[13px] no-underline"
            style={{ background: 'linear-gradient(135deg, #38BDF8, #0057D9)' }}>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            Acessar IA Center
          </Link>
        </div>

        {/* Shopping list */}
        <div className="md:col-span-5 glass-card p-6 fade-up stagger-3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,87,217,0.1)' }}>
                <span className="material-symbols-outlined text-[#0057D9] text-[20px]">shopping_cart</span>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#041a3f]">Lista de Compras</h3>
                <p className="text-[11px] text-[#4c5e86]">{shopping.length} itens pendentes</p>
              </div>
            </div>
            <Link href="/lista" className="text-[12px] font-semibold text-[#0057D9] hover:underline">Ver tudo →</Link>
          </div>

          {shopping.length === 0 ? (
            <EmptyCard icon="check_circle" text="Lista vazia — tudo comprado!" />
          ) : (
            <ul className="space-y-2">
              {shopping.slice(0, 6).map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/50"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-[#c3c6d7]">radio_button_unchecked</span>
                    <span className="text-[13.5px] font-medium text-[#191c1e] truncate">{item.name}</span>
                  </div>
                  <span className={`status-pill flex-shrink-0 ${
                    item.priority === 'URGENT' ? 'status-alert'   :
                    item.priority === 'HIGH'   ? 'status-warning' : 'status-neutral'
                  }`}>
                    {PRIORITY_LABEL[item.priority] ?? item.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming events */}
        <div className="md:col-span-7 glass-card p-6 fade-up stagger-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(76, 94, 134, 0.1)' }}>
                <span className="material-symbols-outlined text-[#4c5e86] text-[20px]">calendar_today</span>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#041a3f]">Próximos Eventos</h3>
                <p className="text-[11px] text-[#4c5e86]">{events.length} agendados</p>
              </div>
            </div>
            <Link href="/agenda" className="text-[12px] font-semibold text-[#0057D9] hover:underline">Ver tudo →</Link>
          </div>

          {events.length === 0 ? (
            <EmptyCard icon="event_available" text="Nenhum evento próximo" />
          ) : (
            <ul className="space-y-2">
              {events.map((event, i) => (
                <li key={event.id}
                  className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-white/50"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(76,94,134,0.1)' }}
                  >
                    <span className="material-symbols-outlined text-[#4c5e86] text-[18px]">
                      {EVENT_TYPE_ICON[event.type] ?? 'event'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#191c1e] truncate">{event.title}</p>
                    <p className="text-[11.5px] text-[#4c5e86]">
                      {formatDate(event.startsAt)}{event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                  <span className="status-pill status-info flex-shrink-0">
                    {event.type === 'MEDICAL' ? 'Médico' : event.type === 'SCHOOL' ? 'Escola' : 'Evento'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* WhatsApp bot mini card */}
        <div
          className="md:col-span-4 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden fade-up stagger-5"
          style={{
            background: 'linear-gradient(135deg, #041a3f 0%, #0057D9 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(56,189,248,0.15)' }} />

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <span className="material-symbols-outlined text-white text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            </div>
            <h3 className="text-[16px] font-bold text-white">WhatsApp Bot</h3>
          </div>

          <p className="text-[13px] text-blue-200/80 leading-relaxed relative z-10 mb-5">
            Envie uma foto da NF pelo WhatsApp e o sistema registra automaticamente.
          </p>

          <div className="flex items-center gap-2 relative z-10">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[12px] text-blue-200/70 font-medium">Bot ativo e conectado</span>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 fade-up stagger-5">
          {[
            { icon: 'receipt_long',  label: 'NFs importadas',  value: '—', color: '#0057D9' },
            { icon: 'inventory_2',   label: 'Produtos',         value: '—', color: '#4c5e86' },
            { icon: 'group',         label: 'Membros',          value: '—', color: '#38BDF8' },
            { icon: 'notifications', label: 'Notificações',     value: '—', color: '#F59E0B' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="stat-card flex flex-col items-start gap-3">
              <span className="material-symbols-outlined text-[22px]" style={{ color }}>
                {icon}
              </span>
              <div>
                <p className="text-[22px] font-bold text-[#041a3f]">{value}</p>
                <p className="text-[11.5px] text-[#4c5e86] font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-2xl"
      style={{ border: '1.5px dashed rgba(195,198,215,0.6)', background: 'rgba(255,255,255,0.3)' }}>
      <span className="material-symbols-outlined text-[32px] text-[#c3c6d7]">{icon}</span>
      <p className="text-[12.5px] font-medium text-[#737686]">{text}</p>
    </div>
  );
}
