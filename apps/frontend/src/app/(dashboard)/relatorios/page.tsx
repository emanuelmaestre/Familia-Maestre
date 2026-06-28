'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { FileText, Download } from 'lucide-react';

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

const STATUS_COLORS_REPORT: Record<string, string> = {
  GENERATING: 'bg-yellow-100 text-yellow-700',
  READY: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const CHART_COLORS = ['#2563eb', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'];

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const financeData = selected?.payload?.finance;
  const categoryChart = financeData
    ? Object.entries(financeData.byCategory).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="app-page space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {user?.role === 'ADMIN' && (
              <div className="surface p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Relatório Personalizado</h3>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Data inicial</label>
                    <input
                      type="date"
                      value={customForm.from}
                      onChange={(e) => setCustomForm({ ...customForm, from: e.target.value })}
                      className="input-control"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Data final</label>
                    <input
                      type="date"
                      value={customForm.to}
                      onChange={(e) => setCustomForm({ ...customForm, to: e.target.value })}
                      className="input-control"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => generateCustom.mutate(customForm)}
                    disabled={!customForm.from || !customForm.to || generateCustom.isPending}
                    className="btn-primary w-full justify-center"
                  >
                    {generateCustom.isPending ? 'Gerando...' : 'Gerar Relatório'}
                  </button>
                </div>
              </div>
            )}

            <div className="surface overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="font-semibold text-gray-900">Histórico</h3>
              </div>
              {reports.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Nenhum relatório gerado</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <li
                      key={report.id}
                      onClick={() => setSelected(selected?.id === report.id ? null : report)}
                      className={`cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50 ${selected?.id === report.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900">{REPORT_TYPE_LABELS[report.type]}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{report.period}</p>
                          <p className="text-xs text-gray-400">{formatDate(report.createdAt)}</p>
                        </div>
                        <span className={`status-pill ${STATUS_COLORS_REPORT[report.status]}`}>
                          {report.status === 'GENERATING' ? 'Gerando' :
                           report.status === 'READY' ? 'Pronto' :
                           report.status === 'SENT' ? 'Enviado' : 'Falhou'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="surface p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Relatório {REPORT_TYPE_LABELS[selected.type]}
                    </h3>
                    <p className="text-sm text-gray-500">{selected.period}</p>
                  </div>
                  {selected.fileUrl && (
                    <a href={selected.fileUrl} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                      <Download className="h-4 w-4" />
                      PDF
                    </a>
                  )}
                </div>

                {financeData && (
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Receitas', value: financeData.income, color: 'text-green-600' },
                      { label: 'Despesas', value: financeData.expense, color: 'text-red-600' },
                      { label: 'Saldo', value: financeData.balance, color: financeData.balance >= 0 ? 'text-blue-600' : 'text-red-600' },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl bg-gray-50 p-3 text-center">
                        <p className={`text-xl font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                        <p className="text-xs text-gray-500">{c.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {categoryChart.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium text-gray-700">Gastos por Categoria</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={86} label={(e) => e.name}>
                          {categoryChart.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="surface-soft flex min-h-80 items-center justify-center p-12 text-gray-400">
                <div className="text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">Selecione um relatório para ver os detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
