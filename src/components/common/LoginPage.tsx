import React, { useState } from 'react';

const API_BASE = import.meta.env.DEV ? '/api' : '/grayart/api';
const TOKEN_KEY = 'grayart_bff_token';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Falha ao autenticar');
      }

      const data = await res.json() as { token: string };
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a2e] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e1e1e] rounded-2xl shadow-2xl border border-white/5 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight">
              <span className="text-white">GRAY</span>
              <span className="text-[#00C896]">ART</span>
            </h1>
            <p className="text-sm text-white/40 mt-1 font-medium tracking-wide">
              Central de Marketing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@grayart.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 outline-none transition-all focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 outline-none transition-all focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20 text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-semibold text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#00C896] text-[#0a0a0a] font-bold text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/20 font-medium tracking-wide uppercase">
              Grupo Gray 2026 — Acesso administrativo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
