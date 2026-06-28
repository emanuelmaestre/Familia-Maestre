import {
  findUserByPhone,
  handleOptions,
  passwordMatches,
  publicUser,
  setCors,
  signAccessToken,
  signRefreshToken,
} from '../_lib/auth-db';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Método não permitido' });
    return;
  }

  const phone = String(req.body?.phone ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!phone || password.length < 6) {
    res.status(401).json({ message: 'Credenciais inválidas' });
    return;
  }

  const user = await findUserByPhone(phone);
  if (!user || !user.isActive || !user.passwordHash) {
    res.status(401).json({ message: 'Credenciais inválidas' });
    return;
  }

  const valid = await passwordMatches(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: 'Credenciais inválidas' });
    return;
  }

  res.status(200).json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: publicUser(user),
  });
}
