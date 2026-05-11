'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Trophy, Check } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  effortScore: number;
  assignments: Array<{
    id: string;
    dueDate: string;
    user: { id: string; name: string; avatarUrl?: string };
    completion?: { status: string };
  }>;
}

interface ScoreEntry {
  userId: string;
  name: string;
  done: number;
  skipped: number;
  effort: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  OCCASIONAL: 'Eventual',
};

export default function TarefasPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'tasks' | 'mine' | 'scoreboard'>('mine');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', frequency: 'WEEKLY', effortScore: 1 });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data),
    enabled: tab === 'tasks',
  });

  const { data: myTasks = [] } = useQuery<Array<{
    id: string;
    dueDate: string;
    task: { name: string; effortScore: number };
    completion?: { status: string };
  }>>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks/my').then((r) => r.data),
    enabled: tab === 'mine',
  });

  const { data: scoreboard = [] } = useQuery<ScoreEntry[]>({
    queryKey: ['scoreboard'],
    queryFn: () => api.get('/tasks/scoreboard').then((r) => r.data),
    enabled: tab === 'scoreboard',
  });

  const createTask = useMutation({
    mutationFn: (data: typeof form) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setForm({ name: '', description: '', frequency: 'WEEKLY', effortScore: 1 });
    },
  });

  const completeTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/tasks/assignments/${id}/complete`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  return (
    <div>
      <Header title="Tarefas & Responsabilidades" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex gap-2">
            {[
              { key: 'mine', label: 'Minhas Tarefas' },
              { key: 'tasks', label: 'Todas as Tarefas' },
              { key: 'scoreboard', label: 'Placar' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  tab === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {user?.role === 'ADMIN' && tab === 'tasks' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>

        {showForm && tab === 'tasks' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Nova Tarefa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Nome *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <input
                placeholder="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Esforço (1–5): {form.effortScore}</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.effortScore}
                  onChange={(e) => setForm({ ...form, effortScore: +e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => createTask.mutate(form)}
                disabled={!form.name || createTask.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createTask.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        )}

        {tab === 'mine' && (
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma tarefa pendente. Tudo em dia!</p>
              </div>
            ) : myTasks.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{assignment.task.name}</p>
                  <p className="text-xs text-gray-500">Prazo: {formatDate(assignment.dueDate)} · Esforço: {assignment.task.effortScore}/5</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => completeTask.mutate({ id: assignment.id, status: 'DONE' })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                  >
                    <Check className="w-3 h-3" /> Concluído
                  </button>
                  <button
                    onClick={() => completeTask.mutate({ id: assignment.id, status: 'SKIPPED' })}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    Pular
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tarefa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Frequência</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Esforço</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsável atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => {
                  const latest = task.assignments[0];
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{task.name}</p>
                        {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{FREQUENCY_LABELS[task.frequency]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < task.effortScore ? 'bg-blue-500' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{latest?.user.name ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tasks.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Nenhuma tarefa cadastrada</p>}
          </div>
        )}

        {tab === 'scoreboard' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Placar do Mês
            </div>
            {scoreboard.map((entry, idx) => (
              <div key={entry.userId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                  idx === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{entry.name}</p>
                  <p className="text-xs text-gray-500">
                    {entry.done} concluída(s) · {entry.skipped} pulada(s) · {entry.effort} pts de esforço
                  </p>
                </div>
                <div className="text-2xl font-bold text-blue-600">{entry.effort}<span className="text-xs text-gray-400 ml-1">pts</span></div>
              </div>
            ))}
            {scoreboard.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Nenhum dado ainda neste mês</p>}
          </div>
        )}
      </div>
    </div>
  );
}
