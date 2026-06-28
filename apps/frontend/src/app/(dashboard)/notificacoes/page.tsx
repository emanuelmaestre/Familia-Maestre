'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Bell, Check } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificacoesPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="app-page space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="surface-soft py-12 text-center text-gray-400">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm">
            <Bell className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm">Nenhuma notificação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="interactive-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <span className={`status-pill ${notification.readAt ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                      {notification.readAt ? 'Lida' : 'Nova'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.readAt && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(notification.id)}
                    className="rounded-lg p-1.5 text-green-600 transition hover:bg-green-50"
                    title="Marcar como lida"
                  >
                    <Check className="h-4 w-4" />
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
