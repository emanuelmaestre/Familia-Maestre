'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingCart, Package, DollarSign, Calendar, CheckSquare, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

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

interface TaskAssignment {
  id: string;
  dueDate: string;
  task: { name: string };
  user: { name: string };
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

  const { data: myTasks = [] } = useQuery<TaskAssignment[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks/my').then((r) => r.data),
  });

  const cards = [
    {
      title: 'Lista de Compras',
      value: `${shoppingItems.length} itens`,
      subtitle: shoppingItems.filter((i) => i.priority === 'URGENT' || i.priority === 'HIGH').length + ' urgentes',
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50',
      href: '/lista',
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
      title: 'Minhas Tarefas',
      value: `${myTasks.length} pendentes`,
      subtitle: myTasks[0]?.task.name ?? 'Tudo em dia!',
      icon: CheckSquare,
      color: 'text-orange-600 bg-orange-50',
      href: '/tarefas',
    },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition group"
            >
              <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{card.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{card.subtitle}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Lista de Compras</h3>
              <Link href="/lista" className="text-blue-600 text-sm hover:underline">Ver tudo</Link>
            </div>
            {shoppingItems.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhum item pendente</p>
            ) : (
              <ul className="space-y-2">
                {shoppingItems.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Próximos Eventos</h3>
              <Link href="/agenda" className="text-blue-600 text-sm hover:underline">Ver tudo</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhum evento agendado</p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.startsAt)}{event.location ? ` — ${event.location}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
