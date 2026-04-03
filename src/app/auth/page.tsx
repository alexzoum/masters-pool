'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }

    router.push('/picks');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⛳</div>
          <h1 className="text-2xl font-bold text-white">Masters Pool 2026</h1>
          <p className="text-gray-400 text-sm mt-1">Tournament pick&apos;em competition</p>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex rounded-lg bg-gray-800 p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                placeholder="your name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                placeholder="••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-gray-500 text-xs space-y-1">
          <p>Masters Tournament: April 10–13, 2026</p>
          <p>Pick 1 player from each of 8 odds-based groups</p>
        </div>
      </div>
    </div>
  );
}
