import { findUserById, handleOptions, publicUser, setCors, verifyAccessToken } from '../_lib/auth-db';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Método não permitido' });
    return;
  }

  const authorization = String(req.headers.authorization ?? '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  try {
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    res.status(200).json(publicUser(user));
  } catch {
    res.status(401).json({ message: 'Não autenticado' });
  }
}
