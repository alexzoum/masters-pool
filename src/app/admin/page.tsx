'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';

interface TournamentState {
  status: string;
  picks_locked: number;
  espn_event_id: string;
  current_round: number;
}

interface User {
  id: number;
  username: string;
  is_admin: number;
  created_at: string;
  pick_count: number;
}

interface NavUser {
  username: string;
  is_admin: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);
  const [state, setState] = useState<TournamentState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [espnId, setEspnId] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadAdmin = useCallback(async () => {
    const res = await fetch('/api/admin');
    if (res.status === 403) {
      router.push('/leaderboard');
      return;
    }
    const d = await res.json();
    setState(d.state);
    setUsers(d.users || []);
    setEspnId(d.state?.espn_event_id || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        if (!d.user?.is_admin) {
          router.push('/leaderboard');
          return;
        }
        setUser(d.user);
      } else {
        router.push('/auth');
      }
    });
    loadAdmin();
  }, [loadAdmin, router]);

  async function doAction(body: Record<string, unknown>) {
    setMsg('');
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg('Error: ' + (d.error || 'Unknown'));
    } else {
      setMsg('Done!');
      loadAdmin();
    }
  }

  async function refreshScores() {
    setRefreshing(true);
    await doAction({ action: 'refresh_scores' });
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading admin…</div>
      </div>
    );
  }

  return (
    <ClientLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

        {msg && (
          <div className={`text-sm rounded-lg px-4 py-2 border ${
            msg.startsWith('Error')
              ? 'text-red-400 bg-red-900/20 border-red-800'
              : 'text-green-400 bg-green-900/20 border-green-800'
          }`}>
            {msg}
          </div>
        )}

        {/* Tournament Status */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-4">Tournament Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {(['pre', 'active', 'complete'] as const).map((s) => (
              <button
                key={s}
                onClick={() => doAction({ action: 'update_state', status: s })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                  state?.status === s
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {s === 'pre' ? 'Pre-Tournament' : s === 'active' ? 'Active (Live)' : 'Complete'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            <button
              onClick={() => doAction({ action: 'update_state', picks_locked: state?.picks_locked ? 0 : 1 })}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                state?.picks_locked
                  ? 'bg-red-800 text-white hover:bg-red-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {state?.picks_locked ? '🔒 Picks Locked — Click to Unlock' : '🔓 Picks Open — Click to Lock'}
            </button>

            <select
              value={state?.current_round ?? 0}
              onChange={(e) => doAction({ action: 'update_state', current_round: Number(e.target.value) })}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value={0}>No round yet</option>
              <option value={1}>Round 1</option>
              <option value={2}>Round 2</option>
              <option value={3}>Round 3</option>
              <option value={4}>Round 4</option>
            </select>
          </div>

          {/* ESPN Event ID */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">ESPN Event ID (for live scores)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={espnId}
                onChange={(e) => setEspnId(e.target.value)}
                placeholder="e.g. 401703503"
                className="flex-1 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              <button
                onClick={() => doAction({ action: 'update_state', espn_event_id: espnId })}
                className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => doAction({ action: 'detect_event_id' })}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Auto-detect
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {state?.espn_event_id || 'Not set'} · Status: {state?.status} · Round: {state?.current_round}
            </p>
          </div>
        </div>

        {/* Live Score Refresh */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-2">Live Scores</h2>
          <p className="text-gray-400 text-sm mb-4">
            Manually pull latest scores from ESPN. Scores auto-refresh on the leaderboard every 60 seconds during active play.
          </p>
          <button
            onClick={refreshScores}
            disabled={refreshing || !state?.espn_event_id}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium"
          >
            {refreshing ? 'Refreshing…' : 'Pull Scores from ESPN'}
          </button>
          {!state?.espn_event_id && (
            <p className="text-xs text-yellow-500 mt-2">Set ESPN Event ID above first</p>
          )}
        </div>

        {/* Reseed players */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-1">Player Field</h2>
          <p className="text-gray-400 text-sm mb-4">
            Re-seed wipes all players, picks, and scores and reloads the field from code. Only use before the tournament starts.
          </p>
          <button
            onClick={() => {
              if (confirm('This will delete all picks and scores. Are you sure?'))
                doAction({ action: 'reseed_players' });
            }}
            className="bg-red-800 hover:bg-red-700 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium"
          >
            Re-seed Player Field
          </button>
        </div>

        {/* Users */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-semibold mb-4">Users ({users.length})</h2>
          <div className="divide-y divide-gray-800">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="text-white font-medium text-sm">{u.username}</span>
                  {Boolean(u.is_admin) && (
                    <span className="ml-2 text-xs text-green-400">(admin)</span>
                  )}
                  <span className="ml-3 text-xs text-gray-500">{u.pick_count}/8 picks</span>
                  <span className="ml-3 text-xs text-gray-600">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
                {!u.is_admin && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${u.username}?`))
                        doAction({ action: 'delete_user', user_id: u.id });
                    }}
                    className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Manual Score Entry */}
        <ManualScoreEntry onAction={doAction} />
      </div>
    </ClientLayout>
  );
}

function ManualScoreEntry({ onAction }: { onAction: (body: Record<string, unknown>) => Promise<void> }) {
  const [playerId, setPlayerId] = useState('');
  const [score, setScore] = useState('');
  const [status, setStatus] = useState('active');
  const [players, setPlayers] = useState<Array<{ id: number; name: string; group_number: number }>>([]);

  useEffect(() => {
    fetch('/api/players').then(async (r) => {
      const d = await r.json();
      const all: Array<{ id: number; name: string; group_number: number }> = [];
      for (const grp of Object.values(d.groups || {})) {
        all.push(...(grp as Array<{ id: number; name: string; group_number: number }>));
      }
      setPlayers(all);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onAction({
      action: 'set_player_score',
      player_id: Number(playerId),
      total_score: score === '' ? null : Number(score),
      status,
    });
    setPlayerId('');
    setScore('');
    setStatus('active');
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-white font-semibold mb-2">Manual Score Override</h2>
      <p className="text-gray-400 text-sm mb-4">
        Use this to manually set a player&apos;s score (e.g. before ESPN data is available).
      </p>
      <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Player</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            required
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                G{p.group_number}: {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Total Score (vs par)</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="-5 or +2"
            className="w-28 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="cut">Cut</option>
            <option value="wd">Withdrawn</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium"
        >
          Set Score
        </button>
      </form>
    </div>
  );
}
