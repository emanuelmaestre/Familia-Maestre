import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function fromNow(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-green-600 bg-green-50',
  MEDIUM: 'text-blue-600 bg-blue-50',
  HIGH: 'text-orange-600 bg-orange-50',
  URGENT: 'text-red-600 bg-red-50',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PURCHASED: 'Comprado',
  CANCELLED: 'Cancelado',
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  DONE: 'Concluído',
  SKIPPED: 'Pulado',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  MEDICAL: 'Médico',
  SCHOOL: 'Escolar',
  ROUTINE: 'Rotina',
  APPOINTMENT: 'Compromisso',
  OTHER: 'Outro',
};
