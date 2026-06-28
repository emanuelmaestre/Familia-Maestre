'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      const status = err?.response?.status;

      if (!err?.response) {
        setError('Não foi possível conectar à API. No deploy, confira a variável NEXT_PUBLIC_API_URL na Vercel.');
      } else if (status === 401) {
        setError('Telefone ou senha inválidos.');
      } else {
        setError('Erro ao autenticar. Verifique a configuração da API.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page min-h-screen flex items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-7 sm:p-8">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-4xl shadow-inner shadow-blue-100"
            style={{ animation: 'float-home 4s ease-in-out infinite' }}
          >
            🏠
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Família Maestre</h1>
          <p className="text-gray-500 mt-1">Sistema de Administração Familiar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.trimStart())}
              required
              placeholder="Ex: 01"
              className="input-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Digite sua senha"
                className="input-control pr-12"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acesso exclusivo para membros da família
        </p>
      </div>
    </div>
  );
}
