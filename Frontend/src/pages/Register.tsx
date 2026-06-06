import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/api';
import type { UserRole } from '../types/api';

export default function Register() {
 const navigate = useNavigate();
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [role, setRole] = useState<UserRole>('jobseeker');
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setSubmitting(true);
 setError(null);

 try {
 await register({ name, email, password, role });
 navigate('/login', {
 replace: true,
 state: {
 message: 'Registrasi berhasil, silakan login.',
 },
 });
 } catch (registerError) {
 setError(registerError instanceof Error ? registerError.message : 'Registrasi gagal. Coba lagi.');
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Create an account</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Join RemoteIn to find your next opportunity</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200/50 bg-rose-50/50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-slate-700">
              Full Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              required
              placeholder="John Doe"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

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
              minLength={6}
              placeholder="Min. 6 characters"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-bold text-slate-700">
              I want to
            </label>
            <div className="relative">
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-10 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              >
                <option value="jobseeker">Find a Job (Jobseeker)</option>
                <option value="employer">Hire Talent (Employer)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
