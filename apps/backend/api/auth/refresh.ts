import { findUserById, handleOptions, setCors, signAccessToken, verifyRefreshToken } from '../_lib/auth-db';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Método não permitido' });
    return;
  }

  try {
    const payload = verifyRefreshToken(String(req.body?.refreshToken ?? ''));
    const user = await findUserById(payload.sub);

    if (!user || !user.isActive) {
      res.status(403).json({ message: 'Token de refresh inválido' });
      return;
    }

    res.status(200).json({ accessToken: signAccessToken(user) });
  } catch {
    res.status(403).json({ message: 'Token de refresh inválido' });
  }
}
