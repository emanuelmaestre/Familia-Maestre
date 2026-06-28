'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingCart, DollarSign, Calendar, BarChart3,
} from 'lucide-react';

interface SummaryData {
  income: number;
  expense: number;
  balance: number;
}

interface ShoppingItem {
  id: string;
  name: string;
  priority: string;
  requestedBy: { name: string };
}

interface Event {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  location?: string;
}

interface Report {
  id: string;
  period: string;
}

export default function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: summary } = useQuery<SummaryData>({
    queryKey: ['finance-summary', month, year],
    queryFn: () => api.get(`/finance/summary?month=${month}&year=${year}`).then((r) => r.data),
  });

  const { data: shoppingItems = [] } = useQuery<ShoppingItem[]>({
    queryKey: ['shopping-pending'],
    queryFn: () => api.get('/shopping?status=PENDING').then((r) => r.data),
  });

  const { data: upcomingEvents = [] } = useQuery<Event[]>({
    queryKey: ['events-upcoming'],
    queryFn: () =>
      api
        .get(`/events?status=SCHEDULED&from=${new Date().toISOString()}`)
        .then((r) => r.data.slice(0, 5)),
  });

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['reports-dashboard'],
    queryFn: () => api.get('/reports').then((r) => r.data),
  });

  const cards = [
    {
      title: 'Lista de Compras',
      value: `${shoppingItems.length} itens`,
      subtitle: shoppingItems.filter((i) => i.priority === 'URGENT' || i.priority === 'HIGH').length + ' urgentes',
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50',
      href: '/compras',
    },
    {
      title: 'Receitas do Mês',
      value: formatCurrency(summary?.income ?? 0),
      subtitle: 'em ' + now.toLocaleString('pt-BR', { month: 'long' }),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
      href: '/financeiro',
    },
    {
      title: 'Despesas do Mês',
      value: formatCurrency(summary?.expense ?? 0),
      subtitle: `Saldo: ${formatCurrency(summary?.balance ?? 0)}`,
      icon: DollarSign,
      color: 'text-red-600 bg-red-50',
      href: '/financeiro',
    },
    {
      title: 'Próximos Eventos',
      value: `${upcomingEvents.length} eventos`,
      subtitle: upcomingEvents[0]?.title ?? 'Nenhum agendado',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-50',
      href: '/agenda',
    },
    {
      title: 'Relatórios',
      value: `${reports.length} recentes`,
      subtitle: reports[0]?.period ?? 'Nenhum relatório',
      icon: BarChart3,
      color: 'text-orange-600 bg-orange-50',
      href: '/relatorios',
    },
  ];

  return (
    <div className="app-page space-y-6">
        <section className="surface-soft p-5 sm:p-6">
          <p className="text-sm font-medium text-blue-700">
            Visão de {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-950">Controle familiar em um só lugar</h2>
              <p className="mt-1 text-sm text-gray-600">
                Compras, finanças, eventos e notificações organizados para a rotina da família.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <Link key={card.title} href={card.href} className="interactive-card p-5">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-gray-700">{card.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{card.subtitle}</p>
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Lista de Compras</h3>
              <Link href="/compras" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Ver tudo
              </Link>
            </div>
            {shoppingItems.length === 0 ? (
              <EmptyState text="Nenhum item pendente" />
            ) : (
              <ul className="space-y-2">
                {shoppingItems.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className={`status-pill ${
                      item.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                      item.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.priority === 'URGENT' ? 'Urgente' : item.priority === 'HIGH' ? 'Alta' : 'Normal'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Próximos Eventos</h3>
              <Link href="/agenda" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Ver tudo
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <EmptyState text="Nenhum evento agendado" />
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.startsAt)}{event.location ? ` - ${event.location}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 py-8 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}
