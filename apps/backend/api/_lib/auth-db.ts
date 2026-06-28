import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } },
);

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'MEMBER';
  avatarUrl: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  passwordHash?: string;
};

export function setCors(res: any) {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://familia-maestre.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

export function handleOptions(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

export function publicUser(user: AuthUser) {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export function signAccessToken(user: Pick<AuthUser, 'id' | 'role'>) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET || 'familia-maestre-jwt-secret-super-seguro-32chars',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as StringValue },
  );
}

export function signRefreshToken(user: Pick<AuthUser, 'id' | 'role'>) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_REFRESH_SECRET || 'familia-maestre-refresh-secret-super-seguro',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as StringValue },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET || 'familia-maestre-jwt-secret-super-seguro-32chars') as {
    sub: string;
    role: string;
  };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'familia-maestre-refresh-secret-super-seguro') as {
    sub: string;
    role: string;
  };
}

export async function findUserByPhone(phone: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,phone,role,avatarUrl,isActive,deletedAt,createdAt,updatedAt,passwordHash')
    .eq('phone', phone)
    .is('deletedAt', null)
    .limit(1)
    .maybeSingle<AuthUser>();

  if (error) throw error;
  return data ?? null;
}

export async function findUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,phone,role,avatarUrl,isActive,deletedAt,createdAt,updatedAt')
    .eq('id', id)
    .is('deletedAt', null)
    .limit(1)
    .maybeSingle<AuthUser>();

  if (error) throw error;
  return data ?? null;
}

export async function passwordMatches(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
