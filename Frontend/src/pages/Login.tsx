import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';

type LoginProps = {
 onLoggedIn: (token: string) => Promise<void>;
};

type LoginLocationState = {
 message?: string;
} | null;

export default function Login({ onLoggedIn }: LoginProps) {
 const navigate = useNavigate();
 const location = useLocation();
 const locationState = location.state as LoginLocationState;
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setSubmitting(true);
 setError(null);

 try {
 const token = await login({ email, password });
 await onLoggedIn(token.access_token);
 navigate('/dashboard', { replace: true });
 } catch (loginError) {
 setError(loginError instanceof Error ? loginError.message : 'Login gagal. Coba lagi.');
 } finally {
 setSubmitting(false);
 }
 };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200/60 bg-white/80 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
            R
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Sign in to your RemoteIn account</p>
        </div>

        {locationState?.message && (
          <div className="mb-6 rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-sm font-medium text-emerald-700">
            {locationState.message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200/50 bg-rose-50/50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-700">
              Email address
            </label>
            <input
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-700">
              Password
            </label>
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
