'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { formatScore } from '@/lib/scoring';

interface PlayerScore {
  player_id: number;
  name: string;
  total_score: number | null;
  status: string;
  position: string | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
  group_number?: number;
}

interface UserEntry {
  user_id: number;
  username: string;
  score: number;
  rank: number;
  tiebreaker6: number;
  picks: PlayerScore[];
  scoringScores: number[];
}

interface TournamentState {
  status: string;
  picks_locked: number;
  current_round: number;
}

interface NavUser {
  username: string;
  is_admin: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score < 0 ? 'text-red-400' : score > 0 ? 'text-blue-400' : 'text-gray-300';
  const display = score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;
  return <span className={`font-bold ${color}`}>{display}</span>;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<UserEntry[]>([]);
  const [tournState, setTournState] = useState<TournamentState | null>(null);
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const d = await res.json();
      setLeaderboard(d.leaderboard || []);
      setTournState(d.state);
      setLastUpdated(new Date().toLocaleTimeString());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
      }
    });
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Auto-refresh during active tournament
  useEffect(() => {
    if (tournState?.status !== 'active') return;
    const interval = setInterval(async () => {
      await fetch('/api/scores', { method: 'POST' });
      await loadLeaderboard();
    }, 60_000); // every 60s
    return () => clearInterval(interval);
  }, [tournState, loadLeaderboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading leaderboard…</div>
      </div>
    );
  }

  const isPre = tournState?.status === 'pre' || !tournState;

  return (
    <ClientLayout user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isPre
                ? 'Tournament starts April 9, 2026 · Make your picks before it begins!'
                : `Round ${tournState?.current_round || '?'} · Best 5 of 8 picks count`}
            </p>
            <p className="text-gray-500 text-lg font-bold mt-2 text-yellow-400">
              Make sure to Venmo @zoumzoum $20 by Friday, if not your entry will be disqualified.
            </p>
          </div>
          <div className="text-right">
            {tournState?.status === 'active' && (
              <>
                <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live
                </div>
                <div className="text-gray-500 text-xs mt-0.5">Updated {lastUpdated}</div>
              </>
            )}
            {tournState?.status === 'complete' && (
              <span className="text-yellow-400 text-sm font-medium">Final</span>
            )}
          </div>
        </div>

        {/* Pre-tournament state */}
        {isPre && (
          <div className="mb-6 bg-green-900/20 border border-green-800 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">⛳</div>
            <h2 className="text-white font-semibold text-lg mb-1">
              Masters Tournament Pool 2026
            </h2>
            <p className="text-gray-300 text-sm mb-4 max-w-md mx-auto">
              Pick 1 player from each of 8 odds-based groups. Your 5 best scores count.
              CUT players receive +8 strokes. Lowest total wins!
            </p>
            {!user ? (
              <Link
                href="/auth"
                className="inline-block bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Sign in to make your picks
              </Link>
            ) : (
              <Link
                href="/picks"
                className="inline-block bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Make your picks
              </Link>
            )}
          </div>
        )}

        {/* How to play */}
        {isPre && (
          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-400">
              <div className="flex gap-2">
                <span className="text-green-400 font-bold">1.</span>
                <span>Pick 1 player from each of 8 groups ranked by odds</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-400 font-bold">2.</span>
                <span>Your 5 best player scores are added together</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-400 font-bold">3.</span>
                <span>CUT players = +8 penalty. Lowest total wins!</span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🏌️</div>
            <p>No completed picks yet.</p>
            {user && (
              <Link href="/picks" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
                Make your picks →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-800">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-4 text-right">Picks Summary</div>
            </div>

            {leaderboard.map((entry) => {
              const isExpanded = expanded === entry.user_id;
              const isCurrentUser = user?.username === entry.username;

              return (
                <div key={entry.user_id}>
                  <div
                    className={`grid grid-cols-12 gap-2 px-4 py-3.5 border-b border-gray-800/60 cursor-pointer transition-colors
                      ${isCurrentUser ? 'bg-green-900/10' : 'hover:bg-gray-800/40'}`}
                    onClick={() => setExpanded(isExpanded ? null : entry.user_id)}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center">
                      <span className={`text-sm font-bold ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-gray-300' :
                        entry.rank === 3 ? 'text-amber-600' :
                        'text-gray-500'
                      }`}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-green-400' : 'text-white'}`}>
                        {entry.username}
                        {isCurrentUser && <span className="text-xs text-green-600 ml-1">(you)</span>}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 flex items-center justify-end">
                      {isPre ? (
                        <span className="text-gray-500 text-sm">-</span>
                      ) : (
                        <ScoreBadge score={entry.score} />
                      )}
                    </div>

                    {/* Picks mini-summary */}
                    <div className="col-span-4 flex items-center justify-end gap-1">
                      {entry.picks.length > 0 ? (
                        entry.picks.slice(0, 4).map((p) => (
                          <span
                            key={p.player_id}
                            className="text-xs text-gray-500 truncate max-w-[60px]"
                            title={p.name}
                          >
                            {p.name.split(' ').pop()}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 text-xs">No picks</span>
                      )}
                      <span className="text-gray-600 text-xs ml-1">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded picks detail */}
                  {isExpanded && (
                    <div className="bg-gray-950 border-b border-gray-800 px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {entry.picks.map((p) => {
                          const sortedPicks = [...entry.picks].sort((a, b) => {
                            const effA = (a.status === 'cut' || a.status === 'mc' || a.status === 'wd') ? 8 : (a.total_score ?? 0);
                            const effB = (b.status === 'cut' || b.status === 'mc' || b.status === 'wd') ? 8 : (b.total_score ?? 0);
                            return effA - effB;
                          });
                          const sortedIdx = sortedPicks.findIndex(s => s.player_id === p.player_id);
                          const counts = !isPre && sortedIdx < 5;

                          return (
                            <div
                              key={p.player_id}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                                counts && !isPre
                                  ? 'bg-green-900/20 border border-green-900'
                                  : 'bg-gray-900 border border-gray-800'
                              }`}
                            >
                              <div>
                                <div className={`font-medium ${counts && !isPre ? 'text-green-300' : 'text-gray-300'}`}>
                                  {p.name}
                                </div>
                                <div className="text-xs text-gray-600">Group {p.group_number}</div>
                              </div>
                              {!isPre && (
                                <div className="text-right">
                                  {p.status === 'cut' || p.status === 'mc' || p.status === 'wd' ? (
                                    <span className="text-xs font-bold text-red-400">CUT +8</span>
                                  ) : (
                                    <span className={`font-bold ${
                                      (p.total_score ?? 0) < 0 ? 'text-red-400' :
                                      (p.total_score ?? 0) > 0 ? 'text-blue-400' :
                                      'text-gray-400'
                                    }`}>
                                      {formatScore(p.total_score, p.status)}
                                    </span>
                                  )}
                                  {p.position && (
                                    <div className="text-xs text-gray-500">{p.position}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!isPre && entry.picks.length === 8 && (
                        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 flex gap-4">
                          <span>
                            <span className="text-green-400">■</span> Counting toward score (best 5)
                          </span>
                          <span>Total score: <ScoreBadge score={entry.score} /></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
