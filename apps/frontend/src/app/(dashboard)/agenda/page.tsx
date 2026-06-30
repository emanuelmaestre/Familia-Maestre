'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ActionDrawer } from '@/components/ui/action-drawer';
import { formatDateTime, EVENT_TYPE_LABELS, STATUS_LABELS } from '@/lib/utils';

interface EventAttendee {
  id: string;
  confirmed: boolean;
  user: { id: string; name: string; phone?: string };
}

interface FamilyEvent {
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

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  MEDICAL:     { icon: 'medical_services', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  SCHOOL:      { icon: 'school',           color: '#0057D9', bg: 'rgba(0,87,217,0.1)'    },
  ROUTINE:     { icon: 'repeat',           color: '#4c5e86', bg: 'rgba(76,94,134,0.1)'   },
  APPOINTMENT: { icon: 'calendar_today',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  OTHER:       { icon: 'event',            color: '#38BDF8', bg: 'rgba(56,189,248,0.1)'  },
};

const STATUS_PILL: Record<string, string> = {
  SCHEDULED:   'status-info',
  CONFIRMED:   'status-ok',
  DONE:        'status-neutral',
  CANCELLED:   'status-alert',
  RESCHEDULED: 'status-warning',
};

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'APPOINTMENT', startsAt: '', endsAt: '', location: '', description: '', attendeeIds: [] as string[],
  });

  const { data: events = [], isLoading } = useQuery<FamilyEvent[]>({
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

  const toggleAttendee = (userId: string) =>
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(userId)
        ? f.attendeeIds.filter((id) => id !== userId)
        : [...f.attendeeIds, userId],
    }));

  return (
    <div className="app-page space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 fade-up">
        <div>
          <p className="section-badge mb-2">
            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
            Agenda Familiar
          </p>
          <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Eventos & Compromissos
          </h2>
          <p className="text-[13.5px] text-[#4c5e86] mt-1">{events.length} evento(s) registrado(s)</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px]">add</span>
          Novo Evento
        </button>
      </div>

      {/* ── Events grid ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0057D9]" />
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card py-16 text-center fade-up">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,87,217,0.08)' }}>
            <span className="material-symbols-outlined text-[32px] text-[#0057D9]">calendar_today</span>
          </div>
          <p className="text-[14px] font-semibold text-[#4c5e86]">Nenhum evento agendado</p>
          <p className="text-[12.5px] text-[#737686] mt-1">Crie o primeiro evento da família</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => {
            const meta = TYPE_META[event.type] ?? TYPE_META.OTHER;
            return (
              <div key={event.id}
                className="glass-card p-5 flex items-start gap-4 group fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Type icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.bg }}>
                  <span className="material-symbols-outlined text-[22px]" style={{ color: meta.color, fontVariationSettings: "'FILL' 1" }}>
                    {meta.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-[15px] text-[#191c1e]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                      {event.title}
                    </h3>
                    <span className="status-pill status-info text-[10px]">
                      {EVENT_TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <span className={`status-pill text-[10px] ${STATUS_PILL[event.status] ?? 'status-neutral'}`}>
                      {STATUS_LABELS[event.status] ?? event.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-[#4c5e86]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatDateTime(event.startsAt)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {event.location}
                      </span>
                    )}
                  </div>

                  {event.attendees.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="material-symbols-outlined text-[14px] text-[#737686]">group</span>
                      {event.attendees.map((a) => (
                        <span key={a.id} className={`status-pill text-[10px] ${a.confirmed ? 'status-ok' : 'status-neutral'}`}>
                          {a.user.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.description && (
                    <p className="mt-2 text-[12.5px] text-[#737686] line-clamp-2">{event.description}</p>
                  )}
                </div>

                {/* Cancel */}
                {event.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    onClick={() => cancelEvent.mutate(event.id)}
                    className="rounded-xl p-2.5 text-[#EF4444] transition hover:bg-red-50 flex-shrink-0"
                    title="Cancelar evento"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Form drawer ────────────────────────────────────────── */}
      <ActionDrawer open={showForm} onClose={() => setShowForm(false)} title="Novo Evento">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-control sm:col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-control">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
          <input placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-control" />
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#4c5e86]">Início *</label>
            <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="input-control" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-[#4c5e86]">Fim</label>
            <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="input-control" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-[11px] font-semibold text-[#4c5e86]">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAttendee(u.id)}
                  className={`rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition-all min-h-[44px] ${
                    form.attendeeIds.includes(u.id)
                      ? 'bg-[#0057D9] text-white shadow-[0_4px_14px_rgba(0,87,217,0.3)]'
                      : 'glass-card text-[#4c5e86] hover:text-[#041a3f]'
                  }`}
                >
                  <span className="block">{u.name}</span>
                  <span className={`block text-[10px] mt-0.5 ${form.attendeeIds.includes(u.id) ? 'text-blue-200' : 'text-[#737686]'}`}>
                    {u.phone}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="input-control sm:col-span-2"
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => createEvent.mutate(form)} disabled={!form.title || !form.startsAt || createEvent.isPending} className="btn-primary">
            {createEvent.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-semibold text-[#4c5e86] transition hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </ActionDrawer>
    </div>
  );
}
