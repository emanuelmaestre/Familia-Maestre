'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatDateTime, EVENT_TYPE_LABELS, STATUS_LABELS } from '@/lib/utils';
import { Plus, MapPin, Users, X } from 'lucide-react';

interface EventAttendee {
  id: string;
  confirmed: boolean;
  user: { id: string; name: string; avatarUrl?: string };
}

interface Event {
  id: string;
  title: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  description?: string;
  attendees: EventAttendee[];
}

interface User {
  id: string;
  name: string;
}

const EVENT_TYPES = ['MEDICAL', 'SCHOOL', 'ROUTINE', 'APPOINTMENT', 'OTHER'];
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  DONE: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
};

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'APPOINTMENT', startsAt: '', endsAt: '', location: '', description: '', attendeeIds: [] as string[],
  });

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then((r) => r.data),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const createEvent = useMutation({
    mutationFn: (data: typeof form) => api.post('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setForm({ title: '', type: 'APPOINTMENT', startsAt: '', endsAt: '', location: '', description: '', attendeeIds: [] });
    },
  });

  const cancelEvent = useMutation({
    mutationFn: (id: string) => api.patch(`/events/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const toggleAttendee = (userId: string) => {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(userId)
        ? f.attendeeIds.filter((id) => id !== userId)
        : [...f.attendeeIds, userId],
    }));
  };

  return (
    <div>
      <Header title="Agenda" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Novo Evento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Título *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
              </select>
              <input
                placeholder="Local"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Início *</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fim</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Participantes</label>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAttendee(u.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        form.attendeeIds.includes(u.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => createEvent.mutate(form)}
                disabled={!form.title || !form.startsAt || createEvent.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createEvent.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">Nenhum evento agendado</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatDateTime(event.startsAt)}</p>
                    {event.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </p>
                    )}
                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-3 h-3 text-gray-400" />
                        <div className="flex gap-1 flex-wrap">
                          {event.attendees.map((a) => (
                            <span
                              key={a.id}
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                a.confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {a.user.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {event.status === 'SCHEDULED' && (
                    <button
                      onClick={() => cancelEvent.mutate(event.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                      title="Cancelar evento"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
