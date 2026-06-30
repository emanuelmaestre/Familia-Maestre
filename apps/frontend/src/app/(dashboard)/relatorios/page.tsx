'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '@/store/auth.store';

interface Report {
  id: string;
  type: string;
  status: string;
  period: string;
  fileUrl?: string;
  createdAt: string;
  payload?: {
    finance?: { income: number; expense: number; balance: number; byCategory: Record<string, number> };
    shopping?: Array<{ name: string; status: string }>;
  };
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  CUSTOM: 'Personalizado',
};

const STATUS_PILL: Record<string, string> = {
  GENERATING: 'status-warning',
  READY:      'status-ok',
  SENT:       'status-info',
  FAILED:     'status-alert',
};

const STATUS_LABEL: Record<string, string> = {
  GENERATING: 'Gerando',
  READY:      'Pronto',
  SENT:       'Enviado',
  FAILED:     'Falhou',
};

const CHART_COLORS = ['#0057D9', '#10B981', '#F59E0B', '#38BDF8', '#EF4444', '#8b5cf6'];

export default function RelatoriosPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Report | null>(null);
  const [customForm, setCustomForm] = useState({ from: '', to: '', modules: ['all'] });

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then((r) => r.data),
  });

  const generateCustom = useMutation({
    mutationFn: (data: typeof customForm) => api.post('/reports/custom', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const financeData = selected?.payload?.finance;
  const categoryChart = financeData
    ? Object.entries(financeData.byCategory).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="app-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fade-up">
        <p className="section-badge mb-2">
          <span className="material-symbols-outlined text-[12px]">analytics</span>
          Módulo de Relatórios
        </p>
        <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Relatórios & Análises
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ──────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">

          {/* Custom report form (admin only) */}
          {user?.role === 'ADMIN' && (
            <div className="glass-card p-5 fade-up stagger-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(0,87,217,0.08)' }}>
                  <span className="material-symbols-outlined text-[20px] text-[#0057D9]">tune</span>
                </div>
                <h3 className="text-[14px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  Relatório Personalizado
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#4c5e86]">Data inicial</label>
                  <input type="date" value={customForm.from} onChange={(e) => setCustomForm({ ...customForm, from: e.target.value })} className="input-control" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#4c5e86]">Data final</label>
                  <input type="date" value={customForm.to} onChange={(e) => setCustomForm({ ...customForm, to: e.target.value })} className="input-control" />
                </div>
                <button
                  type="button"
                  onClick={() => generateCustom.mutate(customForm)}
                  disabled={!customForm.from || !customForm.to || generateCustom.isPending}
                  className="btn-primary w-full justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {generateCustom.isPending ? 'hourglass_empty' : 'summarize'}
                  </span>
                  {generateCustom.isPending ? 'Gerando...' : 'Gerar Relatório'}
                </button>
              </div>
            </div>
          )}

          {/* Report history list */}
          <div className="glass-card overflow-hidden fade-up stagger-2">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(195,198,215,0.35)' }}>
              <span className="material-symbols-outlined text-[20px] text-[#4c5e86]">history</span>
              <h3 className="text-[14px] font-bold text-[#041a3f]">Histórico</h3>
              <span className="ml-auto text-[11px] font-bold text-[#737686]">{reports.length}</span>
            </div>
            {reports.length === 0 ? (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#c3c6d7] block mb-2">article</span>
                <p className="text-[12.5px] font-medium text-[#737686]">Nenhum relatório gerado</p>
              </div>
            ) : (
              <ul>
                {reports.map((report, i) => (
                  <li
                    key={report.id}
                    onClick={() => setSelected(selected?.id === report.id ? null : report)}
                    className={`cursor-pointer px-5 py-3.5 flex items-center gap-3 transition-colors ${
                      selected?.id === report.id
                        ? 'bg-[rgba(0,87,217,0.06)]'
                        : 'hover:bg-white/50'
                    }`}
                    style={{ borderBottom: i < reports.length - 1 ? '1px solid rgba(195,198,215,0.25)' : 'none' }}
                  >
                    <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(76,94,134,0.08)' }}>
                      <span className="material-symbols-outlined text-[18px] text-[#4c5e86]">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#191c1e]">{REPORT_TYPE_LABELS[report.type] ?? report.type}</p>
                      <p className="text-[11px] text-[#4c5e86]">{report.period}</p>
                      <p className="text-[11px] text-[#737686]">{formatDate(report.createdAt)}</p>
                    </div>
                    <span className={`status-pill text-[10px] flex-shrink-0 ${STATUS_PILL[report.status] ?? 'status-neutral'}`}>
                      {STATUS_LABEL[report.status] ?? report.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right panel ──────────────────────────────────────── */}
        <div className="lg:col-span-2 fade-up stagger-3">
          {selected ? (
            <div className="glass-card p-6 space-y-5">
              {/* Report header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                    Relatório {REPORT_TYPE_LABELS[selected.type] ?? selected.type}
                  </h3>
                  <p className="text-[12.5px] text-[#4c5e86] mt-0.5">{selected.period}</p>
                </div>
                {selected.fileUrl && (
                  <a
                    href={selected.fileUrl}
                    className="btn-ghost text-[13px] no-underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    PDF
                  </a>
                )}
              </div>

              {/* Finance summary mini-cards */}
              {financeData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Receitas',  value: financeData.income,  color: '#10B981' },
                    { label: 'Despesas',  value: financeData.expense, color: '#EF4444' },
                    { label: 'Saldo',     value: financeData.balance, color: financeData.balance >= 0 ? '#0057D9' : '#EF4444' },
                  ].map((c) => (
                    <div key={c.label} className="stat-card text-center">
                      <p className="text-[11px] font-bold text-[#4c5e86] uppercase tracking-wider mb-2">{c.label}</p>
                      <p className="text-[22px] font-bold" style={{ color: c.color, fontFamily: 'Plus Jakarta Sans' }}>
                        {formatCurrency(c.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Category pie chart */}
              {categoryChart.length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-[#4c5e86] mb-4">Gastos por Categoria</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={categoryChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        label={(e) => e.name}
                        labelLine={{ stroke: 'rgba(76,94,134,0.4)' }}
                      >
                        {categoryChart.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(195,198,215,0.5)', borderRadius: '12px', fontFamily: 'Plus Jakarta Sans' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Shopping list preview */}
              {(selected.payload?.shopping?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-[#4c5e86] mb-3">Lista de Compras</p>
                  <div className="space-y-1.5">
                    {selected.payload!.shopping!.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                        <span className="text-[13px] text-[#191c1e]">{item.name}</span>
                        <span className="status-pill status-neutral text-[10px]">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center min-h-80 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,87,217,0.06)' }}>
                <span className="material-symbols-outlined text-[32px] text-[#c3c6d7]">analytics</span>
              </div>
              <p className="text-[14px] font-semibold text-[#4c5e86]">Selecione um relatório</p>
              <p className="text-[12.5px] text-[#737686] mt-1">Os detalhes aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
