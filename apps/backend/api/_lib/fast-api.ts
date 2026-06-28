import { createClient } from '@supabase/supabase-js';
import { handleOptions, setCors, verifyAccessToken } from './auth-db';

export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } },
);

export async function requireUser(req: any, res: any) {
  const authorization = String(req.headers.authorization ?? '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = verifyAccessToken(token);

  const { data, error } = await supabase
    .from('users')
    .select('id,name,phone,role,avatarUrl,isActive,deletedAt')
    .eq('id', payload.sub)
    .is('deletedAt', null)
    .maybeSingle();

  if (error || !data?.isActive) {
    res.status(401).json({ message: 'Não autenticado' });
    return null;
  }

  return data;
}

export function withCors(req: any, res: any) {
  if (handleOptions(req, res)) return true;
  setCors(res);
  return false;
}

export function methodNotAllowed(res: any) {
  res.status(405).json({ message: 'Método não permitido' });
}

export function monthRange(monthValue: string | undefined, yearValue: string | undefined) {
  const today = new Date();
  const month = Number(monthValue || today.getMonth() + 1);
  const year = Number(yearValue || today.getFullYear());
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getUsersByIds(ids: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (!uniqueIds.length) return new Map<string, any>();

  const { data, error } = await supabase
    .from('users')
    .select('id,name,avatarUrl,phone,role')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map((data ?? []).map((user) => [user.id, user]));
}

export async function getCategoriesByIds(ids: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (!uniqueIds.length) return new Map<string, any>();

  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map((data ?? []).map((category) => [category.id, category]));
}
