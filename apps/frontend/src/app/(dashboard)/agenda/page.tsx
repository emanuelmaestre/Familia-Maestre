'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { formatDateTime, EVENT_TYPE_LABELS, STATUS_LABELS } from '@/lib/utils';
import { Plus, MapPin, Users, X, Calendar } from 'lucide-react';

interface EventAttendee {
  id: string;
  confirmed: boolean;
  user: { id: string; name: string; phone?: string; avatarUrl?: string };
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
  phone: string;
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
    <div className="app-page space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Novo Evento
        </button>
      </div>

      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Novo Evento">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-control sm:col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-control">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
          <input placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-control" />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Início *</label>
            <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="input-control" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fim</label>
            <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="input-control" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAttendee(u.id)}
                  title={`WhatsApp: ${u.phone}`}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                    form.attendeeIds.includes(u.id)
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="block">{u.name}</span>
                  <span className={`block text-[10px] ${form.attendeeIds.includes(u.id) ? 'text-blue-100' : 'text-gray-500'}`}>
                    {u.phone}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-control sm:col-span-2" />
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => createEvent.mutate(form)} disabled={!form.title || !form.startsAt || createEvent.isPending} className="btn-primary">
            {createEvent.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="surface-soft py-12 text-center text-gray-400">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm">
            <Calendar className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="interactive-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className="status-pill bg-purple-100 text-purple-700">{EVENT_TYPE_LABELS[event.type]}</span>
                    <span className={`status-pill ${STATUS_COLORS[event.status]}`}>{STATUS_LABELS[event.status]}</span>
                  </div>
                  <p className="text-sm text-gray-500">{formatDateTime(event.startsAt)}</p>
                  {event.location && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </p>
                  )}
                  {event.attendees.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {event.attendees.map((a) => (
                          <span key={a.id} className={`status-pill ${a.confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {a.user.name}{a.user.phone ? ` - ${a.user.phone}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {event.status === 'SCHEDULED' && (
                  <button type="button" onClick={() => cancelEvent.mutate(event.id)} className="flex-shrink-0 rounded-lg p-1.5 text-red-500 transition hover:bg-red-50" title="Cancelar evento">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
