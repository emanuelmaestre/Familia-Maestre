'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatDate, formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
    tasks?: Array<{ status: string; userId: string; user: { name: string } }>;
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

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'];

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
    <div>
      <Header title="Relatórios" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-3">
            {user?.role === 'ADMIN' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Relatório Personalizado</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Data inicial</label>
                    <input
                      type="date"
                      value={customForm.from}
                      onChange={(e) => setCustomForm({ ...customForm, from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Data final</label>
                    <input
                      type="date"
                      value={customForm.to}
                      onChange={(e) => setCustomForm({ ...customForm, to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => generateCustom.mutate(customForm)}
                    disabled={!customForm.from || !customForm.to || generateCustom.isPending}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generateCustom.isPending ? 'Gerando...' : 'Gerar Relatório'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Histórico</h3>
              </div>
              {reports.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Nenhum relatório gerado</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {reports.map((report) => (
                    <li
                      key={report.id}
                      onClick={() => setSelected(selected?.id === report.id ? null : report)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${selected?.id === report.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900">
                              {REPORT_TYPE_LABELS[report.type]}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{report.period}</p>
                          <p className="text-xs text-gray-400">{formatDate(report.createdAt)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS_REPORT[report.status]}`}>
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
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Relatório {REPORT_TYPE_LABELS[selected.type]}
                      </h3>
                      <p className="text-sm text-gray-500">{selected.period}</p>
                    </div>
                    {selected.fileUrl && (
                      <a
                        href={selected.fileUrl}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </a>
                    )}
                  </div>

                  {financeData && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Receitas', value: financeData.income, color: 'text-green-600' },
                        { label: 'Despesas', value: financeData.expense, color: 'text-red-600' },
                        { label: 'Saldo', value: financeData.balance, color: financeData.balance >= 0 ? 'text-blue-600' : 'text-red-600' },
                      ].map((c) => (
                        <div key={c.label} className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className={`text-xl font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                          <p className="text-xs text-gray-500">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {categoryChart.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Gastos por Categoria</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                            {categoryChart.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {selected.payload?.tasks && selected.payload.tasks.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3">Tarefas</h4>
                    <p className="text-sm text-gray-600">
                      {selected.payload.tasks.filter((t) => t.status === 'DONE').length} concluídas ·{' '}
                      {selected.payload.tasks.filter((t) => t.status === 'SKIPPED').length} puladas
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecione um relatório para ver os detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
