'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface AiUsage {
  totalTokens: number;
  totalCostUsd: number;
  operationsCount: number;
  normalizedProducts: number;
  processedReceipts: number;
  lastActivity?: string;
}

interface AiOperation {
  id: string;
  type: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
  metadata?: { rawName?: string; normalizedName?: string; supplierName?: string };
}

const OP_META: Record<string, { icon: string; label: string; color: string }> = {
  NORMALIZE_PRODUCT: { icon: 'auto_fix_high',  label: 'Normalização',  color: '#38BDF8' },
  PROCESS_RECEIPT:   { icon: 'receipt_long',   label: 'NF processada', color: '#0057D9' },
  EXTRACT_LIST:      { icon: 'checklist',      label: 'Lista extraída', color: '#10B981' },
  CHAT:              { icon: 'smart_toy',      label: 'Conversa IA',   color: '#F59E0B' },
};

const CAPABILITIES = [
  {
    icon: 'auto_fix_high',
    title: 'Normalização de Produtos',
    desc: 'Converte nomes técnicos de NF (ex: "HAMB BOV FRIB 36X56G") em nomes legíveis com marca, categoria e variante.',
    accent: '#38BDF8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
  },
  {
    icon: 'receipt_long',
    title: 'OCR de Notas Fiscais',
    desc: 'Extrai produtos, preços, fornecedor e data da NF a partir de fotos ou PDFs enviados pelo WhatsApp.',
    accent: '#0057D9',
    bg: 'rgba(0,87,217,0.08)',
    border: 'rgba(0,87,217,0.18)',
  },
  {
    icon: 'checklist',
    title: 'Extração de Lista',
    desc: 'Gera listas de compras estruturadas a partir de texto livre enviado pelo WhatsApp.',
    accent: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.18)',
  },
];

function formatBRL(usd: number) {
  return `R$ ${(usd * 5.7).toFixed(2)}`;
}

export default function IaCenterPage() {
  const { data: usage } = useQuery<AiUsage>({
    queryKey: ['ai-usage'],
    queryFn: () => api.get('/ai/usage').then((r) => r.data).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: operations = [] } = useQuery<AiOperation[]>({
    queryKey: ['ai-operations'],
    queryFn: () => api.get('/ai/operations?limit=20').then((r) => r.data).catch(() => []),
    staleTime: 60 * 1000,
  });

  const usageCards = [
    { label: 'Operações totais',      value: usage?.operationsCount   ?? '—', icon: 'bolt',             color: '#0057D9' },
    { label: 'Produtos normalizados', value: usage?.normalizedProducts ?? '—', icon: 'auto_fix_high',    color: '#38BDF8' },
    { label: 'NFs processadas',       value: usage?.processedReceipts  ?? '—', icon: 'receipt_long',     color: '#10B981' },
    { label: 'Custo estimado (mês)',  value: usage ? formatBRL(usage.totalCostUsd) : '—', icon: 'attach_money', color: '#F59E0B' },
  ];

  return (
    <div className="app-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fade-up">
        <p className="section-badge mb-2" style={{ borderColor: 'rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.08)', color: '#0ea5e9' }}>
          <span className="material-symbols-outlined text-[12px]">smart_toy</span>
          Inteligência Artificial
        </p>
        <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          IA Center
        </h2>
        <p className="text-[13.5px] text-[#4c5e86] mt-1">
          Visão geral das operações de IA — modelo GPT-4o via OpenAI.
        </p>
      </div>

      {/* ── Usage stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up stagger-1">
        {usageCards.map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card flex flex-col gap-3">
            <div className="p-2.5 rounded-xl self-start" style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="text-[22px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{value}</p>
              <p className="text-[11.5px] text-[#4c5e86] font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Capabilities ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 fade-up stagger-2">
          <h3 className="text-[15px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Capacidades Ativas
          </h3>
          {CAPABILITIES.map(({ icon, title, desc, accent, bg, border }) => (
            <div key={title}
              className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${accent}18` }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>
                <div>
                  <p className="text-[13.5px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{title}</p>
                  <p className="text-[12px] text-[#4c5e86] mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Model info */}
          <div
            className="ai-glow p-5 rounded-3xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[22px] text-[#38BDF8]"
                style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <p className="text-[14px] font-bold text-[#041a3f]">Modelo ativo</p>
            </div>
            <div className="space-y-2">
              {[
                { k: 'Modelo',    v: 'GPT-4o'     },
                { k: 'Provider',  v: 'OpenAI'     },
                { k: 'Tokens/op', v: '~800'       },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-[12.5px]">
                  <span className="text-[#4c5e86] font-medium">{k}</span>
                  <span className="font-bold text-[#041a3f]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Operations log ───────────────────────────────────── */}
        <div className="lg:col-span-3 fade-up stagger-3">
          <h3 className="text-[15px] font-bold text-[#041a3f] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Operações Recentes
          </h3>
          <div className="glass-card overflow-hidden">
            {operations.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-[40px] text-[#c3c6d7] block mb-3">smart_toy</span>
                <p className="text-[13px] font-medium text-[#737686]">Nenhuma operação registrada ainda</p>
                <p className="text-[12px] text-[#c3c6d7] mt-1">Importe uma NF pelo WhatsApp para começar</p>
              </div>
            ) : (
              <ul>
                {operations.map((op, i) => {
                  const meta = OP_META[op.type] ?? { icon: 'smart_toy', label: op.type, color: '#4c5e86' };
                  return (
                    <li
                      key={op.id}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-white/40 transition-colors"
                      style={{ borderBottom: i < operations.length - 1 ? '1px solid rgba(195,198,215,0.25)' : 'none' }}
                    >
                      <div className="p-2 rounded-xl flex-shrink-0 mt-0.5" style={{ background: `${meta.color}14` }}>
                        <span className="material-symbols-outlined text-[16px]" style={{ color: meta.color }}>
                          {meta.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-[#191c1e]">{meta.label}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${meta.color}14`, color: meta.color }}>
                            {op.model}
                          </span>
                        </div>
                        {op.metadata?.rawName && (
                          <p className="text-[11.5px] text-[#4c5e86] mt-0.5">
                            <span className="text-[#737686]">de</span> {op.metadata.rawName}
                            {op.metadata.normalizedName && (
                              <> <span className="text-[#737686]">→</span> <span className="font-semibold text-[#0057D9]">{op.metadata.normalizedName}</span></>
                            )}
                          </p>
                        )}
                        {op.metadata?.supplierName && (
                          <p className="text-[11.5px] text-[#4c5e86] mt-0.5">{op.metadata.supplierName}</p>
                        )}
                        <p className="text-[11px] text-[#737686] mt-1">
                          {op.inputTokens + op.outputTokens} tokens · {formatDate(op.createdAt)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#10B981] flex-shrink-0 mt-0.5">
                        ${op.costUsd.toFixed(4)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
