'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavUser {
  username: string;
  is_admin: boolean;
}

export default function NavBar({ user }: { user: NavUser | null }) {
  const router = useRouter();
  const path = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
    router.refresh();
  }

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      path === href
        ? 'bg-green-700 text-white'
        : 'text-gray-300 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 flex-shrink-0 z-50 overflow-x-auto">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="text-green-400 font-bold text-lg mr-4 flex items-center gap-2">
            <span className="text-xl">⛳</span>
            <span>Masters Pool</span>
          </Link>
          <Link href="/leaderboard" className={linkClass('/leaderboard')}>
            Leaderboard
          </Link>
          {user && (
            <Link href="/picks" className={linkClass('/picks')}>
              My Picks
            </Link>
          )}
          {user?.is_admin && (
            <Link href="/admin" className={linkClass('/admin')}>
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-400 text-sm">
                {user.username}
                {user.is_admin && (
                  <span className="ml-1 text-xs text-green-500">(admin)</span>
                )}
              </span>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="text-sm px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-sm px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-small transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
